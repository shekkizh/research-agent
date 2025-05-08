from __future__ import annotations

import asyncio
import time
from typing import Callable, Optional, Any

from rich.console import Console

from agents import Runner, custom_span, gen_trace_id, trace

from backend.agents.planner_agent import WebSearchItem, WebSearchPlan, planner_agent
from backend.agents.search_agent import search_agent
from backend.agents.writer_agent import ReportData, writer_agent
from backend.printer import Printer


class ResearchManager:
    def __init__(self, printer_callback: Optional[Callable[[str, str, bool], Any]] = None):
        self.console = Console()
        self.printer = Printer(self.console, callback=printer_callback)

    async def run(self, query: str) -> ReportData:
        trace_id = gen_trace_id()
        with trace("Research trace", trace_id=trace_id):
            self.printer.update_item(
                "trace_id",
                f"View trace: https://platform.openai.com/traces/trace?trace_id={trace_id}",
                is_done=True,
                hide_checkmark=True,
            )

            self.printer.update_item(
                "starting",
                "Starting research...",
                is_done=True,
                hide_checkmark=True,
            )
            search_plan = await self._plan_searches(query)
            search_results = await self._perform_searches(search_plan)
            report = await self._write_report(query, search_results)

            final_report = f"Report summary\n\n{report.short_summary}"
            self.printer.update_item("final_report", final_report, is_done=True)

            self.printer.end()

        print("\n\n=====REPORT=====\n\n")
        print(f"Report: {report.markdown_report}")
        print("\n\n=====FOLLOW UP QUESTIONS=====\n\n")
        follow_up_questions = "\n".join(report.follow_up_questions)
        print(f"Follow up questions: {follow_up_questions}")
        
        return report

    async def _plan_searches(self, query: str) -> WebSearchPlan:
        self.printer.update_item("planning", "Planning searches...")
        result = await Runner.run(
            planner_agent,
            f"Query: {query}",
        )
        search_count = len(result.final_output.searches)
        self.printer.update_item(
            "planning",
            f"Will perform {search_count} searches",
            is_done=True,
        )
        
        # Add details about each planned search
        for i, search_item in enumerate(result.final_output.searches):
            self.printer.update_item(
                f"search_plan_{i+1}",
                f"Search {i+1}: {search_item.query} - {search_item.reason}",
                is_done=True,
                hide_checkmark=True,
            )
            
        return result.final_output_as(WebSearchPlan)

    async def _perform_searches(self, search_plan: WebSearchPlan) -> list[str]:
        with custom_span("Search the web"):
            self.printer.update_item("searching", "Searching...")
            num_completed = 0
            tasks = [asyncio.create_task(self._search(item, idx)) for idx, item in enumerate(search_plan.searches)]
            results = []
            for task in asyncio.as_completed(tasks):
                result, idx = await task
                if result is not None:
                    results.append(result)
                    self.printer.update_item(
                        f"search_result_{idx+1}",
                        f"Got results for: {search_plan.searches[idx].query}",
                        is_done=True,
                    )
                num_completed += 1
                self.printer.update_item(
                    "searching", f"Searching... {num_completed}/{len(tasks)} completed"
                )
            self.printer.mark_item_done("searching")
            return results

    async def _search(self, item: WebSearchItem, idx: int) -> tuple[str | None, int]:
        search_id = f"search_{idx+1}"
        self.printer.update_item(
            search_id, 
            f"Searching: {item.query}",
        )
        
        input = f"Search term: {item.query}\nReason for searching: {item.reason}"
        try:
            result = await Runner.run(
                search_agent,
                input,
            )
            self.printer.update_item(
                search_id,
                f"Completed search: {item.query}",
                is_done=True,
            )
            return str(result.final_output), idx
        except Exception as e:
            self.printer.update_item(
                search_id,
                f"Search failed: {item.query} - {str(e)}",
                is_done=True,
            )
            return None, idx

    async def _write_report(self, query: str, search_results: list[str]) -> ReportData:
        self.printer.update_item("writing", "Thinking about report...")
        input = f"Original query: {query}\nSummarized search results: {search_results}"
        result = Runner.run_streamed(
            writer_agent,
            input,
        )
        update_messages = [
            "Thinking about report...",
            "Planning report structure...",
            "Writing outline...",
            "Creating sections...",
            "Cleaning up formatting...",
            "Finalizing report...",
            "Finishing report...",
        ]

        last_update = time.time()
        next_message = 0
        async for chunk in result.stream_events():
            if time.time() - last_update > 5 and next_message < len(update_messages):
                self.printer.update_item("writing", update_messages[next_message])
                next_message += 1
                last_update = time.time()
                
            # If we have a chunk with new content, update the UI
            if hasattr(chunk, 'delta') and chunk.delta and hasattr(chunk.delta, 'content') and chunk.delta.content:
                self.printer.update_item(
                    "writing_progress",
                    f"Writing in progress... ({len(chunk.delta.content)} new chars)",
                    hide_checkmark=True,
                )

        self.printer.mark_item_done("writing")
        
        # Add follow-up questions as separate items
        report_data = result.final_output_as(ReportData)
        for i, question in enumerate(report_data.follow_up_questions):
            self.printer.update_item(
                f"follow_up_{i+1}",
                f"Follow-up question: {question}",
                is_done=True,
                hide_checkmark=True,
            )
            
        return report_data
