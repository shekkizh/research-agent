# Project Summary
The Personal Research Agent project aims to develop a multi-agent system that assists users in organizing their research thoughts, tracking their interests, and learning from their behavior. By capturing citations and links, the agent helps users understand their preferred research sources, ultimately creating a self-reflection memory that enhances future interactions. This system is designed to provide personalized assistance, making the research process more efficient and tailored to individual needs.

# Project Module Description
The project consists of several functional modules:
- **Orchestrator**: Manages the interaction between agents and user requests.
- **Specialized Agents**: Includes Document Processor, Web Searcher, Link Tracker, Code Finder, and Self-Reflection Agent, each handling specific tasks.
- **Memory Management**: Responsible for storing and retrieving user preferences and research history.
- **User Profile Management**: Maintains and updates user profiles based on interactions.

# Directory Tree
```
./
│
├── class_diagram.mermaid  # Class diagram for system architecture
├── sequence_diagram.mermaid # Sequence diagram illustrating program call flow
└── system_design.md         # Comprehensive system design document
```

# File Description Inventory
- **class_diagram.mermaid**: Visual representation of the classes and their relationships within the system.
- **sequence_diagram.mermaid**: Flow of interactions between the user and system components during a session.
- **system_design.md**: Detailed design document outlining the architecture, components, and technical considerations of the system.

# Technology Stack
- **Backend**: Python
- **NLP Processing**: OpenAI Agents SDK
- **Frontend**: React Typescript with Tailwind CSS
- **Deployment**: Docker containers

# Usage
To install dependencies, build, and run the project:
1. Install required packages using a package manager (e.g., pip for Python).
2. Set up the database and configure environment variables.
3. Build the frontend application.
4. Run the backend and frontend services using Docker.
