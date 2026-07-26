"""
SMTP Email Alert Module for VigilAI.
Constructs and dispatches emails using standard Gmail SMTP.
Features inline screenshot attachments (CID), a 3-try retry strategy,
and a 60-second camera-specific rate limiter.
"""
import smtplib
import logging
import threading
import time
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Optional, Dict, List
from app.config import SMTP_SERVER, SMTP_PORT, EMAIL_ADDRESS, EMAIL_PASSWORD

logger = logging.getLogger("VigilAI.EmailAlert")

# Thread-safe in-memory rate-limiter tracker: {camera_id: last_sent_timestamp}
email_rate_limit_cache: Dict[int, float] = {}
rate_limit_lock = threading.Lock()


class EmailSenderThread(threading.Thread):
    """
    Background worker thread to dispatch SMTP emails without blocking active frame analysis.
    Implements a 3-retry attempt loop with back-off.
    """
    def __init__(
        self, 
        to_emails: List[str], 
        subject: str, 
        html_content: str, 
        snapshot_path: Optional[Path] = None
    ):
        super().__init__()
        self.to_emails = to_emails
        self.subject = subject
        self.html_content = html_content
        self.snapshot_path = snapshot_path
        self.daemon = True

    def run(self):
        """
        Attempts SMTP delivery up to 3 times before raising a failure state.
        """
        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            logger.error("SMTP credentials are empty. Please check your config or .env environment variables.")
            return

        valid_emails = [e for e in self.to_emails if e and e.strip()]
        if not valid_emails:
            logger.warning("No valid email addresses provided. Skipping email alert.")
            return
            
        emails_str = ", ".join(valid_emails)

        # Prepare MIME Message container
        msg = MIMEMultipart("related")
        msg["Subject"] = self.subject
        msg["From"] = EMAIL_ADDRESS
        msg["To"] = emails_str

        # Attach HTML body
        msg_alternative = MIMEMultipart("alternative")
        msg.attach(msg_alternative)
        msg_alternative.attach(MIMEText(self.html_content, "html"))

        # Attach Inline Snapshot image using CID (Content-ID) mapping
        if self.snapshot_path and Path(self.snapshot_path).is_file():
            try:
                with open(self.snapshot_path, "rb") as img_file:
                    img_data = img_file.read()
                
                # Construct MIMEImage
                msg_image = MIMEImage(img_data)
                # Define CID tag accessed within HTML body <img src="cid:snapshot_cid" />
                msg_image.add_header("Content-ID", "<snapshot_cid>")
                msg_image.add_header("Content-Disposition", "inline", filename=Path(self.snapshot_path).name)
                msg.attach(msg_image)
                logger.info(f"[Email Worker] Embedded snapshot inline: {Path(self.snapshot_path).name}")
            except Exception as e:
                logger.error(f"[Email Worker] Failed to attach inline screenshot file {self.snapshot_path}: {e}")

        # Dispatch Loop (3 Attempts)
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"[Email Worker] Sending alert email to {emails_str} (Attempt {attempt}/{max_retries})...")
                
                # Connect using standard secure TLS handshake
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
                server.starttls()  # Upgrade connection to secure TLS encryption
                server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                server.sendmail(msg["From"], valid_emails, msg.as_string())
                server.quit()
                
                logger.info(f"[Email Worker] Alert email dispatched successfully to {emails_str}!")
                break  # Exit retry loop on success
            except Exception as e:
                logger.error(f"[Email Worker] Failed to send email (Attempt {attempt} failed): {e}")
                if attempt < max_retries:
                    time.sleep(5)  # Back-off before retrying
                else:
                    logger.error("[Email Worker] Max SMTP retries reached. Delivery failed permanently.")


def send_email_alert(
    to_emails: List[str], 
    camera_id: int, 
    camera_name: str, 
    camera_location: str, 
    anomaly_type: str, 
    confidence: float, 
    alert_id: int,
    snapshot_path: Optional[str] = None
) -> bool:
    """
    Validates rate limiting, builds the exact requested HTML email template,
    and dispatches a background thread.
    """
    now = time.time()
    
    # 1. Enforce Rate Limiter: Max 1 email per camera per 60 seconds (1 minute)
    with rate_limit_lock:
        last_sent = email_rate_limit_cache.get(camera_id, 0.0)
        if now - last_sent < 60.0:
            logger.info(f"[Email Rate-Limiter] Suppressed duplicate email for Cam {camera_id}. Cool-down active.")
            return False
        email_rate_limit_cache[camera_id] = now

    subject = "🚨 VigilAI Emergency Alert"
    
    current_date = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")
    conf_pct = int(confidence * 100)
    location_text = camera_location if camera_location else "N/A"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                color: #333333;
                line-height: 1.6;
            }}
            .container {{
                padding: 20px;
                max-width: 600px;
            }}
            .snapshot-img {{
                max-width: 100%;
                height: auto;
                margin-top: 20px;
                border: 2px solid #ff0000;
            }}
            .footer {{
                margin-top: 30px;
                font-size: 12px;
                color: #888888;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <p>Dear User,</p>
            <p>VigilAI has detected a dangerous incident.</p>
            
            <p><strong>Detection Type:</strong><br>{anomaly_type}</p>
            <p><strong>Camera:</strong><br>{camera_name}</p>
            <p><strong>Confidence:</strong><br>{conf_pct}%</p>
            <p><strong>Date:</strong><br>{current_date}</p>
            <p><strong>Time:</strong><br>{current_time}</p>
            <p><strong>Location:</strong><br>{location_text}</p>
            
            <p>Please check the VigilAI application immediately.</p>
            
            <p class="footer">This message was generated automatically by VigilAI.</p>
"""

    if snapshot_path and Path(snapshot_path).is_file():
        html_content += '<img src="cid:snapshot_cid" alt="Evidence Snapshot" class="snapshot-img" />'
        
    html_content += """
        </div>
    </body>
    </html>
    """

    # 3. Spin background worker thread
    email_thread = EmailSenderThread(
        to_emails=to_emails,
        subject=subject,
        html_content=html_content,
        snapshot_path=snapshot_path
    )
    email_thread.start()
    return True
