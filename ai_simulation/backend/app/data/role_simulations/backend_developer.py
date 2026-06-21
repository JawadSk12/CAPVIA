"""
Backend Developer Role Simulation
5-round simulation for Backend Developer hiring
"""

BACKEND_DEVELOPER_SIMULATION = {
    "role": "Backend Developer",
    "description": "Server-side engineering simulation covering API design, database optimization, system design, and distributed systems.",
    "difficulty_levels": ["junior", "mid", "senior"],
    "total_duration_minutes": 90,
    "rounds": [
        {
            "round_number": 1,
            "name": "Requirement Analysis",
            "duration_minutes": 15,
            "questions": [
                {
                    "id": "be_r1_q1",
                    "title": "URL Shortener System Requirements",
                    "question_type": "problem_understanding",
                    "difficulty": "medium",
                    "problem_statement": """Design a URL shortener service (like bit.ly).
Requirements:
- 100M URLs shortened per day
- 10:1 read:write ratio
- URLs expire after 5 years
- Custom aliases allowed
- Analytics: click counts, geo-location

Identify:
1. Functional & non-functional requirements
2. Capacity estimates (storage, bandwidth, QPS)
3. Key technical challenges
4. Data model design considerations
5. Potential bottlenecks""",
                    "evaluation_criteria": {
                        "keywords": ["QPS", "storage", "cache", "hash", "collision", "redirect", "TTL", "CDN", "database", "sharding"],
                        "must_include": ["cache", "hash", "storage"],
                        "min_word_count": 200
                    },
                    "key_points": [
                        "Calculates correct QPS (100M/86400 ≈ 1160 writes/sec, 11600 reads/sec)",
                        "Identifies need for caching (high read ratio)",
                        "Discusses hash collision handling",
                        "Mentions database choice (NoSQL for scale)",
                        "Addresses URL expiration with TTL"
                    ],
                    "max_score": 100,
                    "time_limit_seconds": 900
                }
            ]
        },
        {
            "round_number": 2,
            "name": "Technical Execution",
            "duration_minutes": 35,
            "questions": [
                {
                    "id": "be_r2_q1",
                    "title": "Implement a Thread-Safe LRU Cache",
                    "question_type": "coding",
                    "difficulty": "hard",
                    "language": "python",
                    "problem_statement": """Implement a thread-safe LRU (Least Recently Used) cache class.

Requirements:
- O(1) get and put operations
- Thread-safe for concurrent access
- Evicts least recently used item when capacity is exceeded
- Support for TTL (time-to-live) per key

```python
cache = LRUCache(capacity=3, default_ttl=60)
cache.put("key1", "value1")
cache.put("key2", "value2", ttl=10)  # Custom TTL
val = cache.get("key1")  # Returns "value1"
cache.get("expired_key")  # Returns None if expired
```""",
                    "starter_code": """import threading
import time
from collections import OrderedDict
from typing import Any, Optional

class LRUCache:
    def __init__(self, capacity: int, default_ttl: int = 3600):
        \"\"\"
        Args:
            capacity: Max number of items to store
            default_ttl: Default time-to-live in seconds
        \"\"\"
        self.capacity = capacity
        self.default_ttl = default_ttl
        # TODO: Initialize data structures
        pass
    
    def get(self, key: str) -> Optional[Any]:
        \"\"\"Get value by key. Returns None if not found or expired.\"\"\"
        # TODO: Implement thread-safe get with TTL check
        pass
    
    def put(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        \"\"\"Insert or update a key-value pair with optional custom TTL.\"\"\"
        # TODO: Implement thread-safe put with eviction
        pass
    
    def delete(self, key: str) -> bool:
        \"\"\"Delete a key. Returns True if existed, False otherwise.\"\"\"
        pass
    
    def size(self) -> int:
        \"\"\"Return current number of items.\"\"\"
        pass
""",
                    "test_cases": [
                        {
                            "input": "cache = LRUCache(2)\ncache.put('a', 1)\ncache.put('b', 2)\nprint(cache.get('a'))\ncache.put('c', 3)\nprint(cache.get('b'))",
                            "expected_output": "1\nNone",
                            "explanation": "After adding 'c', 'b' is LRU and gets evicted since 'a' was accessed"
                        },
                        {
                            "input": "cache = LRUCache(3)\ncache.put('x', 10, ttl=1)\ntime.sleep(2)\nprint(cache.get('x'))",
                            "expected_output": "None",
                            "explanation": "Key expired after TTL"
                        }
                    ],
                    "max_score": 100,
                    "time_limit_seconds": 1800
                },
                {
                    "id": "be_r2_q2",
                    "title": "Design a Rate Limiter",
                    "question_type": "coding",
                    "difficulty": "medium",
                    "language": "python",
                    "problem_statement": """Implement a Token Bucket rate limiter.

The rate limiter should:
- Allow `rate` requests per `period` seconds
- Support per-user limits
- Be thread-safe
- Return remaining tokens with each check

```python
limiter = RateLimiter(rate=10, period=60)  # 10 req/min
result = limiter.check("user_123")
# result = {"allowed": True, "remaining": 9, "reset_in": 45}
```""",
                    "starter_code": """import threading
import time
from typing import Dict

class RateLimiter:
    def __init__(self, rate: int, period: int):
        \"\"\"
        Args:
            rate: Number of requests allowed per period
            period: Time period in seconds
        \"\"\"
        self.rate = rate
        self.period = period
        # TODO: Initialize storage
        pass
    
    def check(self, user_id: str) -> dict:
        \"\"\"
        Check if request is allowed for user_id.
        Returns dict with 'allowed', 'remaining', 'reset_in'
        \"\"\"
        pass
    
    def reset(self, user_id: str) -> None:
        \"\"\"Reset limits for a specific user.\"\"\"
        pass
""",
                    "max_score": 100,
                    "time_limit_seconds": 1200
                }
            ]
        },
        {
            "round_number": 3,
            "name": "Architecture & Strategy",
            "duration_minutes": 20,
            "questions": [
                {
                    "id": "be_r3_q1",
                    "title": "Database Strategy for High-Traffic App",
                    "question_type": "decision_making",
                    "difficulty": "hard",
                    "problem_statement": """A social media platform (50M DAU) needs to choose a database strategy for user posts.

Requirements:
- Posts: created, read frequently, rarely updated
- Complex queries: user timeline (follows graph traversal)
- Hashtag search
- Geo-location queries
- 95th percentile read latency < 50ms

Choose the primary strategy:""",
                    "options": [
                        {"id": "A", "title": "Single PostgreSQL with read replicas", "description": "Scale reads horizontally with replicas", "pros": ["ACID", "Complex queries", "Familiar"], "cons": ["Write bottleneck", "Sharding complexity later"]},
                        {"id": "B", "title": "Cassandra for writes + Elasticsearch for search", "description": "Write-optimized + full-text search layer", "pros": ["Massive write scale", "Powerful search"], "cons": ["No joins", "Eventual consistency", "Operational complexity"]},
                        {"id": "C", "title": "PostgreSQL + Redis cache + Elasticsearch", "description": "Relational core with caching and search overlay", "pros": ["Strong consistency", "Rich queries", "Cache absorbs read load"], "cons": ["Cache invalidation complexity", "Cost"]},
                        {"id": "D", "title": "DynamoDB single-table design", "description": "NoSQL with access-pattern-driven design", "pros": ["Infinite scale", "Managed"], "cons": ["Access pattern inflexible", "Expensive", "Complex queries impossible"]}
                    ],
                    "correct_option": "C",
                    "max_score": 100,
                    "time_limit_seconds": 900
                }
            ]
        },
        {
            "round_number": 4,
            "name": "Technical Communication",
            "duration_minutes": 10,
            "questions": [
                {
                    "id": "be_r4_q1",
                    "title": "Explain Database Indexing to a Junior Developer",
                    "question_type": "explanation",
                    "difficulty": "easy",
                    "scenario": """A junior developer on your team is confused about when to add database indexes. They ask:
"I added an index to every column to make all queries fast. But now writes are slower and storage doubled. What did I do wrong?"

Explain:
1. What indexes actually are and how they work
2. Why over-indexing hurts performance
3. How to decide which columns to index
4. What the developer should do now""",
                    "key_points": [
                        "Explains index as a sorted data structure (like book index)",
                        "Clarifies that indexes speed up reads but slow writes (maintenance cost)",
                        "Mentions selectivity — high-cardinality columns benefit most",
                        "Suggests using EXPLAIN/query analyzer to identify slow queries",
                        "Recommends removing unused indexes"
                    ],
                    "max_score": 100,
                    "time_limit_seconds": 600
                }
            ]
        },
        {
            "round_number": 5,
            "name": "Debugging",
            "duration_minutes": 20,
            "questions": [
                {
                    "id": "be_r5_q1",
                    "title": "Debug the API Authentication Middleware",
                    "question_type": "debugging",
                    "difficulty": "hard",
                    "problem_statement": "Find and fix the security bugs in this JWT authentication middleware.",
                    "buggy_code": """import jwt
import time
from functools import wraps
from flask import request, jsonify

SECRET_KEY = "secret"  # Bug 1: Hardcoded weak secret key

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        # Bug 2: Missing Bearer prefix stripping
        try:
            # Bug 3: Algorithm not specified - vulnerable to alg:none attack
            payload = jwt.decode(token, SECRET_KEY)
            
            # Bug 4: No expiration check
            user_id = payload.get('user_id')
            
        except jwt.InvalidTokenError:
            # Bug 5: Returns 200 OK on auth failure
            return jsonify({"error": "Invalid token"}), 200
        
        return f(user_id, *args, **kwargs)
    return decorated
""",
                    "bug_description": """Bug 1: SECRET_KEY is hardcoded and weak — should use env variable with strong random key.
Bug 2: Authorization header includes 'Bearer ' prefix that must be stripped before decode.
Bug 3: jwt.decode() without specifying algorithms=['HS256'] is vulnerable to algorithm confusion attacks.
Bug 4: JWT expiration ('exp' claim) is not being verified.
Bug 5: Auth failure should return 401 Unauthorized, not 200 OK.""",
                    "max_score": 100,
                    "time_limit_seconds": 1200
                }
            ]
        }
    ]
}
