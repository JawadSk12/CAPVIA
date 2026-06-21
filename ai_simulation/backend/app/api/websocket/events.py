import socketio
from app.core.config import settings

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=settings.ALLOWED_ORIGINS,
)

@sio.event
async def connect(sid, environ, auth):
    print(f"Client connected: {sid}")
    await sio.emit("connected", {"sid": sid}, to=sid)

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_session(sid, data):
    session_id = data.get("session_id")
    await sio.enter_room(sid, f"session_{session_id}")
    await sio.emit("session_joined", {"session_id": session_id}, to=sid)

@sio.event
async def behavioral_event(sid, data):
    session_id = data.get("session_id")
    await sio.emit("admin_alert", data, room=f"admin_{session_id}")

@sio.event
async def join_admin(sid, data):
    test_id = data.get("test_id")
    await sio.enter_room(sid, f"admin_{test_id}")
    await sio.emit("admin_joined", {"test_id": test_id}, to=sid)
