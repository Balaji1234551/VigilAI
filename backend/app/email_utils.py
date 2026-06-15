import smtplib
import logging
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM_EMAIL

logger = logging.getLogger("VigilAI.EmailUtils")

class StandardEmailSenderThread(threading.Thread):
    def __init__(self, to_email: str, subject: str, html_content: str):
        super().__init__()
        self.to_email = to_email
        self.subject = subject
        self.html_content = html_content
        self.daemon = True

    def run(self):
        if not SMTP_USERNAME or not SMTP_PASSWORD:
            logger.error("SMTP credentials are empty. Cannot send verification email.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = self.subject
        msg["From"] = SMTP_FROM_EMAIL or SMTP_USERNAME
        msg["To"] = self.to_email
        msg.attach(MIMEText(self.html_content, "html"))

        try:
            logger.info(f"Sending standard email to {self.to_email}...")
            server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
            server.starttls()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(msg["From"], self.to_email, msg.as_string())
            server.quit()
            logger.info(f"Email sent successfully to {self.to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {self.to_email}: {e}")

def get_base_html_template(title: str, message: str, code: str) -> str:
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Arial, sans-serif; background-color: #0A0E17; color: #FFFFFF; padding: 20px; }}
            .container {{ max-width: 500px; margin: 0 auto; background-color: #161B29; border: 2px solid #00E5FF; border-radius: 12px; padding: 30px; text-align: center; }}
            .logo {{ color: #00E5FF; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin-bottom: 20px; }}
            .title {{ font-size: 20px; margin-bottom: 10px; color: #FFFFFF; }}
            .message {{ color: #94A3B8; margin-bottom: 30px; font-size: 16px; line-height: 1.5; }}
            .code-box {{ background-color: #0d1117; border: 1px dashed #00E5FF; padding: 15px; border-radius: 8px; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #00E5FF; margin-bottom: 30px; display: inline-block; }}
            .footer {{ color: #64748B; font-size: 12px; margin-top: 20px; border-top: 1px solid #242C3E; padding-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">VIGILAI</div>
            <div class="title">{title}</div>
            <div class="message">{message}</div>
            <div class="code-box">{code}</div>
            <div class="footer">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</div>
        </div>
    </body>
    </html>
    """

def send_verification_email(to_email: str, code: str):
    html_content = get_base_html_template(
        title="Verify Your Email Address",
        message="Thank you for signing up for VigilAI! Please use the verification code below to complete your registration.",
        code=code
    )
    thread = StandardEmailSenderThread(to_email, "VigilAI - Email Verification Code", html_content)
    thread.start()

def send_password_reset_email(to_email: str, code: str):
    html_content = get_base_html_template(
        title="Reset Your Password",
        message="We received a request to reset your VigilAI password. Please use the code below to set up a new password.",
        code=code
    )
    thread = StandardEmailSenderThread(to_email, "VigilAI - Password Reset Code", html_content)
    thread.start()
