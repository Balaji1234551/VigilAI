from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

# Suppress TensorFlow oneDNN and other info/warning logs
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# --- FIX FOR PYTORCH 2.6 ULTRALYTICS CRASH ---
import torch
original_load = torch.load
def safe_load(*args, **kwargs):
    kwargs.setdefault('weights_only', False)
    return original_load(*args, **kwargs)
torch.load = safe_load
# ---------------------------------------------

import queue
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi import Request

# Import database core functions
from app.database import get_db, init_db, SessionLocal

# Import models
from app.models.schemas import Camera

# Import background processing engines
from app.detection.detection_manager import DetectionManager
from app.alerts.alert_coordinator import AlertCoordinator

from fastapi.staticfiles import StaticFiles

# Import existing and new API endpoint routers
from app.api.endpoints import (
    auth,
    cameras,
    live_streams,
    detections,
    alerts,
    snapshots,
    analytics,
    devices,
    privacy_settings,
    audit_logs,
    privacy,
    trusted,
    video,
    contacts,
    dashboard
)

# Load environment variables
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events manager for VigilAI backend services."""
    try:
        # Initialize PostgreSQL database schema if tables don't exist
        init_db()
        print("VigilAI PostgreSQL database tables checked/initialized successfully.")
    except Exception as e:
        print(f"Error during database initialization: {e}")

    try:
        # Initialize thread-safe event queue
        alert_queue = queue.Queue()

        # Initialize background processing pipelines
        alert_coordinator = AlertCoordinator(alert_queue=alert_queue)
        detection_manager = DetectionManager(alert_queue=alert_queue)

        # Start active worker loops
        alert_coordinator.start()
        detection_manager.start()

        # Initialize Anvil Cloud Uplink connection
        from app.anvil_uplink import start_anvil_uplink
        start_anvil_uplink()

        print("All VigilAI background processing and AI pipeline services initialized successfully.")
    except Exception as startup_err:
        print(f"VigilAI backend startup routine encountered an error: {startup_err}")

    yield

    print("Shutting down VigilAI backend services...")
    try:
        # Stop background AI detection pipeline
        detection_mgr = DetectionManager()
        detection_mgr.stop_pipeline()
        detection_mgr.join(timeout=2.0)

        # Stop Alert Queue Coordinator
        alert_coord = AlertCoordinator()
        alert_coord.stop_coordinator()
        alert_coord.join(timeout=2.0)

        print("VigilAI background services shutdown complete.")
    except Exception as shutdown_err:
        print(f"Error during backend shutdown sequence: {shutdown_err}")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="VigilAI Intelligent Surveillance Backend API",
    description="Production-grade secure backend for real-time video anomaly detection, behavioral tracking, user alerts, and device audits.",
    version="2.0.0",
    lifespan=lifespan
)

# Ensure uploads directories exist and mount them as static files
os.makedirs("uploads/processed", exist_ok=True)
os.makedirs("uploads/snapshots", exist_ok=True)
app.mount("/static/processed", StaticFiles(directory="uploads/processed"), name="processed")
app.mount("/static/snapshots", StaticFiles(directory="uploads/snapshots"), name="snapshots")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"Global unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": f"Internal Server Error: {exc}"}
    )

# Configure CORS for mobile app and web frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your specific web/mobile domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoint Routing Registration (Dual prefix /api and /api/v1) ---
for prefix in ["/api", "/api/v1"]:
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["User Authentication"])
    app.include_router(cameras.router, prefix=f"{prefix}/cameras", tags=["Camera Management"])
    app.include_router(live_streams.router, prefix=f"{prefix}/live-streams", tags=["Live Stream Management"])
    app.include_router(detections.router, prefix=f"{prefix}/detections", tags=["AI Anomaly Detections"])
    app.include_router(alerts.router, prefix=f"{prefix}/alerts", tags=["Alert Notifications"])
    app.include_router(snapshots.router, prefix=f"{prefix}/snapshots", tags=["Event Snapshots"])
    app.include_router(analytics.router, prefix=f"{prefix}/analytics", tags=["Analytics Dashboard"])
    app.include_router(devices.router, prefix=f"{prefix}/devices", tags=["Device Management"])
    app.include_router(privacy_settings.router, prefix=f"{prefix}/privacy-settings", tags=["Privacy Settings"])
    app.include_router(audit_logs.router, prefix=f"{prefix}/audit-logs", tags=["Audit Trails"])
    app.include_router(contacts.router, prefix=f"{prefix}/contacts", tags=["Emergency Contacts"])
    app.include_router(dashboard.router, prefix=f"{prefix}/dashboard", tags=["Home Dashboard Stats"])

    # Legacy / Backward compatibility routers
    app.include_router(privacy.router, prefix=f"{prefix}/privacy", tags=["Legacy Privacy Zones"])
    app.include_router(trusted.router, prefix=f"{prefix}/trusted", tags=["Legacy Trusted Persons"])
    app.include_router(video.router, prefix=f"{prefix}/video", tags=["Legacy Video Stream"])


# --- Root & System Health Checks ---
@app.get("/")
async def root():
    """Root endpoint verifying API server status."""
    return {
        "status": "VigilAI System Online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "db_url_status": "Set" if os.getenv("DATABASE_URL") else "Missing"
    }


@app.get("/health")
async def health_check():
    """Detailed health check for all system components."""
    return {
        "status": "healthy",
        "service": "VigilAI Surveillance Backend",
        "components": {
            "api": "operational",
            "database": "operational"
        }
    }


if __name__ == "__main__":
    import uvicorn
    # Retrieve port and host configurations from env
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)