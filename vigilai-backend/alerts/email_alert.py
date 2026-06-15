"""
SMTP Email Alert Module for VigilAI.
Constructs and dispatches responsive, high-end HTML emails using standard Gmail SMTP.
Features dark neon cyan layouts, base64 inline screenshot attachments (CID),
a 3-try retry strategy, and a 2-minute camera-specific rate limiter.
"""
import smtplib
import logging
import threading
import time
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from pathlib import Path
from typing import Optional, Dict
from config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL

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
        to_email: str, 
        subject: str, 
        html_content: str, 
        snapshot_path: Optional[Path] = None
    ):
        super().__init__()
        self.to_email = to_email
        self.subject = subject
        self.html_content = html_content
        self.snapshot_path = snapshot_path
        self.daemon = True

    def run(self):
        """
        Attempts SMTP delivery up to 3 times before raising a failure state.
        """
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error("SMTP credentials are empty. Please check your config or .env environment variables.")
            return

        # Prepare MIME Message container
        msg = MIMEMultipart("related")
        msg["Subject"] = self.subject
        msg["From"] = SMTP_FROM_EMAIL or SMTP_USERNAME
        msg["To"] = self.to_email

        # Attach HTML body
        msg_alternative = MIMEMultipart("alternative")
        msg.attach(msg_alternative)
        msg_alternative.attach(MIMEText(self.html_content, "html"))

        # Attach Inline Snapshot image using CID (Content-ID) mapping
        if self.snapshot_path and self.snapshot_path.is_file():
            try:
                with open(self.snapshot_path, "rb") as img_file:
                    img_data = img_file.read()
                
                # Construct MIMEImage
                msg_image = MIMEImage(img_data)
                # Define CID tag accessed within HTML body <img src="cid:snapshot_cid" />
                msg_image.add_header("Content-ID", "<snapshot_cid>")
                msg_image.add_header("Content-Disposition", "inline", filename=self.snapshot_path.name)
                msg.attach(msg_image)
                logger.info(f"[Email Worker] Embedded snapshot inline: {self.snapshot_path.name}")
            except Exception as e:
                logger.error(f"[Email Worker] Failed to attach inline screenshot file {self.snapshot_path}: {e}")

        # Dispatch Loop (3 Attempts)
        max_retries = 3
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"[Email Worker] Sending alert email to {self.to_email} (Attempt {attempt}/{max_retries})...")
                
                # Connect using standard secure TLS handshake
                server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
                server.starttls()  # Upgrade connection to secure TLS encryption
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.sendmail(msg["From"], self.to_email, msg.as_string())
                server.quit()
                
                logger.info(f"[Email Worker] Alert email dispatched successfully to {self.to_email}!")
                break  # Exit retry loop on success
            except Exception as e:
                logger.error(f"[Email Worker] Failed to send email (Attempt {attempt} failed): {e}")
                if attempt < max_retries:
                    time.sleep(5)  # Back-off before retrying
                else:
                    logger.error("[Email Worker] Max SMTP retries reached. Delivery failed permanently.")


