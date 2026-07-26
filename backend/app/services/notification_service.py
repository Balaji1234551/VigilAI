"""
Notification Service Module for VigilAI.
Handles Fast2SMS dispatch. Twilio and Firebase have been completely removed.
"""
import logging
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime

from app.models.schemas import User, EmergencyContact, NotificationLog
from app.services.fast2sms_service import Fast2SMSService

logger = logging.getLogger("VigilAI.NotificationService")

class NotificationService:
    def __init__(self):
        self.fast2sms = Fast2SMSService()

    def _log_notification(self, db: Session, user_id: int, alert_id: Optional[int], channel: str, recipients: List[str], status: str, error: str = None):
        try:
            # Join recipients into a comma-separated string for logging
            recipients_str = ",".join(recipients) if recipients else "unknown"
            
            log = NotificationLog(
                user_id=user_id,
                alert_id=alert_id,
                channel=channel,
                recipient=recipients_str,
                status=status,
                error_message=error
            )
            db.add(log)
            db.commit()
        except Exception as e:
            logger.error(f"Failed to log notification: {e}")

    def notify_user_of_anomaly(self, db: Session, user: User, alert: Any, camera_name: str):
        """Dispatch Fast2SMS notifications to primary number and emergency contacts."""
        logger.info(f"Notification Service: Preparing alerts for {user.full_name} regarding {alert.anomaly_type}")
        
        # 1. Collect all recipients
        phone_numbers = []
        if user.phone_number:
            phone_numbers.append(user.phone_number)
            
        contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
        for contact in contacts:
            if contact.phone:
                phone_numbers.append(contact.phone)
                
        # Deduplicate phone numbers
        phone_numbers = list(set(phone_numbers))
        
        if not phone_numbers:
            logger.warning("No phone numbers available to send SMS alert. Proceeding to Email.")

        # 2. Format the precise SMS message string required by user
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        confidence_str = f"{int(alert.confidence * 100)}"
        
        sms_body = (
            "🚨 VIGILAI ALERT\n\n"
            "Danger Detected\n\n"
            f"Type: {alert.anomaly_type}\n\n"
            f"Camera: {camera_name}\n\n"
            f"Confidence: {confidence_str}%\n\n"
            f"Time: {current_time}\n\n"
            "Please check the VigilAI application immediately."
        )

        # 3. Send SMS using Fast2SMS bulk sending
        if phone_numbers:
            success = self.fast2sms.send_sms(phone_numbers, sms_body)
            if success:
                self._log_notification(db, user.id, getattr(alert, "id", None), "Fast2SMS", phone_numbers, "sent")
            else:
                self._log_notification(db, user.id, getattr(alert, "id", None), "Fast2SMS", phone_numbers, "failed", "API Error")

        # 4. Dispatch Email Alerts
        from app.alerts.email_alert import send_email_alert
        
        emails = []
        if user.email:
            emails.append(user.email)
        for contact in contacts:
            if contact.email:
                emails.append(contact.email)
                
        emails = list(set([e for e in emails if e]))
        
        if emails:
            # Assuming camera_id is attached to alert. Note: DummyAlert for testing might not have it.
            camera_id = getattr(alert, "camera_id", 0)
            
            # Use snapshot path from alert
            snapshot_path = getattr(alert, "snapshot_path", None)
            
            email_sent = send_email_alert(
                to_emails=emails,
                camera_id=camera_id,
                camera_name=camera_name,
                camera_location="", # Extracted in actual Detection flow or pass properly
                anomaly_type=alert.anomaly_type,
                confidence=alert.confidence,
                alert_id=getattr(alert, "id", 0),
                snapshot_path=snapshot_path
            )
            
            if email_sent:
                self._log_notification(db, user.id, getattr(alert, "id", None), "EMAIL", emails, "sent")
            else:
                self._log_notification(db, user.id, getattr(alert, "id", None), "EMAIL", emails, "failed", "Rate limit or thread dispatch error")
        else:
            logger.warning("No email addresses available to send the alert.")
