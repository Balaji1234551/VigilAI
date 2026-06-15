"""
Firebase FCM Push Notification Module for VigilAI.
Dispatches high-priority mobile push notifications using the Firebase Admin SDK.
Safely falls back to simulation logging if JSON credential files are missing.
"""
import os
import logging
import threading
from typing import Dict, Any, Optional
import firebase_admin
from firebase_admin import credentials, messaging
from app.config import FIREBASE_CREDENTIALS_PATH

logger = logging.getLogger("VigilAI.PushAlert")

# Firebase App Safe Initialization
# Prevents duplicate app declaration crashes and handles missing config keys gracefully
firebase_initialized = False

if os.path.exists(FIREBASE_CREDENTIALS_PATH):
    try:
        firebase_admin.get_app()
        firebase_initialized = True
        logger.info("Firebase Admin SDK is already initialized.")
    except ValueError:
        try:
            cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)
            firebase_initialized = True
            logger.info(f"Firebase Admin SDK initialized successfully using certificate from '{FIREBASE_CREDENTIALS_PATH}'")
        except Exception as e:
            logger.error(f"Firebase Admin SDK initialization failed: {e}")
else:
    logger.warning(
        f"Firebase credentials not found at: '{FIREBASE_CREDENTIALS_PATH}'. Push notifications will run in SIMULATION/MOCK mode."
    )


class PushSenderThread(threading.Thread):
    """
    Background worker thread to dispatch Firebase notifications without hindering visual frame pipelines.
    """
    def __init__(self, fcm_token: str, title: str, body: str, metadata: Dict[str, str], priority: str):
        super().__init__()
        self.fcm_token = fcm_token
        self.title = title
        self.body = body
        self.metadata = metadata
        self.priority = priority
        self.daemon = True

    def run(self):
        """
        Transmits notification payload via Firebase FCM servers.
        """
        if not firebase_initialized:
            logger.info(
                f"[FCM Mock Dispatch] Token: {self.fcm_token[:10]}... | Title: {self.title} | Body: {self.body} | Priority: {self.priority}"
            )
            return

        try:
            # 1. Structure platform configurations
            # Android specifications: Map priority level strings to 'high' or 'normal'
            android_priority = "high" if self.priority.lower() == "high" else "normal"
            android_config = messaging.AndroidConfig(
                priority=android_priority,
                notification=messaging.AndroidNotification(sound="default")
            )

            # Apple iOS specifications
            apns_headers = {"apns-priority": "10" if android_priority == "high" else "5"}
            apns_config = messaging.APNSConfig(
                headers=apns_headers,
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default", content_available=True)
                )
            )

            # 2. Assemble Message
            message = messaging.Message(
                notification=messaging.Notification(
                    title=self.title,
                    body=self.body
                ),
                data=self.metadata,
                token=self.fcm_token,
                android=android_config,
                apns=apns_config
            )

            # 3. Transmit message
            logger.info(f"[FCM Worker] Sending push message to token ending in {self.fcm_token[-8:]}...")
            response = messaging.send(message)
            logger.info(f"[FCM Worker] Push notification sent successfully! Server Response: {response}")

        except Exception as e:
            logger.error(f"[FCM Worker Error] Push notification delivery failed: {e}")


def send_push_notification(
    fcm_token: str, 
    camera_id: int, 
    camera_name: str, 
    anomaly_type: str, 
    confidence: float, 
    timestamp: str, 
    alert_id: int,
    snapshot_url: Optional[str] = None
) -> bool:
    """
    Assembles notification content, prioritizes according to anomaly severity,
    and runs the background dispatcher thread.
    Returns True if successfully triggered.
    """
    if not fcm_token:
        logger.info(f"[FCM Alert Cam {camera_id}] User token is empty. Push notification suppressed.")
        return False

    # Standard Title and Message formatting
    # title: "⚠️ VIGILAI ALERT"
    # body: "[ANOMALY TYPE] detected at [CAMERA NAME]"
    title = "⚠️ VIGILAI ALERT"
    body = f"{anomaly_type.upper()} detected at {camera_name}"

    # Priority mapping requested:
    # HIGH for weapon/fight alerts
    # NORMAL for loitering alerts (and falls fallback)
    priority = "high"
    if anomaly_type.upper() in ["LOITERING", "UNKNOWN PERSON"]:
        priority = "normal"

    # Assemble payload metadata dictionary (all values must be strings)
    metadata = {
        "alert_id": str(alert_id),
        "camera_id": str(camera_id),
        "anomaly_type": str(anomaly_type),
        "confidence": f"{confidence:.2%}",
        "snapshot_url": str(snapshot_url or f"http://localhost:8000/api/alerts/{alert_id}/snapshot"),
        "timestamp": str(timestamp)
    }

    # Spin non-blocking sender thread
    push_thread = PushSenderThread(
        fcm_token=fcm_token,
        title=title,
        body=body,
        metadata=metadata,
        priority=priority
    )
    push_thread.start()
    return True
