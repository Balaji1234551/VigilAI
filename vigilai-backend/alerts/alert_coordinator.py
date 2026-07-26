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
from database.db import SessionLocal
from database.crud import get_camera, get_user_by_id, get_contacts, create_alert, update_alert_sent_status
from video.snapshot import capture_blurred_snapshot
from video.clip_extractor import ClipExtractor
from alerts.email_alert import send_email_alert
from alerts.sms_alert import send_sms_alert
from alerts.push_alert import send_push_notification

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
            
            # Add user's primary login phone
            if user.phone:
                phone_numbers.append(user.phone)
                
            # We will also add the secondary SMS from preferences later after loading user_prefs

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
            try:
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
                logger.info(f"✅ [AlertCoordinator] Database Updated: Logged Alert ID {alert_record.id}")
            except Exception as e:
                logger.error(f"❌ [AlertCoordinator] Database Updated FAIL: {e}")
                return

            # --- WEBSOCKET BROADCAST ---
            import json
            from api.ws import manager
            
            ws_payload = {
                "type": "NEW_ALERT",
                "alert": {
                    "id": alert_record.id,
                    "camera_id": camera_id,
                    "camera_name": camera.name,
                    "anomaly_type": anomaly_type,
                    "confidence": confidence,
                    "timestamp": alert_record.timestamp.isoformat() + "Z",
                    "snapshot_path": snapshot_url_str,
                    "clip_path": clip_url_str
                }
            }
            try:
                manager.broadcast_sync(json.dumps(ws_payload))
                logger.info("✅ [AlertCoordinator] Dashboard Updated: Websocket broadcast successful")
            except Exception as e:
                logger.error(f"❌ [AlertCoordinator] Dashboard Updated FAIL: {e}")
            # ---------------------------

            # 4. RESOLVE USER NOTIFICATION PREFERENCES & QUIET HOURS
            user_prefs = user.notification_preferences or {
                "alerts": {"fall": True, "weapon": True, "fight": True, "loitering": False},
                "delivery": {"push": True, "email": True, "sms": False, "quietHours": False}
            }
            delivery_prefs = user_prefs.get("delivery", {})
            alerts_prefs = user_prefs.get("alerts", {})
            
            is_quiet_hours = False
            if delivery_prefs.get("quietHours", False):
                is_quiet_hours = self._check_quiet_hours({"enabled": True, "start": "22:00", "end": "06:00"})
                
            secondary_sms = delivery_prefs.get("secondarySms")
            if secondary_sms:
                phone_numbers.append(secondary_sms)
            
            phone_numbers = list(set(phone_numbers))
            
            anomaly_key = anomaly_type.lower()
            if anomaly_key in alerts_prefs and not alerts_prefs[anomaly_key]:
                logger.info(f"[AlertCoordinator] Anomaly type {anomaly_type} disabled in user global settings. Suppressing alerts.")
                return

            priority_level = self._get_priority_level(anomaly_type)

            email_sent = False
            sms_sent = False
            push_sent = False

            should_suppress_intrusive = is_quiet_hours and (priority_level != "critical")
            
            user_wants_push = delivery_prefs.get("push", True)
            user_wants_email = delivery_prefs.get("email", True)
            user_wants_sms = delivery_prefs.get("sms", False)

            # --- Push Notification Channel ---
            if user.fcm_token and user_wants_push:
                try:
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
                    logger.info("✅ [AlertCoordinator] Push notification sent")
                except Exception as e:
                    logger.error(f"❌ [AlertCoordinator] Push notification sent FAIL: {e}")

            # --- Email Channel ---
            if priority_level in ["critical", "medium"] and not should_suppress_intrusive and user_wants_email:
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
            if priority_level in ["critical", "high"] and not should_suppress_intrusive:
                try:
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
                    logger.info("✅ [AlertCoordinator] SMS sent")
                except Exception as e:
                    logger.error(f"❌ [AlertCoordinator] SMS sent FAIL: {e}")

            # 6. UPDATE DB DELIVERY STATUS
            if email_sent or sms_sent or push_sent:
                update_alert_sent_status(db, alert_record.id, 1)
                logger.info(f"[AlertCoordinator] Dispatched notifications for Alert ID {alert_record.id}")
            else:
                logger.info(f"[AlertCoordinator] Notifications suppressed or skipped for Alert ID {alert_record.id}")

        except Exception as err:
            logger.error(f"[AlertCoordinator] Database processing loop failed: {err}", exc_info=True)
        finally:
            db.close()

    def _get_priority_level(self, atype: str) -> str:
        """
        Maps anomaly type to severity tiers.
        Critical/High: Send SMS + Email + Push
        Medium: Send Email + Push
        Low: Send Push only
        """
        if atype in ["WEAPON", "FIRE"]:
            return "critical"
        elif atype in ["FIGHT", "FALL", "INTRUSION"]:
            return "high"
        elif atype in ["LOITERING", "RUNNING", "CROWD", "ABANDONED_OBJECT"]:
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
