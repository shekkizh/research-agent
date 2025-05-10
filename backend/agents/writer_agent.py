# Agent used to synthesize a final report from the individual summaries.
from pydantic import BaseModel

from agents import Agent

PROMPT = (
    "You are a senior researcher tasked with writing a cohesive report for a research query. "
    "You will be provided with the original query, and research findings from various sources.\n"
    "Generate the report and return that as your final output.\n"
    "The final output should be in markdown format, and it should be detailed and comprehensive. "
    "Include proper citations and references to sources where appropriate.\n\n"
    "If the research findings are incomplete or you need additional information to create a comprehensive report, "
    "don't hesitate to ask clarifying questions. For example, you might ask for more specific data on a particular aspect, "
    "or request additional research on a subtopic that seems underrepresented in the findings."
)


class ReportData(BaseModel):
    short_summary: str
    """A short 2-3 sentence summary of the findings."""

    report: str
    """The final report"""



writer_agent = Agent(
    name="WriterAgent",
    handoff_description="Specialist agent for synthesizing research findings into cohesive reports",
    instructions=PROMPT,
    model="gpt-4.1",
    output_type=ReportData,
)
