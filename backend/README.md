# VigilAI - AI-Based Real-Time Intelligent Surveillance System for Behavioral Anomaly Detection and User Safety

VigilAI is an advanced, production-ready surveillance backend engineered with **FastAPI** and **SQLAlchemy** to ingest, process, and audit real-time security video streams. Leveraging **YOLOv8** for behavioral and object threat analysis, **MediaPipe** for pose landmark extraction, and **OpenCV** for dynamic, user-defined privacy zone masking, VigilAI offers a state-of-the-art solution for modern, secure video surveillance.

This backend provides a secure PostgreSQL relational architecture structured across 11 core surveillance tables, optimized for real-time sub-second queries using high-performance asynchronous operations (`asyncpg`), connection pooling, indices, and JWT-based Role-Based Access Control (RBAC).

---

## 📁 VigilAI Project Directory Structure

```
backend/
├── main.py                           # FastAPI core startup application
├── requirements.txt                  # Consolidated dependencies (includes asyncpg)
├── README.md                         # Reference, Setup, and API Guide
├── ER_DIAGRAM.md                     # Interactive Mermaid DB Schema Diagram
├── .env.example                      # Production-ready security env template
├── app/
│   ├── __init__.py
│   ├── config.py                     # Global constants and thresholds
│   ├── database.py                   # Sync (psycopg2) and Async (asyncpg) DB pools
│   ├── schemas.py                    # Strong Pydantic request/response schemas
│   ├── auth_utils.py                 # JWT token generation & password bcrypt tools
│   ├── models/
│   │   ├── __init__.py               # Model exports and exposer
│   │   └── schemas.py                # All 11 SQLAlchemy PostgreSQL models
│   ├── repositories/
│   │   ├── __init__.py               # Repository imports and registry
│   │   ├── user_repo.py              # User profiles & privacy auto-generation
│   │   ├── cameras_repo.py           # Camera CRUD layers
│   │   ├── live_streams_repo.py      # Stream recording sessions
│   │   ├── detections_repo.py        # Real-time high-throughput AI detection inserts
│   │   ├── alerts_repo.py            # Notification dispatch logging
│   │   ├── recordings_repo.py        # Video clip metadata layers
│   │   ├── snapshots_repo.py         # Capture frame metadata layers
│   │   ├── analytics_repo.py         # Dynamic dashboard compiles
│   │   ├── devices_repo.py           # Physical hardware tracking
│   │   ├── privacy_settings_repo.py  # User custom privacy toggles
│   │   └── audit_logs_repo.py        # Admin operations logs
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints/
│   │       ├── __init__.py
│   │       ├── auth.py               # Signup, login, and profile updates with auditing
│   │       ├── cameras.py            # Protected camera CRUD managers (RBAC)
│   │       ├── live_streams.py       # Livestream tracking
│   │       ├── detections.py         # Asynchronous real-time detection logs
│   │       ├── alerts.py             # Notifications dispatcher & legacy pipelines
│   │       ├── recordings.py         # MP4 video historical catalog
│   │       ├── snapshots.py          # Capture frame lookups
│   │       ├── analytics.py          # Dashboard reporting feeds
│   │       ├── devices.py            # Edge processing node heartbeats
│   │       ├── privacy_settings.py   # Privacy preferences updates
│   │       └── audit_logs.py         # Administrative audit trails (Admin only)
```

---

## 🛠️ Installation & Secure Setup

### 1. **Activate Environment & Install Dependencies**
```bash
cd backend
python -m venv .venv

# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

# Install all required modules
pip install -r requirements.txt
```

### 2. **Setup PostgreSQL Database**
Create a new database in your local/remote PostgreSQL instance named `vigilai_db`.

Or deploy immediately via **Docker**:
```bash
docker run --name vigilai_postgres \
  -e POSTGRES_DB=vigilai_db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=your_secure_password_here \
  -p 5432:5432 \
  -d postgres:15
```

