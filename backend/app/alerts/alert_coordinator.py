"""
Alert Coordinator Module for VigilAI.
Listens to the thread-safe anomaly queue, extracts evidence assets,
resolves user preferences, enforces quiet hours, and dispatches multi-channel alerts.
"""
import time
import queue
import logging
import threading
from datetime import datetime
from typing import Dict, List, Optional, Any
from app.database import SessionLocal
from app.crud import get_camera, get_user_by_id, get_contacts, create_alert, update_alert_sent_status
from app.video.snapshot import capture_blurred_snapshot
from app.video.clip_extractor import ClipExtractor
from app.alerts.email_alert import send_email_alert
from app.alerts.sms_alert import send_sms_alert
from app.alerts.push_alert import send_push_notification

logger = logging.getLogger("VigilAI.AlertCoordinator")


class AlertCoordinator(threading.Thread):
    """
    Consumer thread that parses incoming detection event queues,
    generates snapshot/clip evidence files, checks quiet hours, and fires channels.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self, alert_queue: Optional[queue.Queue] = None, clip_extractor: Optional[ClipExtractor] = None):
        if self.initialized:
            return
        super().__init__()
        self.daemon = True
        self.alert_queue = alert_queue or queue.Queue()
        self.clip_extractor = clip_extractor
        self.is_running = False
        self.initialized = True

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

            # 2. GENERATE EVIDENCE ASSETS (Snapshot & Clip)
            # Create Face-Blurred Snapshot image
            snapshot_path = capture_blurred_snapshot(camera_id, raw_frame, anomaly_type)
            snapshot_url_str = None
            if snapshot_path:
                # Formulate relative API endpoint URL
                snapshot_url_str = f"http://localhost:8000/api/snapshots/{camera_id}/{snapshot_path.name}"

            # Create 30-Second Clip (T-10s history + T+20s future)
            clip_path = None
            if self.clip_extractor:
                clip_path = self.clip_extractor.trigger_incident_clip(camera_id, anomaly_type)
            
            clip_url_str = None
            if clip_path:
                clip_url_str = f"http://localhost:8000/api/clips/{camera_id}/{clip_path.name}"

            # 3. SAVE ALERT RECORD TO SQLITE DB
            alert_db_data = {
                "camera_id": camera_id,
                "user_id": user.id,
                "anomaly_type": anomaly_type,
                "confidence": confidence,
                "snapshot_path": str(snapshot_path) if snapshot_path else None,
                "clip_path": str(clip_path) if clip_path else None,
                "timestamp": datetime.utcnow(),
                "alert_sent": 0
            }
            alert_record = create_alert(db, alert_db_data)
            logger.info(f"[AlertCoordinator] Logged Alert ID {alert_record.id} to database.")

            # 4. RESOLVE USER NOTIFICATION PREFERENCES & QUIET HOURS
            user_settings = camera.settings or {}  # Retrieve camera configurations
            
            # Check quiet hours (e.g. {"quiet_hours": {"enabled": true, "start": "22:00", "end": "06:00"}})
            is_quiet_hours = self._check_quiet_hours(user_settings.get("quiet_hours", {}))
            
            # Check if notifications are disabled globally for this type in settings
            enabled_detections = user_settings.get("enabled_detections", ["FALL", "WEAPON", "FIGHT", "LOITERING"])
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

            email_sent = False
            sms_sent = False
            push_sent = False

            # During quiet hours, we suppress intrusive SMS and Emails unless it is a CRITICAL (Weapon/Fire) anomaly
            should_suppress_intrusive = is_quiet_hours and (priority_level != "critical")
            
            # --- Push Notification Channel ---
            # Active across all priority tiers
            if user.fcm_token:
                push_sent = send_push_notification(
                    fcm_token=user.fcm_token,
                    camera_id=camera_id,
                    camera_name=camera.name,
                    anomaly_type=anomaly_type,
                    confidence=confidence,
                    timestamp=timestamp_str,
                    alert_id=alert_record.id,
                    snapshot_url=snapshot_url_str
                )

            # --- Email Channel ---
            # Active for CRITICAL and MEDIUM tiers
            if priority_level in ["critical", "medium"] and not should_suppress_intrusive:
                email_sent = send_email_alert(
                    to_email=user.email,
                    camera_id=camera_id,
                    camera_name=camera.name,
                    camera_location=camera.location or "Unknown",
                    anomaly_type=anomaly_type,
                    confidence=confidence,
                    timestamp=timestamp_str,
                    alert_id=alert_record.id,
                    snapshot_path=snapshot_path
                )

            # --- SMS Channel ---
            # Active for CRITICAL and HIGH tiers
            if priority_level in ["critical", "high"] and not should_suppress_intrusive:
                sms_sent = send_sms_alert(
                    to_numbers=phone_numbers,
                    camera_id=camera_id,
                    camera_name=camera.name,
                    anomaly_type=anomaly_type,
                    confidence=confidence,
                    timestamp=timestamp_str,
                    alert_id=alert_record.id,
                    short_link=clip_url_str
                )

            # 6. UPDATE DB DELIVERY STATUS
            # Mark successfully dispatched (alert_sent=1) if at least one channel delivered
            if email_sent or sms_sent or push_sent:
                update_alert_sent_status(db, alert_record.id, 1)
                logger.info(f"[AlertCoordinator] Dispatched notifications for Alert ID {alert_record.id}")
            else:
                logger.info(f"[AlertCoordinator] Notifications suppressed or skipped for Alert ID {alert_record.id}")

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
