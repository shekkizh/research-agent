# Research Assistant

A multi-agent system that assists users in organizing their research thoughts, tracking their interests, and learning from their behavior.

## Features

- Multi-tab research interface
- Real-time progress updates
- Markdown report rendering
- Web search capabilities
- Structured research reports

## Setup Instructions

### Shell script

`run.sh` combines all the setup steps below - bash run this to get started quickly.

### Backend Setup

1. Create and activate a virtual environment:

   ```
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install the required packages:

   ```
   pip install -r requirements.txt
   ```

3. Make sure you have set your OpenAI API key:
   ```
   export OPENAI_API_KEY=sk-your-api-key
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install the dependencies:

   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

### Running the Application

1. Start the backend server in one terminal:

   ```
   uvicorn api:app --reload
   ```

2. Start the frontend development server in another terminal:

   ```
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to the URL shown in the frontend terminal (usually http://localhost:3000).

## Project Structure

- `backend/`: Python backend with the research agent implementation
- `frontend/`: React frontend with TypeScript and Tailwind CSS
- `api.py`: FastAPI backend server with WebSocket support
