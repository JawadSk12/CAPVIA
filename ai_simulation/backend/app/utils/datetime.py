from datetime import datetime, timedelta, timezone

def utcnow() -> datetime:
    return datetime.now(timezone.utc)

def add_minutes(dt: datetime, minutes: int) -> datetime:
    return dt + timedelta(minutes=minutes)

def is_expired(dt: datetime) -> bool:
    return datetime.now(timezone.utc) > dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else datetime.now(timezone.utc) > dt

def format_duration(seconds: int) -> str:
    h, m, s = seconds // 3600, (seconds % 3600) // 60, seconds % 60
    return f"{h}h {m}m {s}s" if h > 0 else f"{m}m {s}s"
