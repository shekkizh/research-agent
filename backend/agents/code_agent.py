from pydantic import BaseModel
from agents import Agent, WebSearchTool
from agents.model_settings import ModelSettings

class CodeSnippet(BaseModel):
    language: str
    """The programming language of the code."""
    
    code: str
    """The actual code snippet."""
    
    explanation: str
    """A clear explanation of what the code does."""
    
    source: str
    """Where the code was found, including URL if applicable."""

class CodeSearchResult(BaseModel):
    snippets: list[CodeSnippet]
    """A list of code snippets that address the query."""
    
    summary: str
    """A summary of the findings related to the code search."""
    
    best_practices: list[str]
    """Best practices related to the code topic."""

code_agent = Agent(
    name="CodeAgent",
    handoff_description="Specialist agent for finding and analyzing code snippets",
    instructions="""You are a code search specialist. When asked about code or programming topics, you will:
    1. Search for relevant code examples and explanations
    2. Provide clear, working code snippets
    3. Explain how the code works
    4. Include best practices and common pitfalls
    
    If the coding request is ambiguous or lacks technical specificity, ask clarifying questions.
    For instance, you might need to know the programming language, framework version, specific use case,
    or performance requirements before providing optimal code examples.
    
    Focus on providing practical, working examples that directly address the user's needs.
    Always cite your sources when providing code samples.
    """,
    model="gpt-4.1",
    tools=[WebSearchTool()],
    model_settings=ModelSettings(tool_choice="auto"),
    output_type=CodeSearchResult,
) 