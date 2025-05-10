from __future__ import annotations

import time
import os
import json
from datetime import datetime
from typing import Callable, Optional, Any, List, Dict

from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from openai.types.responses import ResponseContentPartDoneEvent, ResponseTextDeltaEvent

from agents import Runner, custom_span, gen_trace_id, trace, RawResponsesStreamEvent, TResponseInputItem

from backend.agents.planner_agent import planner_agent
from backend.agents.search_agent import search_agent
from backend.agents.writer_agent import writer_agent, ReportData
from backend.agents.document_agent import document_agent
from backend.agents.code_agent import code_agent
from backend.agents.reflection_agent import reflection_agent, ReflectionSummary
from backend.agents.orchestrator_agent import orchestrator_agent
from backend.agents.base_agent import BaseAgentResponse, ClarificationRequest
from backend.printer import Printer

class ResearchManager:
    def __init__(self, printer_callback: Optional[Callable[[str, str, bool], Any]] = None):
        self.console = Console(record=True)  # Enable recording by default
        self.printer = Printer(self.console, callback=printer_callback)
        
        # Configure agent handoffs
        self._configure_agent_system()
        
        # Store the current session ID
        self.session_id = None
        # Store timestamp for the session
        self.timestamp = None

    def _configure_agent_system(self):
        """Configure the agent system with proper handoffs."""
        # Set up handoffs for the orchestrator agent
        orchestrator_agent.handoffs = [
            planner_agent,
            search_agent,
            writer_agent,
            document_agent,
            code_agent
        ]
        
        # we need orchestrator to handoff to all agents and each of the sub-agents should coordinate via orchestrator (handoff back to orchestrator)
        # this way we can track the conversation history and the flow of the research
        planner_agent.handoffs = [orchestrator_agent]
        search_agent.handoffs = [orchestrator_agent]
        writer_agent.handoffs = [orchestrator_agent]
        document_agent.handoffs = [orchestrator_agent]
        code_agent.handoffs = [orchestrator_agent]

    async def run(self, query: str, session_id: Optional[str] = None) -> ReportData:
        self.session_id = session_id  # Store the session ID for this run
        conversation_id = gen_trace_id()
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Reset the console recording
        self.console.record = True
        
        with trace(f"Research {session_id}", trace_id=conversation_id):
            self.printer.update_item(
                "trace_id",
                f"View trace: https://platform.openai.com/traces/trace?trace_id={conversation_id}",
                is_done=True,
                hide_checkmark=True,
            )

            self.printer.update_item(
                "starting",
                "Starting research...",
                is_done=True,
                hide_checkmark=True,
            )
            
            # Start with the orchestrator, which will delegate to appropriate agents
            self.printer.update_item("orchestration", "Analyzing query and delegating to specialized agents...")
            inputs: List[TResponseInputItem] = [{"content": f"Research query: {query}", "role": "user"}]
            
            # Track the conversation for interactive clarifications
            conversation_history = inputs.copy()
            current_agent = orchestrator_agent
            
            # Continue the conversation until we get a final report
            report = None
            while report is None:
                # Stream the agent process
                result = await Runner.run(
                    current_agent,
                    input=conversation_history,
                )
                
                
                # Log full agent response to console for debugging
                self.console.print(f"\n[dim blue]===== {current_agent.name} RESPONSE =====\n{result}\n==================================[/dim blue]")
                
                # Check if the agent is asking for clarification
                if hasattr(result.final_output, 'clarification_request') and hasattr(result.final_output.clarification_request, 'questions'):
                    try:
                        agent_response = result.final_output_as(BaseAgentResponse)
                        questions = agent_response.clarification_request.questions
                        context = agent_response.clarification_request.context
                        
                        if questions:
                            # Format the questions and context for UI display
                            formatted_parts = []
                            if context:
                                formatted_parts.append(f"Context: {context}")
 
                            formatted_parts.append("Questions:")
                            for i, question in enumerate(questions, 1):
                                formatted_parts.append(f"{i}. {question}")
                            
                            formatted_question = "\n".join(formatted_parts)
                    except Exception as e:
                        self.console.log(f"Error parsing agent response: {e}")
                        formatted_question = str(agent_response) # fallback to string representation of agent response
                    
                    # Get user input via WebSocket if session_id is available, otherwise fallback to console
                    if self.session_id:
                        # Import here to avoid circular imports
                        from api import request_clarification
                        user_input = await request_clarification(self.session_id, formatted_question)
                    else:
                        user_input = input("\nProvide clarification: ")
                    
                    self.printer.update_item(
                        "user_response",
                        f"User provided clarification: {user_input}",
                        is_done=True,
                        hide_checkmark=True,
                    )
                    
                    # Add to conversation history
                    conversation_history.append({"role": "assistant", "content": agent_response})
                    conversation_history.append({"role": "user", "content": user_input})

                else:
                    # Check if we've completed the task or need to continue with handoff
                    if hasattr(result.final_output, 'report'):
                        # If the output is already a report
                        report = result.final_output_as(ReportData)
                        self.printer.update_item(
                            "report_generated",
                            "Report has been generated",
                            is_done=True,
                        )
                    elif result.current_agent != current_agent:
                        # If we have a handoff, update the current agent
                        self.printer.update_item(
                            "clarification_requested",
                            f"Clarification requested from {result.current_agent.name}",
                            is_done=True,
                        )
                        current_agent = result.current_agent
                    else:
                        self.printer.update_item(
                            "agent processing",
                            f"Agent {result.current_agent.name} is still processing...",
                            is_done=True,
                        )

                    # Add the response to conversation history
                    conversation_history.append({"role": "assistant", "content": result.final_output})
            
            # Mark orchestration as complete
            self.printer.mark_item_done("orchestration")

            # Print the final report summary
            summary = f"Report summary\n\n{report.short_summary}"
            self.printer.update_item("final_report", summary, is_done=True)

            # Run a reflection agent to learn from this session
            # await self._reflect_on_session(query, report, conversation_history)

            self.printer.end()

        # Print report and follow-up questions to the console
        self.console.print("\n\n")
        self.console.print(Panel("[bold blue]=====REPORT=====", expand=False))
        self.console.print(Markdown(report.report))
        
        # Save console recording to HTML (now this happens after reflection)
        self._save_session_to_html(query)
        
        return report
    
    def _save_session_to_html(self, query: str):
        """Save the current console recording to an HTML file."""
        os.makedirs("output_logs", exist_ok=True)
        html_filename = f"output_logs/research_session_{self.timestamp}.html"
        
        # Create an HTML file with the recorded content
        with open(html_filename, "w", encoding="utf-8") as html_file:
            html_content = self.console.export_html(
                theme="default",
                clear=False,
                code_format=True,
                inline_styles=True
            )
            # Add some basic styling and title based on the query
            styled_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Research: {query[:50]}...</title>
    <style>
        body {{ font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #333; }}
        .timestamp {{ color: #666; font-size: 0.9em; margin-bottom: 20px; }}
        .console-output {{ background-color: #f5f5f5; border-radius: 5px; padding: 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Research Session: {query}</h1>
        <div class="timestamp">Timestamp: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>
        <div class="console-output">
            {html_content}
        </div>
    </div>
</body>
</html>"""
            html_file.write(styled_html)
            
        self.console.print(f"[green]Session log saved to: [bold]{html_filename}[/bold][/green]")
        
    async def _reflect_on_session(self, query: str, report: ReportData, conversation_history: List[TResponseInputItem]):
        """Run a reflection on the research session to improve future interactions."""
        with custom_span("Session reflection"):
            # This would normally use stored history, but we'll use the current session for simplicity
            self.printer.update_item("reflection", "Reflecting on research session...")
            
            try:
                # Convert conversation history to a string for the reflection agent
                conversation_str = "\n".join([
                    f"{item['role'].upper()}: {item['content']}" 
                    for item in conversation_history
                ])
                
                result = await Runner.run(
                    reflection_agent,
                    f"Original query: {query}\nReport summary: {report.short_summary}\nFollow-up questions: {report.follow_up_questions}\nConversation history: {conversation_str}",
                )
                # Log the reflection results for future reference
                reflection_summary = result.final_output_as(ReflectionSummary)
                
                # Print the reflection data to the main console using Rich formatting
                self.printer.update_item("reflection", "Reflecting on research session...")
                self.printer.update_item("reflection_result", "Reflection complete - Will be included in session log", is_done=True)
                self.console.print(Panel("[bold blue]=====REFLECTION=====", expand=False))
                self.console.print(f"[bold blue]=== REFLECTION LOG: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===[/bold blue]")
                self.console.print(f"[bold]Original Query:[/bold] {query}")
                self.console.print("\n[bold yellow]User Preferences:[/bold yellow]")
                self.console.print("[yellow]" + "-" * 40 + "[/yellow]")
                
                # Add each user preference with rich formatting
                for pref in reflection_summary.user_preferences:
                    self.console.print(f"[cyan]Topic:[/cyan] {pref.topic}")
                    self.console.print(f"[cyan]Interest Level:[/cyan] {pref.interest_level}")
                    self.console.print(f"[cyan]Relevance:[/cyan] {pref.relevance}")
                    self.console.print("[yellow]" + "-" * 40 + "[/yellow]")
                
                # Add research style and recommendations with rich formatting
                self.console.print(f"\n[bold green]Research Style:[/bold green]")
                self.console.print(reflection_summary.research_style)
                
                self.console.print("\n[bold magenta]Recommendations:[/bold magenta]")
                for i, rec in enumerate(reflection_summary.recommendations, 1):
                    self.console.print(f"[magenta]{i}.[/magenta] {rec}")
                
                # Also save a standalone text version of the reflection
                os.makedirs("output_logs", exist_ok=True)
                text_filename = f"output_logs/reflection_{self.timestamp}.txt"
                with open(text_filename, "w") as f:
                    f.write(f"=== REFLECTION LOG: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ===\n")
                    f.write(f"Original Query: {query}\n\n")
                    f.write("User Preferences:\n")
                    f.write("-" * 40 + "\n")
                    
                    for pref in reflection_summary.user_preferences:
                        f.write(f"Topic: {pref.topic}\n")
                        f.write(f"Interest Level: {pref.interest_level}\n")
                        f.write(f"Relevance: {pref.relevance}\n")
                        f.write("-" * 40 + "\n")
                    
                    f.write(f"\nResearch Style:\n{reflection_summary.research_style}\n\n")
                    f.write("Recommendations:\n")
                    for i, rec in enumerate(reflection_summary.recommendations, 1):
                        f.write(f"{i}. {rec}\n")
                
                # Print completion message to console
                self.printer.update_item(
                    "reflection_result",
                    "Reflection complete - Will be included in session log",
                    is_done=True,
                    hide_checkmark=True,
                )
                
                # In a real implementation, we would store these results in a database
                self.printer.mark_item_done("reflection")
            except Exception as e:
                self.printer.update_item(
                    "reflection",
                    f"Reflection failed: {str(e)}",
                    is_done=True,
                )
