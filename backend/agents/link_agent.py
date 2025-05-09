from pydantic import BaseModel
from agents import Agent

class LinkAnalysis(BaseModel):
    url: str
    """The URL of the link."""
    
    domain: str
    """The domain of the link."""
    
    category: str
    """Category of the content (academic, news, blog, reference, etc.)."""
    
    relevance: float
    """A score from 0 to 1 indicating relevance to the research query."""
    
    credibility: float
    """A score from 0 to 1 indicating the credibility of the source."""

class LinkTrackingResult(BaseModel):
    analyzed_links: list[LinkAnalysis]
    """Analysis of the tracked links."""
    
    source_preferences: list[str]
    """Observed preferences for source types based on click patterns."""
    
    recommendations: list[str]
    """Recommendations for similar high-quality sources."""

link_agent = Agent(
    name="LinkAgent",
    handoff_description="Specialist agent for analyzing and tracking clicked links",
    instructions="""You are a link tracking specialist. When a user interacts with links during research, you will:
    1. Analyze the domain and source type of each link
    2. Assess the relevance to the current research topic
    3. Evaluate the credibility of the source
    4. Identify patterns in the user's source preferences
    5. Recommend similar high-quality sources
    
    Be objective in your analysis and focus on helping the user find trustworthy information.
    """,
    model="gpt-4o",
    output_type=LinkTrackingResult,
) 