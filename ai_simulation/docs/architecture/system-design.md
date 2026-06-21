# System Architecture

## Overview
The AI Simulation Engine is a distributed, microservices-ready platform for conducting AI-powered technical assessments.

## Components

### Frontend (React + Vite)
- Single Page Application with real-time updates via WebSockets
- Zustand for state management
- Role-based views: Candidate and Admin

### Backend (FastAPI + Python)
- Async REST API with WebSocket support
- JWT-based authentication
- Celery for background task processing

### AI Engine
- Answer evaluation using Ollama LLM
- Code quality analysis using AST parsing
- Behavioral analysis from event streams
- Plagiarism detection via text similarity

### Database
- PostgreSQL: Persistent relational data
- Redis: Caching, Celery broker, session data

## Data Flow
1. Candidate authenticates → JWT issued
2. Test session created → Questions fetched
3. Candidate submits answers → Stored in DB
4. Celery worker → AI evaluation triggered
5. Scores computed → Report generated
6. Admin views live sessions via WebSocket
