from pydantic import BaseModel
from agents import Agent, WebSearchTool
from agents.model_settings import ModelSettings

class SearchResult(BaseModel):
    summary: str
    """A concise summary of the search results."""
    
    sources: list[str]
    """A list of sources found during the search."""
    
    key_findings: list[str]
    """Key findings from the search results."""

INSTRUCTIONS = (
    "You are a research assistant. Given a search term, you search the web for that term and "
    "produce a concise summary of the results. The summary must be thorough yet concise. "
    "Capture the main points and key findings from reliable sources. This will be consumed "
    "by someone synthesizing a report, so it's vital you capture the essence while citing your sources.\n\n"
    "If the search query is too vague or ambiguous, ask clarifying questions before conducting the search. "
    "This will ensure you're searching for the most relevant information. Be specific in your questions "
    "to get the most helpful responses."
)

search_agent = Agent(
    name="SearchAgent",
    handoff_description="Specialist agent for searching the web and summarizing information",
    model="gpt-4.1-mini",
    instructions=INSTRUCTIONS,
    tools=[WebSearchTool()],
    model_settings=ModelSettings(tool_choice="required"),
    output_type=SearchResult,
)
