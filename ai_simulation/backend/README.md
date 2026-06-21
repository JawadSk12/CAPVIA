# AssessAI Backend

This is the backend service for the **AssessAI** technical interview platform. It handles the core business logic, API routing, AI evaluation pipelines, and real-time WebSocket communication for live proctoring.

## 🚀 Tech Stack

- **Framework**: FastAPI (Python 3.12+)
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Real-time**: FastAPI WebSockets
- **Authentication**: JWT (JSON Web Tokens) with Passlib & Bcrypt
- **Validation**: Pydantic v2
- **Orchestration**: Docker

## ✨ Key Features

- **Robust REST API**: Complete API coverage for authentication, test management, candidate lifecycle, and results aggregation.
- **Real-time Live Proctoring**: WebSocket endpoints that accept live behavioral event streams (tab switches, webcam flags) from the frontend and broadcast alerts to the Admin Dashboard.
- **AI Evaluation Engine**: Pluggable architecture designed to ingest candidate code submissions and written responses, scoring them across multiple dimensions (Correctness, Efficiency, Code Style).
- **Secure Authentication**: Role-based access control (RBAC) distinguishing between `admin` (HR/Recruiters) and `candidate` roles.

## 📁 Project Structure

```text
backend/
├── alembic/              # Database migration scripts
├── app/
│   ├── api/              # API router definitions (endpoints)
│   ├── core/             # Core configurations, security, and settings
│   ├── crud/             # Create, Read, Update, Delete (CRUD) database operations
│   ├── db/               # Database connection and session management
│   ├── models/           # SQLAlchemy database models
│   ├── schemas/          # Pydantic schemas for request/response validation
│   ├── services/         # Business logic (AI pipelines, scoring, WebSockets)
│   └── main.py           # FastAPI application entry point
├── tests/                # Pytest test suites
├── requirements.txt      # Python dependencies
└── alembic.ini           # Alembic configuration
```

## 🛠️ Getting Started

### Prerequisites
- Python 3.12+
- PostgreSQL instance running locally or via Docker.

### Local Installation

1. **Create a virtual environment**:
   ```bash
   python3 -m venv venv
   ```

2. **Install dependencies**:
   ```bash
   ./venv/bin/pip install -r requirements.txt
   ```

3. **Environment Configuration**:
   Create a `.env` file in the `backend` root:
   ```env
   PROJECT_NAME="AssessAI API"
   API_V1_STR="/api/v1"
   SECRET_KEY="your-super-secret-key-change-in-production"
   ACCESS_TOKEN_EXPIRE_MINUTES=1440
   
   # PostgreSQL Connection string
   DATABASE_URL=postgresql://user:password@localhost:5432/assessai
   ```

4. **Run Database Migrations**:
   Ensure your PostgreSQL server is running and the database exists, then run:
   ```bash
   ./venv/bin/alembic upgrade head
   ```

5. **Start the Development Server**:
   ```bash
   ./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### API Documentation

FastAPI automatically generates interactive API documentation. Once the server is running, you can access:
- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

## 🧩 Database Migrations (Alembic)

When you make changes to the SQLAlchemy models in `app/models/`, you need to generate a new migration script and apply it:

1. **Generate a new migration**:
   ```bash
   alembic revision --autogenerate -m "Description of your changes"
   ```

2. **Apply the migration to the database**:
   ```bash
   alembic upgrade head
   ```

## 🔐 Authentication Flow

The API uses OAuth2 with Password Flow (Bearer tokens). 
- Clients send `POST /api/v1/auth/login` with an email and password.
- The server returns an `access_token`.
- Subsequent requests must include the header: `Authorization: Bearer <access_token>`.
