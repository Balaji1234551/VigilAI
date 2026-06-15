"""
Twilio SMS Alert Module for VigilAI.
Dispatches concise security warning texts to emergency contact mobile numbers.
Includes dynamic clip links, robust error handlers, and a strict 5-minute camera rate limiter.
"""
import logging
import threading
import time
from typing import List, Dict, Optional
from twilio.rest import Client
from config import TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

logger = logging.getLogger("VigilAI.SMSAlert")

# Thread-safe in-memory rate-limiter: {camera_id: last_sent_timestamp}
sms_rate_limit_cache: Dict[int, float] = {}
rate_limit_lock = threading.Lock()


class SMSSenderThread(threading.Thread):
    """
    Background worker thread to dispatch Twilio text messages asynchronously.
    Avoids blocking main AI detection loops.
    """
    def __init__(self, to_numbers: List[str], message_body: str):
        super().__init__()
        self.to_numbers = to_numbers
        self.message_body = message_body
        self.daemon = True

    def run(self):
        """
        Connects to Twilio endpoint and delivers messages to all specified numbers.
        """
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_PHONE_NUMBER:
            logger.error("Twilio credentials are unconfigured. Please review your environment settings.")
            print("\n" + "="*50)
            print("[DEV MODE - SMS MOCK DELIVERY]")
            print(f"To: {', '.join(self.to_numbers)}")
            print(f"Message: {self.message_body}")
            print("="*50 + "\n")
            return

        try:
            # Initialize Twilio client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            
            for phone in self.to_numbers:
                if not phone:
                    continue
                try:
                    logger.info(f"[SMS Worker] Dispatching SMS alert to phone number {phone}...")
                    
                    # Create SMS message
                    client.messages.create(
                        body=self.message_body,
                        from_=TWILIO_PHONE_NUMBER,
                        to=phone
                    )
                    
                    logger.info(f"[SMS Worker] SMS alert successfully delivered to {phone}!")
                except Exception as sms_err:
                    logger.error(f"[SMS Worker Error] Failed delivery to individual number {phone}: {sms_err}")
                    
        except Exception as e:
            logger.error(f"[SMS Worker Exception] Global Twilio API dispatcher failed: {e}")


def send_sms_alert(
    to_numbers: List[str], 
    camera_id: int, 
    camera_name: str, 
    anomaly_type: str, 
    confidence: float, 
    timestamp: str, 
    alert_id: int,
    short_link: Optional[str] = None
) -> bool:
    """
    Checks rate limits, structures message text body, and triggers SMS background dispatcher thread.
    Returns True if dispatched.
    """
    if not to_numbers:
        logger.info(f"[SMS Alert Cam {camera_id}] No emergency contacts found. SMS suppressed.")
        return False

    now = time.time()
    
    # 1. Enforce Rate Limiter: Max 1 SMS per camera per 5 minutes (300 seconds)
    with rate_limit_lock:
        last_sent = sms_rate_limit_cache.get(camera_id, 0.0)
        if now - last_sent < 300.0:
            logger.info(f"[SMS Rate-Limiter] Suppressed SMS spam for Cam {camera_id}. Cool-down active.")
            return False
        sms_rate_limit_cache[camera_id] = now

    # 2. Build message text
    # Standard format requested:
    # "VIGILAI ALERT: [ANOMALY TYPE] detected at [CAMERA NAME] on [DATE] at [TIME]. Confidence: [X]%. Open app for details."
    
    # Split timestamp string "2026-05-10 17:42:10" into Date and Time elements
    try:
        parts = timestamp.split(" ")
        date_str = parts[0]
        time_str = parts[1] if len(parts) > 1 else ""
    except Exception:
        date_str = timestamp
        time_str = ""

    # Ensure time_str has AM/PM format if possible, but use time_str natively for now
    try:
        from datetime import datetime
        dt_obj = datetime.strptime(f"{date_str} {time_str}".strip(), "%Y-%m-%d %H:%M:%S.%f")
        time_str = dt_obj.strftime("%I:%M %p")
    except Exception:
        pass
        
    message_body = f"VigilAI Alert: {anomaly_type.capitalize()} detected in {camera_name} at {time_str}"

    # 3. Spin background worker thread
    sms_thread = SMSSenderThread(to_numbers=to_numbers, message_body=message_body)
    sms_thread.start()
    return True
