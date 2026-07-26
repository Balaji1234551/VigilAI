import os
import time
import logging
from database.db import SessionLocal, Base
from database.models import Camera, Alert, User, EmergencyContact
from detection.weapon_detector import WeaponDetector
from alerts.sms_alert import send_sms_alert

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("E2E_Tester")

def run_tests():
    db = SessionLocal()
    report = []
    
    try:
        # Test 1: DB & User Setup
        logger.info("Setting up DB...")
        user = db.query(User).first()
        if not user:
            report.append("❌ Database User Missing")
            return report
            
        # Test 2: Camera Check
        cam = db.query(Camera).filter(Camera.user_id == user.id).first()
        if cam:
            report.append("✅ Camera Connected (Found in DB)")
        else:
            report.append("❌ Camera Not Found")
            
        # Test 3: Model Loading
        try:
            wd = WeaponDetector()
            # If initialization doesn't throw, model is loaded
            if wd.model is not None:
                report.append("✅ YOLO Model Loaded")
            else:
                report.append("❌ YOLO Model Not Found")
        except Exception as e:
            report.append(f"❌ YOLO Model Failed: {e}")
            
        # Test 4: SMS Configuration
        contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == user.id).all()
        if contacts:
            report.append("✅ SMS Contacts Registered")
        else:
            report.append("❌ SMS Contacts Not Found")
            
        # Run mock detection & SMS trigger
        # (Assuming the system will route this if we trigger it, but we test the module directly for report)
        try:
            send_sms_alert(
                to_numbers=["+1234567890"],
                camera_id=cam.id if cam else 1,
                camera_name=cam.name if cam else "Test Cam",
                anomaly_type="WEAPON",
                confidence=0.94,
                timestamp="14:42",
                alert_id=999,
                short_link="http://localhost:8000/api/clips/test.mp4"
            )
            report.append("✅ SMS Sent (Triggered Mock SMS)")
        except Exception as e:
            report.append(f"❌ SMS Sent Failed: {e}")
            
    finally:
        db.close()
        
    return report

if __name__ == "__main__":
    rep = run_tests()
    print("\n--- E2E TEST REPORT ---")
    for r in rep:
        print(r)
