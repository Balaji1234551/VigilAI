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

email_rate_limit_cache: Dict[int, float] = {}
rate_limit_lock = threading.Lock()

class EmailSenderThread(threading.Thread):
    def __init__(self, to_emails: List[str], subject: str, html_content: str, snapshot_path: Optional[Path] = None):
        super().__init__()
        self.to_emails = to_emails
        self.subject = subject
        self.html_content = html_content
        self.snapshot_path = snapshot_path
        self.daemon = True

    def run(self):
        valid_emails = [e for e in self.to_emails if e and e.strip()]
        if not valid_emails:
            logger.warning("No valid email addresses provided. Skipping email alert.")
            return
            
        emails_str = ", ".join(valid_emails)
        msg = MIMEMultipart("related")
        msg["Subject"] = self.subject
        msg["From"] = EMAIL_ADDRESS or "vigilai-no-reply@localhost"
        msg["To"] = emails_str

        msg_alternative = MIMEMultipart("alternative")
        msg.attach(msg_alternative)
        msg_alternative.attach(MIMEText(self.html_content, "html"))

        if self.snapshot_path and Path(self.snapshot_path).is_file():
            try:
                with open(self.snapshot_path, "rb") as img_file:
                    img_data = img_file.read()
                msg_image = MIMEImage(img_data)
                msg_image.add_header("Content-ID", "<snapshot_cid>")
                msg_image.add_header("Content-Disposition", "inline", filename=Path(self.snapshot_path).name)
                msg.attach(msg_image)
            except Exception as e:
                logger.error(f"[Email Worker] Failed to attach inline screenshot file: {e}")

        if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
            logger.error("============= MOCK EMAIL SENT =============")
            logger.error(f"To: {emails_str}")
            logger.error(f"Subject: {self.subject}")
            logger.error("HTML Content:")
            logger.error(self.html_content)
            logger.error("===========================================")
            return

        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
                server.starttls()
                server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
                server.sendmail(msg["From"], valid_emails, msg.as_string())
                server.quit()
                logger.info(f"[Email Worker] Alert email dispatched successfully to {emails_str}!")
                break
            except Exception as e:
                if attempt < max_retries:
                    time.sleep(5)
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
    now = time.time()
    
    with rate_limit_lock:
        last_sent = email_rate_limit_cache.get(camera_id, 0.0)
        if now - last_sent < 60.0:
            return False
        email_rate_limit_cache[camera_id] = now

    subject = f"🚨 VigilAI Emergency Alert - {anomaly_type}"
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conf_pct = int(confidence * 100)

    # Convert absolute uploads/ path to api download path if possible
    download_link = f"http://localhost:8000/api/cameras/{camera_id}/report"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; color: #333333; line-height: 1.6; }}
            .container {{ padding: 20px; max-width: 600px; }}
            .snapshot-img {{ max-width: 100%; height: auto; margin-top: 20px; border: 2px solid #ff0000; }}
            .footer {{ margin-top: 30px; font-size: 12px; color: #888888; }}
        </style>
    </head>
    <body>
        <div class="container">
            <p><strong>🚨 VigilAI Emergency Alert 🚨</strong></p>
            <p><strong>Alert Type:</strong> {anomaly_type}</p>
            <p><strong>Detected Object:</strong> {anomaly_type}</p>
            <p><strong>Confidence Score:</strong> {conf_pct}%</p>
            <p><strong>Detection Time:</strong> {current_time}</p>
            <p><strong>Video Name:</strong> {camera_name}</p>
            <p><strong>Download Processed Report:</strong> <a href="{download_link}">{download_link}</a></p>
            
            <p><strong>Detection Screenshot:</strong></p>
    """

    actual_snapshot_path = snapshot_path
    if snapshot_path and snapshot_path.startswith("/static"):
        actual_snapshot_path = snapshot_path.replace("/static", "uploads")
    
    if actual_snapshot_path and Path(actual_snapshot_path).is_file():
        html_content += '<img src="cid:snapshot_cid" alt="Evidence Snapshot" class="snapshot-img" />'
        
    html_content += """
        </div>
    </body>
    </html>
    """

    email_thread = EmailSenderThread(
        to_emails=to_emails,
        subject=subject,
        html_content=html_content,
        snapshot_path=actual_snapshot_path
    )
    email_thread.start()
    return True
