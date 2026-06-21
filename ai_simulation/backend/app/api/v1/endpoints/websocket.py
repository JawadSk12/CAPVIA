"""
WebSocket Endpoint for Live Proctoring & Telemetry
Handles real-time behavioral tracking from candidates to HR dashboard
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.orm import Session
from typing import Dict, Set
from loguru import logger
import json
from datetime import datetime

from app.db.session import get_db
from app.models.session import Session as DBSession
from app.models.behavioral_event import BehavioralEvent

router = APIRouter()

# In-memory connection registries
# candidate_connections: session_id -> WebSocket
candidate_connections: Dict[int, WebSocket] = {}

# admin_connections: Set of admin WebSockets watching all sessions
admin_connections: Set[WebSocket] = set()

# session_telemetry: session_id -> latest telemetry snapshot
session_telemetry: Dict[int, dict] = {}


async def broadcast_to_admins(message: dict):
    """Broadcast a message to all connected HR admins."""
    dead = set()
    for ws in admin_connections:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    admin_connections.difference_update(dead)


@router.websocket("/candidate/{session_id}")
async def candidate_ws(
    websocket: WebSocket,
    session_id: int,
    token: str = Query(...),
):
    """
    Candidate WebSocket — receives behavioral telemetry events and sends timer ticks.
    """
    await websocket.accept()
    candidate_connections[session_id] = websocket
    logger.info(f"Candidate WebSocket connected for session {session_id}")

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            event_type = data.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong", "ts": datetime.utcnow().isoformat()})
                continue

            if event_type == "telemetry":
                payload = data.get("payload", {})
                session_telemetry[session_id] = {
                    "session_id": session_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    **payload
                }
                # Broadcast to HR dashboards
                await broadcast_to_admins({
                    "type": "telemetry_update",
                    "session_id": session_id,
                    "data": session_telemetry[session_id]
                })

            elif event_type == "behavioral_event":
                # Store in DB asynchronously via background
                event_data = data.get("payload", {})
                await broadcast_to_admins({
                    "type": "behavioral_alert",
                    "session_id": session_id,
                    "event": event_data,
                    "timestamp": datetime.utcnow().isoformat()
                })

            elif event_type == "heartbeat":
                session_telemetry.setdefault(session_id, {})
                session_telemetry[session_id]["last_heartbeat"] = datetime.utcnow().isoformat()

    except WebSocketDisconnect:
        logger.info(f"Candidate disconnected from session {session_id}")
        candidate_connections.pop(session_id, None)
        await broadcast_to_admins({
            "type": "candidate_disconnected",
            "session_id": session_id,
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Candidate WS error session {session_id}: {e}")
        candidate_connections.pop(session_id, None)


@router.websocket("/admin")
async def admin_ws(websocket: WebSocket):
    """
    Admin WebSocket — HR dashboard receives live telemetry from all candidates.
    """
    await websocket.accept()
    admin_connections.add(websocket)
    logger.info(f"Admin WebSocket connected. Total admins: {len(admin_connections)}")

    # Send current state snapshot
    await websocket.send_json({
        "type": "snapshot",
        "active_sessions": list(candidate_connections.keys()),
        "telemetry": session_telemetry,
        "timestamp": datetime.utcnow().isoformat()
    })

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})

            elif data.get("type") == "terminate_session":
                target_session = data.get("session_id")
                if target_session and target_session in candidate_connections:
                    await candidate_connections[target_session].send_json({
                        "type": "session_terminated",
                        "reason": data.get("reason", "Terminated by admin")
                    })

    except WebSocketDisconnect:
        logger.info("Admin WebSocket disconnected")
        admin_connections.discard(websocket)
    except Exception as e:
        logger.error(f"Admin WS error: {e}")
        admin_connections.discard(websocket)


def get_active_sessions_count() -> int:
    return len(candidate_connections)


def get_live_telemetry() -> dict:
    return session_telemetry
