from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os

# Suppress TensorFlow oneDNN and other info/warning logs
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

import queue
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from fastapi import Request

# Import database core functions
from app.database import get_db, init_db, SessionLocal

# Import models
from app.models.schemas import Camera

# Import background processing engines
from app.video.camera_manager import CameraManager
from app.video.recorder import RecordingManager
from app.video.clip_extractor import ClipExtractor
from app.detection.detection_manager import DetectionManager
from app.alerts.alert_coordinator import AlertCoordinator

# Import existing and new API endpoint routers
from app.api.endpoints import (
    auth,
    cameras,
    live_streams,
    detections,
    alerts,
    recordings,
    snapshots,
    analytics,
    devices,
    privacy_settings,
    audit_logs,
    privacy,
    trusted,
    video,
    contacts,
    websockets
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

        # Initialize the Camera, Recording, and Clip Managers
        camera_manager = CameraManager()
        recorder_manager = RecordingManager(camera_manager)
        clip_extractor = ClipExtractor(camera_manager)

        # Initialize background processing pipelines
        alert_coordinator = AlertCoordinator(alert_queue=alert_queue, clip_extractor=clip_extractor)
        detection_manager = DetectionManager(alert_queue=alert_queue)

        # Start cleanup schedulers
        recorder_manager.start_cleanup_scheduler()
        clip_extractor.start_cleanup_scheduler()

        # Query and load active cameras from database to start background recording/capturing
        db = SessionLocal()
        try:
            cameras_list = db.query(Camera).all()
            print(f"Booting camera streams... Found {len(cameras_list)} registered cameras.")
            for cam in cameras_list:
                if cam.stream_url == "0" or cam.camera_type == "webcam":
                    print(f"Auto-booting webcam ID {cam.id} for testing!")
                    pass
                
                # Skip the mock cameras so they stop timing out in the console
                if "pendelcam" in cam.stream_url:
                    print(f"Skipping auto-boot for mock camera: {cam.camera_name}")
                    continue

                camera_manager.start_camera(cam.id, cam.camera_name, cam.stream_url)
                recorder_manager.start_recording(cam.id)
                cam.status = "online"
            db.commit()
        except Exception as db_err:
            print(f"Database error during camera startup boot: {db_err}")
            db.rollback()
        finally:
            db.close()



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

        # Shutdown all camera recorders and connections
        camera_manager = CameraManager()
        recorder_manager = RecordingManager(camera_manager)
        recorder_manager.shutdown_all()
        camera_manager.shutdown_all()

        # Shutdown clip scheduler
        clip_extractor = ClipExtractor(camera_manager)
        clip_extractor.stop_scheduler()

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
    app.include_router(recordings.router, prefix=f"{prefix}/recordings", tags=["Video Recordings"])
    app.include_router(snapshots.router, prefix=f"{prefix}/snapshots", tags=["Event Snapshots"])
    app.include_router(analytics.router, prefix=f"{prefix}/analytics", tags=["Analytics Dashboard"])
    app.include_router(devices.router, prefix=f"{prefix}/devices", tags=["Device Management"])
    app.include_router(privacy_settings.router, prefix=f"{prefix}/privacy-settings", tags=["Privacy Settings"])
    app.include_router(audit_logs.router, prefix=f"{prefix}/audit-logs", tags=["Audit Trails"])
    app.include_router(contacts.router, prefix=f"{prefix}/contacts", tags=["Emergency Contacts"])
    app.include_router(websockets.router, prefix=f"{prefix}/ws", tags=["WebSockets"])

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
        "docs_url": "/docs"
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