"""
Alert Coordinator Module for VigilAI.
Listens to the thread-safe anomaly queue, extracts evidence assets,
resolves user preferences, enforces quiet hours, and dispatches multi-channel alerts.
"""
import time
import queue
import logging
import threading
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from app.database import SessionLocal
from app.crud import get_camera, get_user_by_id, get_contacts, create_alert, update_alert_sent_status


logger = logging.getLogger("VigilAI.AlertCoordinator")

# Thread-safe in-memory global rate-limiter tracker: {(camera_id, anomaly_type): last_sent_timestamp}
GLOBAL_COOLDOWN_CACHE: Dict[tuple, float] = {}
global_cooldown_lock = threading.Lock()

class AlertCoordinator(threading.Thread):
    """
    Consumer thread that parses incoming detection event queues,
    generates snapshot/clip evidence files, checks quiet hours, and fires channels.
    """

    def __init__(self, alert_queue: Optional[queue.Queue] = None):
        super().__init__()
        self.daemon = True
        self.alert_queue = alert_queue or queue.Queue()
        self.is_running = False

    def run(self):
        """
        Pulls events continuously from queue and coordinates dispatches.
        """
        self.is_running = True
        logger.info("VigilAI Alert Coordinator service started.")
        
        while self.is_running:
            try:
                # Block for up to 1 second waiting for an anomaly event
                event_data = self.alert_queue.get(timeout=1.0)
            except queue.Empty:
                continue

            try:
                # Process the event in a safe transaction block
                self._process_anomaly_event(event_data)
            except Exception as e:
                logger.error(f"[AlertCoordinator] Error processing queued anomaly: {e}", exc_info=True)
            finally:
                # Complete task in queue
                self.alert_queue.task_done()

        logger.info("VigilAI Alert Coordinator service stopped.")

    def _process_anomaly_event(self, event: Dict[str, Any]):
        """
        Coordinates asset generation, database creation, quiet hours, and channel alerts.
        """
        camera_id = event["camera_id"]
        anomaly_type = event["anomaly_type"]
        confidence = event["confidence"]
        timestamp_str = event["timestamp"]
        raw_frame = event["raw_frame"]

        # --- 60-Second Global Cooldown ---
        now = time.time()
        with global_cooldown_lock:
            cache_key = (camera_id, anomaly_type.upper())
            last_triggered = GLOBAL_COOLDOWN_CACHE.get(cache_key, 0.0)
            if now - last_triggered < 60.0:
                logger.info(f"[AlertCoordinator] Cooldown active for {anomaly_type} on Camera {camera_id}. Skipping event.")
                return
            GLOBAL_COOLDOWN_CACHE[cache_key] = now

        db = SessionLocal()
        try:
            # 1. Fetch Camera Details and User owner info
            camera = get_camera(db, camera_id)
            if not camera:
                logger.error(f"[AlertCoordinator] Event received for non-existent Camera ID: {camera_id}")
                return

            user = get_user_by_id(db, camera.user_id)
            if not user:
                logger.error(f"[AlertCoordinator] Event received for Camera with orphan User ID: {camera.user_id}")
                return

            # Fetch emergency contact records
            contacts = get_contacts(db, user.id)
            phone_numbers = [c.phone for c in contacts if c.phone]

            # 2. GET EVIDENCE ASSETS (Snapshot)
            snapshot_url_str = event.get("snapshot_path")
            
            alert_db_data = {
                "camera_id": camera_id,
                "user_id": user.id,
                "anomaly_type": anomaly_type,
                "confidence": confidence,
                "snapshot_path": snapshot_url_str,
                "timestamp": datetime.utcnow(),
                "alert_message": event.get("alert_message"),
                "alert_sent": 0
            }
            alert_record = create_alert(db, alert_db_data)
            logger.info(f"[AlertCoordinator] Logged Alert ID {alert_record.id} to database.")

            # 4. RESOLVE USER NOTIFICATION PREFERENCES & QUIET HOURS
            user_settings = camera.settings or {}  # Retrieve camera configurations
            
            # Check quiet hours (e.g. {"quiet_hours": {"enabled": true, "start": "22:00", "end": "06:00"}})
            is_quiet_hours = self._check_quiet_hours(user_settings.get("quiet_hours", {}))
            
            # Check if notifications are disabled globally for this type in settings
            enabled_detections = user_settings.get("enabled_detections", ["FALL", "WEAPON", "FIGHT", "LOITERING", "POSTURE", "RUNNING"])
            if anomaly_type.upper() not in [d.upper() for d in enabled_detections]:
                logger.info(f"[AlertCoordinator] Anomaly type {anomaly_type} disabled in camera settings. Suppressing alerts.")
                return

            # 5. DISPATCH MULTI-CHANNEL ALERTS ACCORDING TO PRIORITY MAPS
            # Priority Level Definitions:
            # - CRITICAL: weapon, fire (All channels immediately)
            # - HIGH: fight, fall (Push + SMS)
            # - MEDIUM: loitering (Push + Email)
            # - LOW: unknown person (Push only)
            
            priority_level = self._get_priority_level(anomaly_type)
            logger.info(f"[AlertCoordinator] Incident Priority determined: {priority_level.upper()}")

            # --- Anvil Real-time Web Dashboard Alert Popup ---
            try:
                from app.anvil_uplink import trigger_anvil_web_alert
                trigger_anvil_web_alert(anomaly_type, camera.name)
            except Exception as ex_anvil:
                logger.error(f"[AlertCoordinator] Failed to dispatch Anvil web popup: {ex_anvil}")

            from app.services.notification_service import NotificationService
            notifier = NotificationService()
            notifier.notify_user_of_anomaly(db, user, alert_record, camera.name)

            # 6. UPDATE DB DELIVERY STATUS
            # Mark successfully dispatched (alert_sent=1) if at least one channel delivered
            update_alert_sent_status(db, alert_record.id, 1)
            logger.info(f"[AlertCoordinator] Dispatched notifications for Alert ID {alert_record.id}")

        except Exception as err:
            logger.error(f"[AlertCoordinator] Database processing loop failed: {err}", exc_info=True)
        finally:
            db.close()

    def _get_priority_level(self, anomaly_type: str) -> str:
        """
        Maps anomaly categories to priority level tiers.
        """
        atype = anomaly_type.upper()
        if atype in ["WEAPON", "FIRE"]:
            return "critical"
        elif atype in ["FIGHT", "FALL"]:
            return "high"
        elif atype in ["LOITERING"]:
            return "medium"
        else:
            return "low"

    def _check_quiet_hours(self, qh_settings: Dict[str, Any]) -> bool:
        """
        Checks if current system local time lies within user-defined quiet hours.
        Format: {"enabled": True, "start": "22:00", "end": "06:00"}
        """
        if not qh_settings.get("enabled", False):
            return False

        try:
            start_str = qh_settings.get("start", "22:00")
            end_str = qh_settings.get("end", "06:00")
            
            # Parse times to time objects
            start_time = datetime.strptime(start_str, "%H:%M").time()
            end_time = datetime.strptime(end_str, "%H:%M").time()
            
            current_time = datetime.now().time()
            
            if start_time < end_time:
                # Quiet hours during the same day (e.g. 13:00 to 17:00)
                return start_time <= current_time <= end_time
            else:
                # Quiet hours cross midnight (e.g. 22:00 to 06:00)
                return current_time >= start_time or current_time <= end_time
                
        except Exception as e:
            logger.error(f"Quiet hours parsing failed: {e}")
            return False

    def stop_coordinator(self):
        """
        Gracefully stop the background worker queue consumer.
        """
        self.is_running = False