### 3. **Configure Environment File**
Copy the environmental template and replace with your local credentials:
```bash
cp .env.example .env
```
Ensure your database variables in `.env` match your PostgreSQL credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vigilai_db
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
```

### 4. **Initialize and Seed the Database**
To automatically create all 11 tables and populate them with high-fidelity, realistic mock surveillance records (users, cameras, mock detections, alerts, recordings, analytics, hardware edge nodes, and administrative audit logs) for your presentations:
```bash
python app/database/seed_data.py
```

### 5. **Launch the Server**
Start the FastAPI server in development reload mode:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
- **Live Swagger API Docs**: http://localhost:8000/docs
- **ReDoc Documentation**: http://localhost:8000/redoc

---

## ⚡ Real-Time Detection Storage Workflow

This workflow represents the high-throughput pipeline executed by the AI computer-vision edge processing engine:

```
[Camera RTSP Feed] ➔ [OpenCV Frame Masking] ➔ [YOLOv8 & MediaPipe ML Model Inference]
                                                               │
                                                       (Anomaly Detected)
                                                               │
                                                               ▼
                                                [POST /api/v1/detections/]
                                             (Asynchronously Saves to Database)
                                                               │
                                                ┌──────────────┴──────────────┐
                                                ▼                             ▼
                                    [Trigger Alert Message]          [Save Snapshot File]
                                  [POST /api/v1/alerts/]          [POST /api/v1/snapshots/]
```

1. **Privacy Masking**: OpenCV overlays user-defined privacy zones on the frame based on `/api/v1/privacy/zones` preferences.
2. **AI Inference**: The frame passes through YOLOv8 and MediaPipe Pose models. If an anomaly occurs (e.g., "Fall" or "Fight"), coordinates, confidence scores, and pose skeleton data are compiled.
3. **Async Storage**: The edge node sends a high-performance `POST` request to `/api/v1/detections/`. This writes the event asynchronously to the PostgreSQL database using SQLAlchemy's async driver (`asyncpg`) without blocking downstream inference.
4. **Notification Dispatch**: An associated Alert record is created via `POST /api/v1/alerts/` which triggers push/SMS/email dispatches, while the keyframe is cropped and recorded via `POST /api/v1/snapshots/`.

---

## 🔌 API Endpoints Reference Catalog

All endpoints (except signup and login) are secured via a **JWT Token Bearer** header (`Authorization: Bearer <token>`).

### 1. User Authentication (Table 1)
*   `POST /api/v1/auth/signup` - Register a new user and auto-generate default privacy profiles. Writes to Audit Log.
*   `POST /api/v1/auth/login` - Authenticate, log, and obtain a secure JWT Access Token.
*   `PUT /api/v1/auth/profile/{email}` - Update user settings (admins or account holder only).

### 2. Camera Management (Table 2)
*   `POST /api/v1/cameras/` - Register a new camera configuration (admin or operator only). Writes to Audit Log.
*   `GET /api/v1/cameras/` - List and search all cameras (paginated).
*   `GET /api/v1/cameras/{camera_id}` - Retrieve details of a single camera.
*   `PUT /api/v1/cameras/{camera_id}` - Modify stream credentials, locations, or statuses.
*   `DELETE /api/v1/cameras/{camera_id}` - Remove camera (Cascades to detections, streams, and recordings).

### 3. Live Stream Sessions (Table 3)
*   `POST /api/v1/live-streams/` - Log the start of an active stream session.
*   `GET /api/v1/live-streams/active` - List currently streaming surveillance feeds.
*   `PUT /api/v1/live-streams/{stream_id}/end` - Close stream tracking session.

### 4. AI Anomaly Detections (Table 4)
*   `POST /api/v1/detections/` - [ASYNC HIGH THROUGHPUT] Record a newly captured AI behavioral/threat detection.
*   `GET /api/v1/detections/` - Search and paginate detections by camera, anomaly type (Fall, Fight, Weapon), or dates.
*   `GET /api/v1/detections/{detection_id}` - Retrieve detailed bounding box coordinates and skeleton landmark nodes.

### 5. Alert Notifications (Table 5)
*   `POST /api/v1/alerts/` - Raise a triggered notification log linked to an AI detection.
*   `GET /api/v1/alerts/` - Search and filter dispatches.
*   `PUT /api/v1/alerts/{alert_id}/delivery-status` - Update delivery confirmation (sent, failed).
*   `GET /api/v1/alerts/camera/{camera_id}` - [Retrofitted] Get all alerts for a camera ID.
*   `GET /api/v1/alerts/trends/{camera_id}` - [Retrofitted] Compile monthly alert count trend aggregates.

### 6. Video Recordings Catalog (Table 6)
*   `POST /api/v1/recordings/` - Record local or cloud-stored MP4 surveillance video clip links.
*   `GET /api/v1/recordings/camera/{camera_id}` - Get historical clip lists for a camera.

### 7. Event Snapshots (Table 7)
*   `POST /api/v1/snapshots/` - Map crop screenshots to anomaly events.
*   `GET /api/v1/snapshots/detection/{detection_id}` - Get frame captures for a detection.

### 8. Analytics Dashboard Feeds (Table 8)
*   `GET /api/v1/analytics/summary` - Pull the latest compiled analytical counts (total alerts, detections, specific count breakdowns).
*   `POST /api/v1/analytics/generate` - Force an on-demand cache re-compilation of surveillance metrics.

### 9. Edge Hardware Devices (Table 9)
*   `POST /api/v1/devices/` - Register physical edge Jetson nodes or processing servers.
*   `PUT /api/v1/devices/{device_id}/heartbeat` - Send a connection status ping update.

### 10. Privacy Profiles (Table 10)
*   `GET /api/v1/privacy-settings/user/{user_id}` - Retrieve a user's frame masking preference rules.
*   `PUT /api/v1/privacy-settings/user/{user_id}` - Modify face blur triggers, retention parameters, or cloud sync policies.

### 11. Audit Trails (Table 11)
*   `GET /api/v1/audit-logs/` - [ADMIN ONLY] Chronological administrative audit logs. Filter by operator or action type.

---

## 🧪 Quick Test Guide (Command Line Curl)

1.  **Register Operator User**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/signup" \
      -H "Content-Type: application/json" \
      -d '{"full_name": "Marcus Vance", "email": "marcus@vigilai.com", "password": "securepassword", "role": "operator"}'
    ```

