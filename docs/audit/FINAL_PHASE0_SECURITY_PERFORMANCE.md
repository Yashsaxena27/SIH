# FINAL PHASE 0 — SECURITY, PERFORMANCE & RELIABILITY FORENSIC AUDIT
**Project:** POTHOLE WALA — Infrastructure Intelligence Network (SIH 2026 Final Build)  
**Audit Date:** September 2026  
**Scope:** Security posture, authentication enforcement, input sanitization, transcoding bottlenecks, and database query profiling.

---

## 1. Security Architecture & Threat Forensics

### A. Authentication & Authorization Failure (P0 Blocker)
- **Vulnerability:** Zero API authentication or authorization across all 28+ routes in `backend/app/api/v1/`.
- **Code Evidence:**
  - `backend/app/core/security.py` contains working cryptographic helpers (`create_access_token`, `verify_password`, `get_password_hash`).
  - **ZERO endpoints** import or depend on `get_current_user` or `OAuth2PasswordBearer`.
  - Frontend client `frontend/src/services/core/client.ts:9` explicitly notes:
    ```typescript
    // Future expansion: Add Auth headers here
    ```
- **Exploitation Vector:** Any anonymous user can send `DELETE` or `PATCH` requests to `/api/v1/tickets/{id}`, alter municipal work orders, approve contractor payments, or inject spoofed detections via `POST /api/v1/ingest/detection`.
- **Production Defense:** FastAPI dependency injection `Depends(get_current_user)` must be enforced across all state-mutating endpoints.

### B. Secret Management & Insecure Fallbacks (P1)
- `backend/app/core/config.py:33`:
  ```python
  JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkey-change-in-production")
  ```
- **Warning Log in Pytest:**
  `InsecureKeyLengthWarning: The HMAC key is 20 bytes long, which is below the minimum recommended length of 32 bytes for SHA256 (RFC 7518 Section 3.2).`
- **Requirement:** In production mode (`DEMO_MODE=false`), a weak or missing JWT secret must trigger immediate application startup failure.

### C. Unrestricted File Upload & Media Traversal (P1)
- `backend/app/api/v1/inspection.py:32–54`:
  - Upload handler accepts raw client files without MIME validation or magic-byte inspection.
  - No `MAX_CONTENT_LENGTH` is enforced, exposing the server to disk exhaustion attacks via multi-gigabyte uploads.
- **Requirement:** Generate server-side UUID filenames, enforce a 100MB file limit, and validate video container headers.

### D. Permissive Cross-Origin Resource Sharing (CORS) (P2)
- `backend/app/core/config.py:40–48` allows multiple localhost origins with wildcard headers and credentials. Safe for local development, but must be strictly bound to the deployed frontend domain in production.

---

## 2. Performance, Concurrency & Infrastructure Forensics

### A. FFMPEG Transcoding Dependency
- **Forensic Diagnosis:**
  - OpenCV writes `.mp4v` codec files by default.
  - Modern web browsers (Chrome, Edge, Safari) require H.264 video codec (`libx264` + `yuv420p`) for HTML5 playback.
  - `ml/pipeline/video_processor.py:272` executes `subprocess.run(["ffmpeg", ...], check=True)`.
  - **Docker Container:** Works because `ffmpeg` is installed via `apt-get` in Debian.
  - **Windows Host:** Windows does **not** have `ffmpeg` in system PATH (`The term 'ffmpeg' is not recognized`). Local executions outside Docker crash immediately with `RuntimeError`.

### B. Database Query Performance & Missing Spatial Index
- **Forensic Diagnosis via PostgreSQL EXPLAIN:**
  - Table: `urban_issues`
  - Existing Index: `idx_urban_issues_location ON urban_issues USING gist (location)`
  - Query: `ST_DWithin(geography(location), geography(point), 15.0)`
  - **EXPLAIN Output:** `Seq Scan on urban_issues (cost=0.00..2504.25 rows=1 width=193)`
  - Casting `location` to `geography` renders the geometry GiST index unusable, resulting in sequential scans across all records.
- **Remediation:** Add an Alembic migration creating an expression index:
  ```sql
  CREATE INDEX idx_urban_issues_geog_location ON urban_issues USING gist ((location::geography));
  ```

### C. In-Memory Realtime Concurrency vs Idle Redis
- **Forensic Diagnosis:**
  - Docker runs `redis-1` (Redis 7) on port 6379.
  - `backend/app/api/v1/events.py` uses an in-memory `set()` of `asyncio.Queue` objects.
  - **Risk:** In multi-worker Uvicorn configurations, Server-Sent Events (SSE) will drop messages across worker boundaries. Redis Pub/Sub must be wired as the shared broker.
