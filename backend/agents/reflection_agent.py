from pydantic import BaseModel
from agents import Agent

class UserPreference(BaseModel):
    topic: str
    """The topic or area of interest."""
    
    interest_level: float
    """A score from 0 to 1 indicating the level of interest in this topic."""
    
    relevance: str
    """Brief explanation of why this topic is relevant to the user."""

class ReflectionSummary(BaseModel):
    user_preferences: list[UserPreference]
    """Inferred user preferences based on interactions."""
    
    research_style: str
    """A description of the user's research style and approach."""
    
    recommendations: list[str]
    """Recommendations for future research based on observed patterns."""

reflection_agent = Agent(
    name="ReflectionAgent",
    handoff_description="Agent for analyzing user interactions and drawing insights",
    instructions="""You are a self-reflection specialist focused on understanding user research patterns.
    After a research session, you will:
    1. Analyze the user's interactions and queries
    2. Identify patterns in their research interests and behavior
    3. Infer their preferences and research style
    4. Make recommendations for future research directions
    
    Focus on being insightful but not presumptuous. Base your analysis solely on observed behavior.
    """,
    model="gpt-4.1",
    output_type=ReflectionSummary,
) 