def send_email_alert(
    to_email: str, 
    camera_id: int, 
    camera_name: str, 
    camera_location: str, 
    anomaly_type: str, 
    confidence: float, 
    timestamp: str, 
    alert_id: int,
    snapshot_path: Optional[Path] = None
) -> bool:
    """
    Validates rate limiting, builds the neon cyan HTML email template,
    and dispatches a background thread.
    """
    now = time.time()
    
    # 1. Enforce Rate Limiter: Max 1 email per camera per 2 minutes (120 seconds)
    with rate_limit_lock:
        last_sent = email_rate_limit_cache.get(camera_id, 0.0)
        if now - last_sent < 120.0:
            logger.info(f"[Email Rate-Limiter] Suppressed spam email for Cam {camera_id}. Cool-down active.")
            return False
        email_rate_limit_cache[camera_id] = now

    # 2. Build beautiful Neon Cyan styled HTML template
    # Configurable alert badge coloring
    badge_bg = "#ff0055" if anomaly_type in ["FALL", "WEAPON", "FIGHT"] else "#ffaa00"
    
    subject = f"⚠️ VIGILAI ALERT: {anomaly_type.upper()} Detected at {camera_name}"
    
    # Dynamic Button Action Links
    clip_url = f"http://localhost:8000/api/alerts/{alert_id}/clip"
    resolve_url = f"http://localhost:8000/api/alerts/{alert_id}/resolve"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                background-color: #0d1117;
                color: #c9d1d9;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 30px auto;
                background-color: #161b22;
                border: 2px solid #00f0ff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 0 20px rgba(0, 240, 255, 0.25);
            }}
            .header {{
                background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
                padding: 30px;
                text-align: center;
                border-bottom: 1px solid #30363d;
            }}
            .logo {{
                font-size: 28px;
                font-weight: 800;
                color: #00f0ff;
                text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
                letter-spacing: 2px;
            }}
            .content {{
                padding: 35px 30px;
            }}
            .badge {{
                display: inline-block;
                background-color: {badge_bg};
                color: #ffffff;
                padding: 8px 18px;
                font-size: 14px;
                font-weight: bold;
                text-transform: uppercase;
                border-radius: 50px;
                margin-bottom: 25px;
                letter-spacing: 1px;
            }}
            .info-table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 30px;
                background-color: #0d1117;
                border-radius: 8px;
                overflow: hidden;
            }}
            .info-table td {{
                padding: 14px 18px;
                border-bottom: 1px solid #21262d;
            }}
            .info-label {{
                font-weight: 600;
                color: #8b949e;
                width: 35%;
            }}
            .info-value {{
                color: #f0f6fc;
                font-weight: 500;
            }}
            .snapshot-wrapper {{
                margin: 30px 0;
                border-radius: 8px;
                overflow: hidden;
                border: 1px solid #30363d;
                text-align: center;
            }}
            .snapshot-img {{
                max-width: 100%;
                height: auto;
                display: block;
            }}
            .button-container {{
                text-align: center;
                margin: 35px 0 15px 0;
            }}
            .btn {{
                display: inline-block;
                padding: 14px 28px;
                font-size: 15px;
                font-weight: bold;
                text-decoration: none;
                border-radius: 6px;
                margin: 0 10px;
            }}
            .btn-clip {{
                background-color: #00f0ff;
                color: #0d1117;
                box-shadow: 0 0 10px rgba(0, 240, 255, 0.3);
            }}
            .btn-resolve {{
                background-color: #238636;
                color: #ffffff;
            }}
            .footer {{
                background-color: #0d1117;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #58a6ff;
                border-top: 1px solid #21262d;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">VigilAI SURVEILLANCE</div>
            </div>
            <div class="content">
                <div class="badge">{anomaly_type} DETECTED</div>
                
                <table class="info-table">
                    <tr>
                        <td class="info-label">Camera Name</td>
                        <td class="info-value">{camera_name}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Location</td>
                        <td class="info-value">{camera_location}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Timestamp</td>
                        <td class="info-value">{timestamp}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Confidence</td>
                        <td class="info-value">{confidence:.1%}</td>
                    </tr>
                </table>

                <h3 style="color: #00f0ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 15px;">EVIDENCE SNAPSHOT</h3>
                <div class="snapshot-wrapper">
                    <img src="cid:snapshot_cid" alt="Evidence Snapshot" class="snapshot-img" />
                </div>

                <div class="button-container">
                    <a href="{clip_url}" class="btn btn-clip">VIEW FULL CLIP</a>
                    <a href="{resolve_url}" class="btn btn-resolve">MARK RESOLVED</a>
                </div>
            </div>
            <div class="footer">
                VigilAI Surveillance v1.0.0 • AI-Powered Security Automated Alerts<br>
                <a href="#" style="color: #58a6ff; text-decoration: none;">Unsubscribe Alerts</a>
            </div>
        </div>
    </body>
    </html>
    """

    # 3. Spin background worker thread
    email_thread = EmailSenderThread(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        snapshot_path=snapshot_path
    )
    email_thread.start()
    return True
