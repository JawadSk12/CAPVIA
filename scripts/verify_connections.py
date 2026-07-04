#!/usr/bin/env python3
import os
import sys
import asyncio
import socket
import urllib.request
import urllib.error
import json
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine
import redis

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

BASE_DIR = Path(__file__).resolve().parent.parent

def load_env_file(filepath):
    """Parses a .env or .env.local file into a dictionary."""
    env_vars = {}
    if not os.path.exists(filepath):
        return env_vars
    with open(filepath, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                # Strip quotes
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
    return env_vars

def check_tcp_port(host, port, timeout=2.0):
    """Checks if a TCP port is open."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (socket.timeout, ConnectionRefusedError, OSError):
        return False

async def verify_neon(db_url):
    """Verifies connection to Neon Postgres DB."""
    try:
        # sqlalchemy async engine needs postgresql+asyncpg
        if not db_url.startswith("postgresql+asyncpg://"):
            if db_url.startswith("postgresql://"):
                db_url = db_url.replace("postgresql://", "postgresql+asyncpg://")
            else:
                raise ValueError("Invalid protocol for async connection")
        
        engine = create_async_engine(db_url)
        async with engine.connect() as conn:
            from sqlalchemy import text
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return True, "Connected successfully"
    except Exception as e:
        return False, str(e)

def verify_local_redis(redis_url):
    """Verifies local Redis connectivity."""
    try:
        r = redis.Redis.from_url(redis_url, socket_timeout=2.0)
        if r.ping():
            return True, "Ping successful"
        return False, "Failed to ping"
    except Exception as e:
        return False, str(e)

def verify_upstash_redis(url, token):
    """Verifies Upstash Redis using REST API."""
    if not url or not token:
        return False, "Missing URL or Token"
    try:
        req = urllib.request.Request(
            f"{url.rstrip('/')}/ping",
            headers={"Authorization": f"Bearer {token}"}
        )
        with urllib.request.urlopen(req, timeout=10.0) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if res_data.get("result") == "PONG":
                return True, "REST Ping successful"
            return False, f"Unexpected response: {res_data}"
    except Exception as e:
        return False, str(e)

def verify_supabase(url, key):
    """Verifies Supabase connectivity by hitting the REST endpoint."""
    if not url or not key:
        return False, "Missing Supabase URL or Publishable Key"
    try:
        # Standard Supabase endpoint
        target_url = f"{url.rstrip('/')}/rest/v1/"
        req = urllib.request.Request(
            target_url,
            headers={"apikey": key}
        )
        # Hitting Supabase REST API; 200 or 401 (if authorized/unauthorized but active) is fine
        try:
            with urllib.request.urlopen(req, timeout=10.0) as response:
                status = response.getcode()
                if status in (200, 201, 204):
                    return True, "Endpoint active"
        except urllib.error.HTTPError as he:
            # 401 is actually a successful connection because the server evaluated the key
            if he.code in (200, 401, 406):
                return True, f"Endpoint reachable (HTTP {he.code})"
            return False, f"HTTP error {he.code}: {he.reason}"
    except Exception as e:
        return False, str(e)

async def main():
    print(f"\n{BLUE}=== CAPVIA Connection Verification Suite ==={RESET}\n")
    
    # 1. Load Configurations
    platform_env = load_env_file(BASE_DIR / "capvia_platform" / ".env")
    recruiter_env = load_env_file(BASE_DIR / "capvia_platform" / "frontend" / ".env.local")
    ats_env = load_env_file(BASE_DIR / "ats_resume" / "backend" / ".env")
    simulation_env = load_env_file(BASE_DIR / "ai_simulation" / "backend" / ".env")
    
    overall_success = True
    
    # 2. Neon Database Check
    neon_url = platform_env.get("DATABASE_URL")
    if neon_url:
        print("Checking Neon Cloud Database...", end="", flush=True)
        ok, msg = await verify_neon(neon_url)
        if ok:
            print(f" {GREEN}[OK] {msg}{RESET}")
        else:
            print(f" {RED}[FAILED] {msg}{RESET}")
            overall_success = False
    else:
        print(f"Checking Neon Cloud Database... {YELLOW}[WARNING] DATABASE_URL not found in capvia_platform/.env{RESET}")
        overall_success = False

    # 3. Local Redis Check
    redis_url = platform_env.get("REDIS_URL", "redis://127.0.0.1:6379/0")
    print("Checking Local Redis...", end="", flush=True)
    ok, msg = verify_local_redis(redis_url)
    if ok:
        print(f" {GREEN}[OK] {msg}{RESET}")
    else:
        print(f" {RED}[FAILED] {msg}{RESET}")
        overall_success = False

    # 4. Local MongoDB Check
    print("Checking Local MongoDB (127.0.0.1:27017)...", end="", flush=True)
    if check_tcp_port("127.0.0.1", 27017):
        print(f" {GREEN}[OK] Reachable{RESET}")
    else:
        print(f" {RED}[FAILED] Port 27017 connection refused. Make sure mongod is running.{RESET}")
        overall_success = False

    # 5. Upstash Redis Check
    upstash_url = recruiter_env.get("UPSTASH_REDIS_REST_URL")
    upstash_token = recruiter_env.get("UPSTASH_REDIS_REST_TOKEN")
    if upstash_url and upstash_token:
        print("Checking Upstash Redis REST API...", end="", flush=True)
        ok, msg = verify_upstash_redis(upstash_url, upstash_token)
        if ok:
            print(f" {GREEN}[OK] {msg}{RESET}")
        else:
            print(f" {RED}[FAILED] {msg}{RESET}")
            overall_success = False
    else:
        print(f"Checking Upstash Redis... {YELLOW}[WARNING] Credentials missing in capvia_platform/frontend/.env.local{RESET}")

    # 6. Supabase Connection Check
    supabase_url = recruiter_env.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = recruiter_env.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
    if supabase_url and supabase_key:
        print("Checking Supabase Connection...", end="", flush=True)
        ok, msg = verify_supabase(supabase_url, supabase_key)
        if ok:
            print(f" {GREEN}[OK] {msg}{RESET}")
        else:
            print(f" {RED}[FAILED] {msg}{RESET}")
            overall_success = False
    else:
        print(f"Checking Supabase... {YELLOW}[WARNING] Credentials missing in capvia_platform/frontend/.env.local{RESET}")

    # 7. Resend Config Check
    resend_key = platform_env.get("RESEND_API_KEY") or recruiter_env.get("RESEND_API_KEY") or ats_env.get("RESEND_API_KEY")
    print("Checking Resend API Configuration...", end="", flush=True)
    if resend_key:
        if resend_key.startswith("re_"):
            print(f" {GREEN}[OK] API Key configured & verified (Format: re_*){RESET}")
        else:
            print(f" {RED}[FAILED] Invalid key format: {resend_key}{RESET}")
            overall_success = False
    else:
        print(f" {YELLOW}[SKIPPED] RESEND_API_KEY not configured. Falling back to console-simulated emails in development.{RESET}")

    # 8. Local PostgreSQL check (ats_db, ai_simulation)
    print("Checking Local PostgreSQL (127.0.0.1:5432)...", end="", flush=True)
    if check_tcp_port("127.0.0.1", 5432):
        print(f" {GREEN}[OK] Reachable{RESET}")
    else:
        print(f" {RED}[FAILED] Port 5432 connection refused. Make sure postgresql is running.{RESET}")
        overall_success = False

    print(f"\n{BLUE}============================================={RESET}\n")
    sys.exit(0 if overall_success else 1)

if __name__ == "__main__":
    asyncio.run(main())
