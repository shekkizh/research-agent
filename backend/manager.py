from __future__ import annotations

import asyncio
import time
import uuid
from typing import Callable, Optional, Any, List, Dict

from rich.console import Console
from openai.types.responses import ResponseContentPartDoneEvent, ResponseTextDeltaEvent

from agents import Runner, custom_span, gen_trace_id, trace, Agent, RawResponsesStreamEvent, TResponseInputItem, InputGuardrail

from backend.agents.planner_agent import planner_agent
from backend.agents.search_agent import search_agent
from backend.agents.writer_agent import writer_agent, ReportData
from backend.agents.document_agent import document_agent
from backend.agents.code_agent import code_agent
from backend.agents.reflection_agent import reflection_agent
from backend.agents.orchestrator_agent import orchestrator_agent
# Comment out the guardrails import
# from backend.agents.guardrails import query_validation_guardrail
from backend.printer import Printer

# Remove the direct import
# from api import request_clarification

class ResearchManager:
    def __init__(self, printer_callback: Optional[Callable[[str, str, bool], Any]] = None):
        self.console = Console()
        self.printer = Printer(self.console, callback=printer_callback)
        
        # Configure agent handoffs
        self._configure_agent_system()
        
        # Store the current session ID
        self.session_id = None

    def _configure_agent_system(self):
        """Configure the agent system with proper handoffs."""
        # Set up handoffs for the orchestrator agent
        orchestrator_agent.handoffs = [
            planner_agent,
            search_agent,
            writer_agent,
            document_agent,
            code_agent,
            reflection_agent
        ]
        
        # Comment out guardrail configuration
        # Set up validation guardrail for the orchestrator
        # orchestrator_agent.input_guardrails = [
        #     InputGuardrail(guardrail_function=query_validation_guardrail)
        # ]
        
        # Reset any existing guardrails
        orchestrator_agent.input_guardrails = []
        
        # Allow the writer agent to request more specific searches
        writer_agent.handoffs = [search_agent, document_agent]
        
        # Allow planner to request specific searches
        planner_agent.handoffs = [search_agent]

    async def run(self, query: str, session_id: Optional[str] = None) -> ReportData:
        self.session_id = session_id  # Store the session ID for this run
        conversation_id = gen_trace_id()
        with trace("Research trace", trace_id=conversation_id):
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
                result = Runner.run_streamed(
                    current_agent,
                    input=conversation_history,
                )
                
                # Process the streamed responses
                last_update = time.time()
                agent_response = ""
                async for event in result.stream_events():
                    if time.time() - last_update > 5:
                        self.printer.update_item("orchestration", "Processing...")
                        last_update = time.time()
                        
                    if not isinstance(event, RawResponsesStreamEvent):
                        continue
                        
                    data = event.data
                    if isinstance(data, ResponseTextDeltaEvent) and data.delta:
                        if hasattr(data.delta, 'content') and data.delta.content:
                            agent_response += data.delta.content
                            self.printer.update_item(
                                "stream_progress",
                                f"Agent working... (latest: {data.delta.content[:20]}...)",
                                hide_checkmark=True,
                            )
                    elif isinstance(data, ResponseContentPartDoneEvent):
                        self.printer.update_item(
                            "current_agent",
                            f"Currently using: {result.current_agent.name}",
                            is_done=True,
                            hide_checkmark=True,
                        )
                
                # Check if the agent is asking for clarification
                if self._is_asking_clarification(agent_response) and result.current_agent.name != "ReflectionAgent":
                    # Display the agent's request
                    self.printer.update_item(
                        "clarification",
                        f"Agent is asking for clarification: {agent_response}",
                        is_done=True,
                        hide_checkmark=True,
                    )
                    
                    # Get user input via WebSocket if session_id is available, otherwise fallback to console
                    if self.session_id:
                        # Import here to avoid circular imports
                        from api import request_clarification
                        user_input = await request_clarification(self.session_id, agent_response)
                    else:
                        user_input = input("\nPlease provide clarification: ")
                    
                    self.printer.update_item(
                        "user_response",
                        f"User provided clarification: {user_input}",
                        is_done=True,
                        hide_checkmark=True,
                    )
                    
                    # Add to conversation history
                    conversation_history.append({"role": "assistant", "content": agent_response})
                    conversation_history.append({"role": "user", "content": user_input})
                    
                    # Continue with the same agent
                    current_agent = result.current_agent
                else:
                    # Check if we've completed the task or need to continue with handoff
                    if hasattr(result.final_output, 'markdown_report'):
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
                            "handoff",
                            f"Handing off from {current_agent.name} to {result.current_agent.name}",
                            is_done=True,
                        )
                        current_agent = result.current_agent
                        
                        # Add the response to conversation history
                        conversation_history.append({"role": "assistant", "content": agent_response})
                    else:
                        # We need to synthesize a report from results
                        self.printer.update_item("synthesizing", "Synthesizing final report...")
                        
                        # Add the final response to conversation history
                        conversation_history.append({"role": "assistant", "content": agent_response})
                        
                        synthesize_result = await Runner.run(
                            writer_agent,
                            f"Original query: {query}\nResearch results: {str(result.final_output)}",
                        )
                        report = synthesize_result.final_output_as(ReportData)
                        self.printer.mark_item_done("synthesizing")
            
            # Mark orchestration as complete
            self.printer.mark_item_done("orchestration")

            # Print the final report summary
            final_report = f"Report summary\n\n{report.short_summary}"
            self.printer.update_item("final_report", final_report, is_done=True)
            
            # Add follow-up questions as separate items
            for i, question in enumerate(report.follow_up_questions):
                self.printer.update_item(
                    f"follow_up_{i+1}",
                    f"Follow-up question: {question}",
                    is_done=True,
                    hide_checkmark=True,
                )

            self.printer.end()

        print("\n\n=====REPORT=====\n\n")
        print(f"Report: {report.markdown_report}")
        print("\n\n=====FOLLOW UP QUESTIONS=====\n\n")
        follow_up_questions = "\n".join(report.follow_up_questions)
        print(f"Follow up questions: {follow_up_questions}")
        
        # Run a reflection agent to learn from this session
        self._reflect_on_session(query, report, conversation_history)
        
        return report
    
    def _is_asking_clarification(self, response: str) -> bool:
        """Detect if the agent is asking for clarification from the user."""
        # Simple heuristic based on the presence of question marks and clarification keywords
        clarification_indicators = [
            "?",
            "could you clarify",
            "can you explain",
            "please provide more information",
            "need more details",
            "can you specify",
            "could you elaborate",
            "need clarification"
        ]
        
        lower_response = response.lower()
        # Check if the response contains any clarification indicators
        return any(indicator in lower_response for indicator in clarification_indicators)
        
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
                
                self.printer.update_item(
                    "reflection_result",
                    "Reflection complete - User preferences and recommendations updated",
                    is_done=True,
                )
                
                # In a real implementation, we would store these results in a database
                self.printer.mark_item_done("reflection")
            except Exception as e:
                self.printer.update_item(
                    "reflection",
                    f"Reflection failed: {str(e)}",
                    is_done=True,
                )
