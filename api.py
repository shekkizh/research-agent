# Create api.py to expose research functionality
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from pydantic import BaseModel
from typing import Dict, List, Any, Optional
import uuid
from contextlib import asynccontextmanager

# Store active connections
active_connections: Dict[str, List[WebSocket]] = {}
# Store research results
research_results: Dict[str, Any] = {}

# Middleware to handle the research manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Do nothing special
    yield
    # Shutdown: Close all connections
    for connection_list in active_connections.values():
        for connection in connection_list:
            try:
                await connection.close()
            except:
                pass


app = FastAPI(lifespan=lifespan)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    text: str
    session_id: str


@app.post("/api/research")
async def start_research(query: QueryRequest):
    # Generate a unique job ID
    job_id = str(uuid.uuid4())
    
    # Start research process in background
    asyncio.create_task(run_research(query.text, query.session_id, job_id))
    
    return {"status": "started", "session_id": query.session_id, "job_id": job_id}


async def run_research(query: str, session_id: str, job_id: str):
    # Import here to avoid circular imports
    from backend.manager import ResearchManager
    
    # Create a custom printer that will send updates via WebSocket
    manager = ResearchManager(
        printer_callback=lambda item, message, is_done=False: 
            broadcast_progress(session_id, item, message, is_done)
    )
    
    # Run the research - pass the session_id
    result = await manager.run(query, session_id=session_id)
    
    # Store the result
    research_results[session_id] = result
    
    # Broadcast completion
    await broadcast_completion(session_id, result)


async def broadcast_progress(session_id: str, item: str, message: str, is_done: bool):
    """Send progress updates to all connected clients for this session"""
    if session_id in active_connections:
        data = {
            "session_id": session_id,
            "type": "progress",
            "item": item,
            "message": message,
            "is_done": is_done
        }
        for connection in active_connections[session_id]:
            try:
                await connection.send_text(json.dumps(data))
            except:
                pass  # Connection might be closed


async def broadcast_completion(session_id: str, result: Any):
    """Send the final result to all connected clients for this session"""
    if session_id in active_connections:
        data = {
            "session_id": session_id,
            "type": "complete",
            "report": result.markdown_report if hasattr(result, 'markdown_report') else str(result)
        }
        for connection in active_connections[session_id]:
            try:
                await connection.send_text(json.dumps(data))
            except:
                pass  # Connection might be closed


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # Add the connection to our active connections
    if session_id not in active_connections:
        active_connections[session_id] = []
    active_connections[session_id].append(websocket)
    
    try:
        # If there's already a result for this session, send it immediately
        if session_id in research_results:
            result = research_results[session_id]
            await websocket.send_text(json.dumps({
                "session_id": session_id,
                "type": "complete",
                "report": result.markdown_report if hasattr(result, 'markdown_report') else str(result)
            }))
        
        # Keep the connection open and listen for any messages
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                # Handle user clarification responses
                if message.get("type") == "clarification_response":
                    # Broadcast the clarification to any waiting agents
                    await broadcast_clarification(session_id, message.get("text", ""))
            except:
                pass  # Ignore invalid messages
    except WebSocketDisconnect:
        # Remove connection when disconnected
        active_connections[session_id].remove(websocket)
        if not active_connections[session_id]:
            del active_connections[session_id]

# Add new functions for clarification handling
# Track agents waiting for clarification
waiting_for_clarification: Dict[str, asyncio.Event] = {}
clarification_responses: Dict[str, str] = {}

async def broadcast_clarification(session_id: str, clarification: str):
    """Store user clarification response"""
    clarification_responses[session_id] = clarification
    # Signal that clarification is available
    if session_id in waiting_for_clarification:
        waiting_for_clarification[session_id].set()

async def request_clarification(session_id: str, question: str) -> str:
    """Request clarification from the user and wait for response"""
    # Send clarification request to client
    if session_id in active_connections:
        # Create an event to wait for the response
        waiting_for_clarification[session_id] = asyncio.Event()
        
        data = {
            "session_id": session_id,
            "type": "clarification_request",
            "message": question
        }
        
        # Send to all connections for this session
        for connection in active_connections[session_id]:
            try:
                await connection.send_text(json.dumps(data))
            except:
                pass
        
        # Wait for the user to respond (with timeout)
        try:
            await asyncio.wait_for(waiting_for_clarification[session_id].wait(), timeout=300)  # 5 minute timeout
            response = clarification_responses.get(session_id, "No response provided")
            return response
        except asyncio.TimeoutError:
            return "User did not respond within the time limit"
        finally:
            # Clean up
            if session_id in waiting_for_clarification:
                del waiting_for_clarification[session_id]
