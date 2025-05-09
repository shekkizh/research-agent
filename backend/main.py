import asyncio
import os
import json
from manager import ResearchManager


async def main() -> None:
    # Ensure OpenAI API key is set
    if not os.environ.get("OPENAI_API_KEY"):
        print("Please set the OPENAI_API_KEY environment variable.")
        print("Example: export OPENAI_API_KEY=sk-...")
        return

    print("🔍 Personal Research Agent 🔍")
    print("----------------------------")
    print("This system uses multiple specialized agents to help with your research.")
    print("Agents include: PlannerAgent, SearchAgent, WriterAgent, DocumentAgent, CodeAgent, and more.")
    print("All agents work together through an orchestrator to provide comprehensive research.")
    print("\n")
    
    query = input("What would you like to research? ")
    manager = ResearchManager()
    report = await manager.run(query)

    os.makedirs("output_reports", exist_ok=True)
    report_path = os.path.join("output_reports", f"{query}.md")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    
    print("\n")
    print("Research session complete! You can find a trace of the agent interactions in the URL above.")
    print("Try another query or explore the agent capabilities further.")


if __name__ == "__main__":
    asyncio.run(main())
