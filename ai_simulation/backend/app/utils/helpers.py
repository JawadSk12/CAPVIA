import uuid
from typing import Any, Dict

def generate_uuid() -> str:
    return str(uuid.uuid4())

def flatten_dict(d: Dict, parent_key: str = '', sep: str = '.') -> Dict:
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def safe_divide(a: float, b: float, default: float = 0.0) -> float:
    return a / b if b != 0 else default
