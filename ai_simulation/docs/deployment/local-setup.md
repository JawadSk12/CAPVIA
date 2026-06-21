# Local Development Setup

## Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Python 3.11+
- Ollama (for AI features)

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourorg/ai-simulation-engine.git
cd ai-simulation-engine

# 2. Start infrastructure services
docker compose up postgres redis -d

# 3. Setup backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.development
alembic upgrade head
python scripts/seed_data.py
uvicorn app.main:socket_app --reload

# 4. Setup frontend (new terminal)
cd frontend
npm install
cp .env.example .env.development
npm run dev
```

## Access
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
