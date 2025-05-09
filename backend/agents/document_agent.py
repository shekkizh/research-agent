from pydantic import BaseModel
from agents import Agent

class DocumentSummary(BaseModel):
    title: str
    """The title or main heading of the document."""
    
    summary: str
    """A comprehensive summary of the document's content."""
    
    key_points: list[str]
    """A list of the most important points from the document."""
    
    relevance_score: float
    """A score from 0 to 1 indicating how relevant the document is to the original query."""

document_agent = Agent(
    name="DocumentAgent",
    handoff_description="Specialist agent for processing and summarizing documents",
    instructions="""You are a document processing specialist. Given a document or text, you will:
    1. Carefully read and analyze the content
    2. Extract the main points and key information
    3. Provide a comprehensive summary
    4. Evaluate the document's relevance to the original research query
    
    If the document is unclear or you need additional context to properly analyze it, ask clarifying questions.
    You might need to know more about the research context, the specific aspects of interest, or the user's
    level of familiarity with the subject matter.
    
    Be thorough but concise in your summaries, focusing on extracting the most valuable information.
    """,
    model="gpt-4.1-mini",
    output_type=DocumentSummary,
) 