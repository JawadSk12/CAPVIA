import asyncio
from core.auth import hash_password, verify_password

def test_engine():
    password = "TestPassword123!"
    hashed = hash_password(password)
    print(f"Hashed: {hashed}")
    
    match = verify_password(password, hashed)
    print(f"Match: {match}")
    
    # Try a known hash format
    known_hash = "$2b$12$6k5E6/uP6p9/qY7Qo7fPueQ6Z6G6z6H6Z6G6z6H6Z6G6z6H6Z6G6z" # Invalid but format check
    try:
        verify_password(password, known_hash)
        print("Format check passed")
    except Exception as e:
        print(f"Format check failed: {e}")

if __name__ == "__main__":
    test_engine()
