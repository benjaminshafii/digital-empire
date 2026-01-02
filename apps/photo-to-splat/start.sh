#!/bin/bash

# Photo-to-Splat starter script
# Run from repo root: pnpm photo-to-splat

DIR="$(cd "$(dirname "$0")" && pwd)"

# Kill any existing processes on these ports
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo ""
echo "================================"
echo "  Photo-to-Splat"
echo "================================"
echo ""

# Start backend
echo "[Backend] Starting on http://localhost:8000"
cd "$DIR/backend"
source venv/bin/activate
python server.py 2>&1 | sed 's/^/[Backend] /' &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 2

# Start frontend
echo "[Frontend] Starting on http://localhost:5173"
cd "$DIR/frontend"
npx vite 2>&1 | sed 's/^/[Frontend] /' &
FRONTEND_PID=$!

sleep 2
echo ""
echo "================================"
echo "  Ready!"
echo "  Open: http://localhost:5173"
echo "  Ctrl+C to stop"
echo "================================"
echo ""

# Handle Ctrl+C
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

# Wait
wait
