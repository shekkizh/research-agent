from agents import Agent

from pydantic import BaseModel
from typing import List, Optional

class ClarificationRequest(BaseModel):
    """A request for clarification from the user before proceeding."""
    questions: List[str]
    """The questions to ask the user."""
    
    context: str
    """Context explaining why clarification is needed."""


class AgentResponse(BaseModel):
    """Agent response with support for clarification."""
    clarification_request: Optional[ClarificationRequest] = None
    """Optional clarification request if the agent needs more information."""

# Define the orchestrator agent that will delegate to specialized agents
orchestrator_agent = Agent(
    name="OrchestratorAgent",
    instructions="""You are a research assistant orchestrator. Your job is to:
    1. Analyze the user's research query. Clarify any ambiguities in the query.
    2. Determine which specialized agent would be best suited to handle the query
    3. Hand off to the appropriate agent
    4. Receive information back from agents, including after they receive clarification
    5. Repeat the process until you have enough information to write the report using writer agent

    A typical flow would involve planning the research, document processing if provided a document, searching (multiple times if needed) the web to find additional information, gathering code if user requests it, and then writing the report.
    
    You should consider:
    - If the query requires document processing, hand off to the document agent
    - If the query requires web searching, hand off to the search agent
    - If the query is about summarizing research findings, hand off to the writer agent
    - If the query is specifically about code, hand off to the code agent
    
    Always be concise and efficient in your delegation.
    """,
    model="gpt-4.1",
    handoff_description="Orchestration agent that coordinate the work of the other agents, triages inputs, and passes/answers clarifying questions appropriately.",
    output_type=AgentResponse,
) 