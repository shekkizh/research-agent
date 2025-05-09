from pydantic import BaseModel
from agents import Agent, GuardrailFunctionOutput, Runner

class QueryValidation(BaseModel):
    is_valid: bool
    """Whether the query is valid and can be processed."""
    
    reason: str
    """Reasoning about the validity of the query."""
    
    suggested_reformulation: str
    """If the query is invalid, a suggestion for how to reformulate it."""

validation_agent = Agent(
    name="ValidationAgent",
    instructions="""You are a query validation specialist. Your job is to check if a research query is:
    1. Clear and specific enough to be researched
    2. Not harmful, illegal, or unethical in nature
    3. Within the scope of what a research assistant can reasonably answer
    
    If the query is valid, indicate so with a brief reason.
    If the query is invalid, explain why and suggest a reformulation.
    """,
    model="gpt-4.1-mini",
    output_type=QueryValidation,
)

async def query_validation_guardrail(ctx, agent, input_data):
    """Validates that the user query is appropriate and can be processed."""
    result = await Runner.run(validation_agent, input_data, context=ctx.context)
    final_output = result.final_output_as(QueryValidation)
    
    return GuardrailFunctionOutput(
        output_info=final_output,
        tripwire_triggered=not final_output.is_valid,
        rejection_message=f"Query validation failed: {final_output.reason}\n\nSuggested reformulation: {final_output.suggested_reformulation}" if not final_output.is_valid else None,
    ) 