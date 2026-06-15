"""
VigilAI Core Entrypoint File (main.py).
Orchestrates lifespan startup and shutdown routines.
Binds FastAPI REST routers, mounts static directories, configures permissive CORS,
and spins up multi-threaded camera captures, video recorders, AI pipeline detectors, and cloud uplink daemons.
"""
import os
import queue
import logging
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import RECORDINGS_DIR, CLIPS_DIR, SNAPSHOTS_DIR
from sqlalchemy import text
from database.db import engine, Base, SessionLocal
from database.crud import get_cameras, update_camera_status
from video.camera_manager import CameraManager
from video.recorder import RecordingManager
from video.clip_extractor import ClipExtractor
from detection.detection_manager import DetectionManager
from alerts.alert_coordinator import AlertCoordinator
from anvil_uplink import start_anvil_uplink

# Core Routers
from api.auth import router as auth_router
from api.cameras import router as cameras_router
from api.alerts import router as alerts_router
from api.analytics import router as analytics_router
from api.recordings import router as recordings_router
from api.ws import router as ws_router
from api.settings import router as settings_router
from api.dashboard import router as dashboard_router

# Setup Logging
logger = logging.getLogger("VigilAI.Main")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Global instances of coordinators
alert_queue = queue.Queue()
camera_manager = CameraManager()
recording_manager = RecordingManager(camera_manager)
clip_extractor = ClipExtractor(camera_manager)
detection_manager = DetectionManager(alert_queue=alert_queue)
alert_coordinator = AlertCoordinator(alert_queue=alert_queue, clip_extractor=clip_extractor)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Handles startup table creations, stream launches, background thread scheduling,
    and elegant shutdown teardown sweeps to prevent database or MP4 locking.
    """
    # ==========================================
    # STARTUP ROUTINES
    # ==========================================
    logger.info("Initializing VigilAI Server Startup routines...")
    
    # 1. Auto-create Database Tables with Resilience
    max_retries = 5
    retry_delay = 5
    for attempt in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("Database connection established and tables initialized successfully.")
            break
        except Exception as e:
            logger.error(f"Database connection failed on attempt {attempt + 1}/{max_retries}: {e}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                logger.critical("Database completely unreachable! Please check your PostgreSQL connection.")

    # 2. Start Alert and Storage sweep threads
    import asyncio
    from api.ws import manager
    manager.set_loop(asyncio.get_running_loop())
    
    recording_manager.start_cleanup_scheduler()
    clip_extractor.start_cleanup_scheduler()
    
    # Start AI frame analysis loop
    detection_manager.start()
    # Start consumer queue alerts dispatcher
    alert_coordinator.start()
    
    # 3. Query existing cameras from Database and boot them automatically
    db = SessionLocal()
    try:
        # We query all cameras. Since we represent development, we assume a single-user system.
        # Boot every camera listed to resume active surveillance automatically on reboot!
        cameras = db.query(Base.metadata.tables["cameras"]).all()
        logger.info(f"Loaded {len(cameras)} cameras from database registry. Spawning threads...")
        
        for cam in cameras:
            # cam format is tuple from core table query or list
            # Fetch indexes: id(0), user_id(1), name(2), location(3), type(4), url(5), status(6)
            cid = cam[0]
            name = cam[2]
            url = cam[5]
            logger.info(f"Checking camera ID {cid}: '{name}' on source '{url}'")
            if url == "0" or cam[4] == "webcam":
                logger.info(f"Skipping auto-boot for webcam ID {cid}")
                continue

            logger.info(f"Auto-booting camera ID {cid}: '{name}' on source '{url}'")
            camera_manager.start_camera(cid, name, url)
            recording_manager.start_recording(cid)
            
            # Update status flag to online in database
            db.execute(
                Base.metadata.tables["cameras"].update().where(Base.metadata.tables["cameras"].c.id == cid).values(status="online")
            )
        db.commit()


            
    except Exception as e:
        logger.error(f"Failed to auto-resume camera streams on startup: {e}")
    finally:
        db.close()

    # 4. Fire Anvil Uplink cloud client loop
    start_anvil_uplink()

    yield  # Hand over control to FastAPI request engine

    # ==========================================
    # SHUTDOWN ROUTINES
    # ==========================================
    logger.info("Initializing VigilAI Server Shutdown sweeps...")
    
    # 1. Stop background processing loops
    detection_manager.stop_pipeline()
    alert_coordinator.stop_coordinator()
    
    # Stop cleanup daemons
    recording_manager.shutdown_all()
    clip_extractor.stop_scheduler()
    
    # Stop cameras captures
    camera_manager.shutdown_all()
    
    # Join threads to guarantee graceful shutdown (max 3 seconds delay)
    detection_manager.join(timeout=3.0)
    alert_coordinator.join(timeout=3.0)
    
    logger.info("VigilAI Shutdown sequence completed. All threads joined successfully.")


# Create FastAPI Instance
app = FastAPI(
    title="VigilAI Surveillance System Backend",
    description="Real-time behavior anomaly detection, circular storage recording, and multi-channel safety alerts.",
    version="1.0.0",
    lifespan=lifespan
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"success": False, "message": "Internal server error occurred."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": str(exc.detail)}
    )


# ==========================================
# CORS MIDDLEWARE
# ==========================================
# Configured as permissive to allow direct connections from Mobile Expo clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# STATIC FILES SERVING ENDPOINTS
# ==========================================
# Mount folders to expose face-blurred JPEGs and recorded MP4 fragments directly to URLs
app.mount("/api/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")
app.mount("/api/clips", StaticFiles(directory=str(CLIPS_DIR)), name="clips")

# ==========================================
# REST ROUTERS BINDING
# ==========================================
app.include_router(auth_router, prefix="/api/auth", tags=["User & Authentication"])
app.include_router(cameras_router, prefix="/api/cameras", tags=["Camera Operations"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["Incident & Alerts Log"])
app.include_router(analytics_router, prefix="/api/analytics", tags=["Statistical Analytics"])
app.include_router(recordings_router, prefix="/api/recordings", tags=["Continuous Recording Archives"])
app.include_router(ws_router, prefix="/api/ws", tags=["Real-time WebSockets"])
app.include_router(settings_router, prefix="/api/settings", tags=["User Settings Sync"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["Home Dashboard Stats"])


@app.get("/", tags=["System Diagnostics"])
async def root_diagnostic():
    """
    Returns server uptime diagnostic variables, database engines status, and counts of active pipelines.
    """
    camera_manager = CameraManager()
    active_cams = list(camera_manager.active_threads.keys())
    
    # Fetch offline placeholder image availability
    placeholder_exists = os.path.exists("offline_placeholder.jpg")
    
    return {
        "status": "online",
        "service": "VigilAI Backend API Engine",
        "active_monitored_cameras_count": len(active_cams),
        "active_camera_ids": active_cams,
        "directories_health": {
            "recordings_dir_exists": RECORDINGS_DIR.exists(),
            "clips_dir_exists": CLIPS_DIR.exists(),
            "snapshots_dir_exists": SNAPSHOTS_DIR.exists()
        },
        "media_placeholder_loaded": placeholder_exists,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }


@app.get("/health", tags=["System Diagnostics"])
async def health_check():
    """
    Render and orchestration health check point.
    Tests database availability and returns 200 OK.
    """
    try:
        # Simple DB ping using the shared engine
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {str(e)}"
        
    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }


if __name__ == "__main__":
    import uvicorn
    # Default local dev port execution
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
