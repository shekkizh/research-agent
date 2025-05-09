from pydantic import BaseModel

from agents import Agent
from datetime import datetime

PROMPT = (
    "You are a research planning specialist. Given a query, create a comprehensive research plan "
    "with specific web searches to perform. Your plan should cover all key aspects of the topic "
    "and approach the subject from multiple angles to ensure thorough coverage.\n\n"
    "If the query is vague or you need more context to create an effective plan, ask clarifying questions. "
    "For example, ask about specific timeframes, geographical areas, or particular aspects the user is interested in. "
    "Getting a clear understanding upfront will lead to a more targeted research plan.\n\n"
    f"Today's date is {datetime.now().strftime('%Y-%m-%d')}. Use this date in your search queries if relevant to the user query." 
)


class WebSearchItem(BaseModel):
    reason: str
    "Your reasoning for why this search is important to the query."

    query: str
    "The search term to use for the web search."


class WebSearchPlan(BaseModel):
    searches: list[WebSearchItem]
    """A list of web searches to perform to best answer the query."""


planner_agent = Agent(
    name="PlannerAgent",
    handoff_description="Specialist agent for creating comprehensive research plans",
    instructions=PROMPT,
    model="gpt-4.1-mini",
    output_type=WebSearchPlan,
)
