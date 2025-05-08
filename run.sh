#!/bin/bash

# Check if Python virtual environment exists
# if [ ! -d ".venv" ]; then
#     echo "Creating Python virtual environment..."
#     python -m venv .venv
# fi

# # Activate virtual environment
# source .venv/bin/activate

# # Install backend dependencies
# echo "Installing backend dependencies..."
# pip install -r requirements.txt

# # Check if frontend dependencies are installed
# if [ ! -d "frontend/node_modules" ]; then
#     echo "Installing frontend dependencies..."
#     cd frontend
#     npm install
#     cd ..
# fi

# Start the backend server in the background
echo "Starting backend server..."
uvicorn api:app --reload &
BACKEND_PID=$!

# Start the frontend server
echo "Starting frontend server..."
cd frontend
npm run dev

# When frontend is closed, kill the backend server
kill $BACKEND_PID 