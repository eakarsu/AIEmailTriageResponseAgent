#!/bin/bash

# AI Email Triage & Response Agent - Start Script
# This script cleans used ports, sets up the database, seeds data, and starts the application with hot-reload

set -e

echo "=========================================="
echo "AI Email Triage & Response Agent"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - Not using port 5000
BACKEND_PORT=3001
FRONTEND_PORT=3000
DB_NAME="email_triage_db"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="localhost"
DB_PORT="5432"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to kill process on a specific port
kill_port() {
    local port=$1
    echo -e "${YELLOW}Checking port $port...${NC}"

    # Find and kill processes on the port
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Killing process on port $port...${NC}"
        lsof -Pi :$port -sTCP:LISTEN -t | xargs kill -9 2>/dev/null || true
        sleep 1
        echo -e "${GREEN}Port $port is now free${NC}"
    else
        echo -e "${GREEN}Port $port is already free${NC}"
    fi
}

# Function to check PostgreSQL connection
check_postgres() {
    echo -e "${YELLOW}Checking PostgreSQL connection...${NC}"

    if ! command_exists psql; then
        echo -e "${RED}Error: PostgreSQL client (psql) is not installed${NC}"
        echo "Please install PostgreSQL and try again"
        exit 1
    fi

    # Try to connect to PostgreSQL
    if PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\q' 2>/dev/null; then
        echo -e "${GREEN}PostgreSQL connection successful${NC}"
    else
        echo -e "${YELLOW}PostgreSQL server may not be running. Attempting to start...${NC}"

        # Try to start PostgreSQL (macOS with Homebrew)
        if command_exists brew; then
            brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
            sleep 3
        fi

        # Check again
        if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c '\q' 2>/dev/null; then
            echo -e "${RED}Error: Cannot connect to PostgreSQL${NC}"
            echo "Please ensure PostgreSQL is running and accessible"
            echo "You can start it with: brew services start postgresql"
            exit 1
        fi
    fi
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}Setting up database...${NC}"

    # Create database if it doesn't exist
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${YELLOW}Creating database $DB_NAME...${NC}"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || true
        echo -e "${GREEN}Database created${NC}"
    else
        echo -e "${GREEN}Database $DB_NAME already exists${NC}"
    fi
}

# Clean up ports - including checking for any stale processes
echo ""
echo "Step 1: Cleaning up ports..."
echo "-------------------------------------------"
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT
# Also clean up any other potentially conflicting ports
kill_port 5173  # Vite default
kill_port 5174  # Vite alternate

# Check PostgreSQL
echo ""
echo "Step 2: Checking PostgreSQL..."
echo "-------------------------------------------"
check_postgres

# Setup database
echo ""
echo "Step 3: Setting up database..."
echo "-------------------------------------------"
setup_database

# Install dependencies
echo ""
echo "Step 4: Installing dependencies..."
echo "-------------------------------------------"

# Check if node is installed
if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js and try again"
    exit 1
fi

# Install backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install
# Install nodemon for hot-reload if not present
npm install -D nodemon 2>/dev/null || true
cd ..

# Install frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

echo -e "${GREEN}Dependencies installed${NC}"

# Seed database
echo ""
echo "Step 5: Seeding database with demo data..."
echo "-------------------------------------------"
echo -e "${YELLOW}This will create 15+ items for each feature${NC}"
cd backend
node src/seed.js
cd ..

echo ""
echo "Step 6: Starting services with hot-reload..."
echo "-------------------------------------------"

# Start backend with nodemon for hot-reload
echo -e "${YELLOW}Starting backend server on port $BACKEND_PORT with hot-reload...${NC}"
cd backend
if [ -f "node_modules/.bin/nodemon" ]; then
    npx nodemon --watch src --ext js,json src/index.js &
else
    npm start &
fi
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
sleep 3

# Start frontend with Vite (already has hot-reload built-in)
echo -e "${YELLOW}Starting frontend server on port $FRONTEND_PORT with hot-reload (Vite HMR)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Wait for services to start
sleep 5

echo ""
echo "=========================================="
echo -e "${GREEN}Application is now running!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:$FRONTEND_PORT"
echo -e "${BLUE}Backend:${NC}  http://localhost:$BACKEND_PORT"
echo ""
echo -e "${GREEN}Hot-Reload Enabled:${NC}"
echo "  - Backend: Changes to backend/src/*.js will auto-reload"
echo "  - Frontend: Changes to frontend/src/* will auto-reload (Vite HMR)"
echo ""
echo -e "${YELLOW}Demo Credentials:${NC}"
echo "  Email:    demo@example.com"
echo "  Password: demo123"
echo ""
echo -e "${YELLOW}AI Features Available:${NC}"
echo "  - AI Priority Scorer"
echo "  - AI Meeting Extractor"
echo "  - AI Follow-up Reminder"
echo "  - AI Template Suggester"
echo "  - AI Spam Intelligence"
echo "  - AI Email Prioritizer (Productivity)"
echo "  - AI Subject Optimizer (Marketing)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Handle shutdown
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    # Also kill any child processes
    pkill -P $BACKEND_PID 2>/dev/null || true
    pkill -P $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for processes
wait
