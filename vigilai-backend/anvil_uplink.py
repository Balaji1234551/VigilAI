"""
Anvil Uplink Cloud Connector Module for VigilAI.
Establishes bi-directional communication between the local Python backend
and the Anvil Works cloud-hosted user dashboard.
Exposes callable hooks to fetch cameras, log events, and retrieve database analytics.
"""
import logging
import threading
import time
from typing import List, Dict, Any, Optional
from datetime import datetime
import anvil.server

from config import ANVIL_UPLINK_KEY
from database.db import SessionLocal
from database.crud import (
    get_cameras, create_camera, delete_camera, get_camera, update_camera_status,
    get_alerts, get_alert_by_id, resolve_alert, get_alerts_summary,
    get_alerts_by_type, get_alerts_by_camera
)
from video.camera_manager import CameraManager
from video.recorder import RecordingManager

logger = logging.getLogger("VigilAI.Anvil")


# ==========================================
# MODEL SERIALIZATION UTILITIES
# ==========================================

def serialize_camera(cam) -> Dict[str, Any]:
    """Converts a Camera SQLAlchemy instance to a standard Python dictionary."""
    return {
        "id": cam.id,
        "user_id": cam.user_id,
        "name": cam.name,
        "location": cam.location,
        "type": cam.type,
        "url": cam.url,
        "status": cam.status,
        "settings": cam.settings,
        "created_at": cam.created_at.isoformat() if cam.created_at else None
    }


def serialize_alert(alert) -> Dict[str, Any]:
    """Converts an Alert SQLAlchemy instance to a standard Python dictionary."""
    return {
        "id": alert.id,
        "camera_id": alert.camera_id,
        "user_id": alert.user_id,
        "anomaly_type": alert.anomaly_type,
        "confidence": alert.confidence,
        "snapshot_path": alert.snapshot_path,
        "clip_path": alert.clip_path,
        "timestamp": alert.timestamp.isoformat() if alert.timestamp else None,
        "status": alert.status,
        "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        "alert_sent": alert.alert_sent
    }


# ==========================================
# ANVIL SERVER CALLABLE INTERFACES
# ==========================================

@anvil.server.callable
def get_anvil_cameras(user_id: int) -> List[Dict[str, Any]]:
    """
    Called from Anvil: Fetch all cameras and query live stream states.
    """
    db = SessionLocal()
    try:
        cameras = get_cameras(db, user_id)
        
        # Refresh states based on local active capture threads
        camera_manager = CameraManager()
        serialized_list = []
        for cam in cameras:
            thread = camera_manager.get_thread(cam.id)
            current_status = "online" if (thread and thread.is_connected) else "offline"
            
            if cam.status != current_status:
                update_camera_status(db, cam.id, current_status)
                cam.status = current_status
                
            serialized_list.append(serialize_camera(cam))
        return serialized_list
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in get_anvil_cameras: {e}")
        return []
    finally:
        db.close()


@anvil.server.callable
def add_anvil_camera(user_id: int, name: str, type: str, url: str, location: str = "Office") -> Dict[str, Any]:
    """
    Called from Anvil: Adds a new camera and instantly spins up background capturing.
    """
    db = SessionLocal()
    try:
        camera_data = {
            "name": name,
            "type": type,
            "url": url,
            "location": location,
            "settings": {
                "loiter_time": 30,
                "enabled_detections": ["FALL", "WEAPON", "FIGHT", "LOITERING"],
                "quiet_hours": {"enabled": False, "start": "22:00", "end": "06:00"}
            }
        }
        new_cam = create_camera(db, user_id, camera_data)
        
        # Boot capturing
        camera_manager = CameraManager()
        recorder_manager = RecordingManager(camera_manager)
        
        camera_manager.start_camera(new_cam.id, new_cam.name, new_cam.url)
        recorder_manager.start_recording(new_cam.id)
        
        update_camera_status(db, new_cam.id, "online")
        db.refresh(new_cam)
        
        logger.info(f"[Anvil Uplink] Dyn-added camera stream {new_cam.id} successfully.")
        return serialize_camera(new_cam)
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in add_anvil_camera: {e}")
        return {"error": str(e)}
    finally:
        db.close()


@anvil.server.callable
def delete_anvil_camera(user_id: int, camera_id: int) -> bool:
    """
    Called from Anvil: Stops capturing threads and deletes a camera record.
    """
    db = SessionLocal()
    try:
        cam = get_camera(db, camera_id)
        if not cam or cam.user_id != user_id:
            return False

        # Terminate active tasks
        camera_manager = CameraManager()
        recorder_manager = RecordingManager(camera_manager)
        
        recorder_manager.stop_recording(camera_id)
        camera_manager.stop_camera(camera_id)
        
        success = delete_camera(db, camera_id)
        return success
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in delete_anvil_camera: {e}")
        return False
    finally:
        db.close()


