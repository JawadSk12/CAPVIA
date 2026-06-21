"""
API V1 Router — CAPVIA / IntelliRecruit AI
"""

from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    sessions,
    questions,
    submissions,
    evaluations,
    admin,
    health,
    simulations,
    websocket,
    internships,
    applications,
    system,
)

api_router = APIRouter()

# Health check
api_router.include_router(health.router, prefix="/health", tags=["health"])

# Authentication (HR signup, Candidate signup, login, verify, forgot/reset)
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Internships (HR creates/manages, candidates browse)
api_router.include_router(internships.router, prefix="/internships", tags=["internships"])

# Applications & Simulation Attempts
api_router.include_router(applications.router, prefix="", tags=["applications"])

# Legacy endpoints (kept for compatibility)
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(questions.router, prefix="/questions", tags=["questions"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["evaluations"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["simulations"])
api_router.include_router(websocket.router, prefix="/ws", tags=["websocket"])

# System Integration (CAPVIA)
api_router.include_router(system.router, prefix="/system", tags=["system"])