2.  **Authenticate & Obtain JWT Token**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/auth/login" \
      -H "Content-Type: application/json" \
      -d '{"email": "marcus@vigilai.com", "password": "securepassword"}'
    ```
    *Copy the `<access_token>` from the JSON response to use in subsequent requests.*

3.  **Register Camera (Requires Token)**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/cameras/" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"camera_name": "Backyard Patio", "camera_type": "RTSP", "stream_url": "rtsp://192.168.1.102/stream", "location": "Back Door Pergola", "status": "online", "resolution": "1920x1080", "fps": 30}'
    ```

4.  **Insert Async AI Detection (Requires Token)**:
    ```bash
    curl -X POST "http://localhost:8000/api/v1/detections/" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer <your_jwt_token>" \
      -d '{"camera_id": 1, "detection_type": "Fall", "confidence_score": 0.89, "bounding_box": {"x1": 100, "y1": 150, "x2": 250, "y2": 400}, "pose_data": {"joints": {"shoulder": [120, 160], "knee": [200, 310]}}, "snapshot_url": "/storage/snapshots/fall_001.jpg"}'
    ```

5.  **Fetch Analytics Summary Dashboard (Requires Token)**:
    ```bash
    curl -X GET "http://localhost:8000/api/v1/analytics/summary" \
      -H "Authorization: Bearer <your_jwt_token>"
    ```

---

## 📊 Performance and Scaling Strategies

To transition from a final-year project demo to a real-world multi-camera environment:

*   **Database Connection Pooling**: Built-in connection recycler (`pool_recycle=3600`) and pre-ping checks (`pool_pre_ping=True`) prevent connection leakage under continuous RTSP feeds.
*   **Asynchronous Database Operations**: Routing real-time AI frames to async endpoints running on top of an async engine (`asyncpg`) eliminates bottleneck wait times, ensuring the computer-vision process continues at maximum frame rates.
*   **Relational Cascades**: Declared `ON DELETE CASCADE` indexes guarantee database consistency, cleaning up historical detections and snapshots immediately when a camera is removed.
*   **Search Optimization Indices**: Search parameters (detection type, timestamps, and user ID references) are fully indexed using PostgreSQL B-tree architectures, reducing query lookup speeds from $O(N)$ to $O(\log N)$.
