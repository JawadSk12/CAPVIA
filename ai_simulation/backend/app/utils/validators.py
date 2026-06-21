import re

def is_valid_email(email: str) -> bool:
    return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email))

def is_strong_password(password: str) -> bool:
    return (len(password) >= 8 and re.search(r'[A-Z]', password) and
            re.search(r'[a-z]', password) and re.search(r'\d', password))

def sanitize_text(text: str, max_length: int = 10000) -> str:
    return text.strip()[:max_length]