@anvil.server.callable
def get_anvil_alerts(
    user_id: int, 
    skip: int = 0, 
    limit: int = 20, 
    camera_id: Optional[int] = None, 
    anomaly_type: Optional[str] = "all", 
    status: Optional[str] = "all"
) -> List[Dict[str, Any]]:
    """
    Called from Anvil: Queries and serializes filtered security alerts.
    """
    db = SessionLocal()
    try:
        alerts = get_alerts(
            db, 
            user_id=user_id, 
            skip=skip, 
            limit=limit, 
            camera_id=camera_id, 
            anomaly_type=anomaly_type, 
            status=status
        )
        return [serialize_alert(a) for a in alerts]
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in get_anvil_alerts: {e}")
        return []
    finally:
        db.close()


@anvil.server.callable
def resolve_anvil_alert(user_id: int, alert_id: int) -> Optional[Dict[str, Any]]:
    """
    Called from Anvil: Mark a pending alert incident as resolved.
    """
    db = SessionLocal()
    try:
        alert = get_alert_by_id(db, alert_id)
        if not alert or alert.user_id != user_id:
            return None
        
        resolved = resolve_alert(db, alert_id)
        return serialize_alert(resolved)
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in resolve_anvil_alert: {e}")
        return None
    finally:
        db.close()


@anvil.server.callable
def get_anvil_analytics(user_id: int) -> Dict[str, Any]:
    """
    Called from Anvil: Pulls total metrics, counts by type, and counts by camera.
    """
    db = SessionLocal()
    try:
        summary = get_alerts_summary(db, user_id)
        by_type = get_alerts_by_type(db, user_id)
        by_camera = get_alerts_by_camera(db, user_id)
        
        return {
            "summary": summary,
            "by_type": by_type,
            "by_camera": by_camera
        }
    except Exception as e:
        logger.error(f"[Anvil Callable] Error in get_anvil_analytics: {e}")
        return {}
    finally:
        db.close()


@anvil.server.callable
def get_live_frame(camera_id: int) -> Optional[anvil.BlobMedia]:
    """
    Called from Anvil: Captures the latest active frame from CameraManager,
    converts to JPEG BlobMedia, and returns it over the web to the Anvil frontend.
    Falls back gracefully to offline placeholder image if stream is offline.
    """
    import cv2
    import os
    camera_manager = CameraManager()
    
    # Try fetching frame from active thread
    frame = camera_manager.get_frame(camera_id)
    if frame is None:
        placeholder_path = "offline_placeholder.jpg"
        if os.path.exists(placeholder_path):
            try:
                with open(placeholder_path, "rb") as f:
                    return anvil.BlobMedia("image/jpeg", f.read(), name=f"offline_{camera_id}.jpg")
            except Exception as ex:
                logger.error(f"[Anvil Callable] Failed reading offline placeholder: {ex}")
        return None
        
    try:
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            return anvil.BlobMedia("image/jpeg", buffer.tobytes(), name=f"live_{camera_id}.jpg")
    except Exception as e:
        logger.error(f"[Anvil Callable] Error encoding live frame: {e}")
    return None


def trigger_anvil_web_alert(anomaly_type: str, camera_name: str):
    """
    Triggers a live pop-up alert on all connected Anvil client dashboards.
    """
    if not ANVIL_UPLINK_KEY:
        return
    try:
        # Call the registered function in the Anvil app
        anvil.server.call('trigger_web_alert', f"🚨 CRITICAL {anomaly_type} detected on camera '{camera_name}'!")
        logger.info(f"[Anvil Uplink] Triggered Anvil web alert for {anomaly_type}")
    except Exception as e:
        logger.debug(f"[Anvil Uplink] Silent warning: Could not dispatch trigger_web_alert (no active clients): {e}")


# ==========================================
# BACKGROUND CONNECTION SCHEDULER
# ==========================================

def start_anvil_uplink():
    """
    Attempts to establish connection with the Anvil Works cloud server in a background thread.
    Does not halt main app execution if credentials are unconfigured or offline.
    """
    if not ANVIL_UPLINK_KEY:
        logger.warning(
            "Anvil Uplink Key is empty in configuration settings. Cloud callables are disabled."
        )
        return

    def connection_loop():
        """
        Maintains connection. Automatically attempts reconnects if disconnected.
        """
        logger.info("Initializing Anvil Uplink background connector...")
        while True:
            try:
                # Initiate Uplink connection (blocks until connection is made or timeout)
                anvil.server.connect(ANVIL_UPLINK_KEY)
                logger.info("Anvil Uplink connected successfully! Exposing Python backend callables.")
                
                # wait_forever blocks until connection is terminated or program exits
                anvil.server.wait_forever()
                
            except Exception as e:
                logger.error(f"Anvil Uplink connection lost or failed: {e}. Re-attempting in 15 seconds...")
                time.sleep(15)

    # Boot connection task inside a daemon thread
    uplink_thread = threading.Thread(target=connection_loop, name="AnvilUplinkThread", daemon=True)
    uplink_thread.start()
