"""Generate synthetic test data for load testing."""
import random
from faker import Faker

fake = Faker()

def generate_candidates(n: int = 50):
    return [{"email": fake.email(), "name": fake.name(), "role": "candidate"} for _ in range(n)]

def generate_sessions(candidate_ids, test_id: str = "test-001"):
    return [{"candidate_id": cid, "test_id": test_id, "status": random.choice(["completed", "active", "expired"])} for cid in candidate_ids]

if __name__ == "__main__":
    candidates = generate_candidates(20)
    print(f"Generated {len(candidates)} candidates")
