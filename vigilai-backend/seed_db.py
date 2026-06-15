"""
Seeding script for VigilAI SQLite/PostgreSQL Database.
Fills tables with high-fidelity realistic demo data.
"""
import os
import sys
from datetime import datetime, timedelta

# Add current folder to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from database.db import SessionLocal, engine, Base
from database.models import User, Camera, Alert, Recording, EmergencyContact
from database.crud import get_password_hash

def seed():
    print("Connecting to database and creating schemas...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if database has users already
        if db.query(User).first() is not None:
            print("[INFO] Database already contains users. Skipping seeding.")
            return

        print("Seeding database tables with premium mock data...")
        
        # 1. Create Default User
        print("- Seeding user...")
        admin_pass = get_password_hash("admin123")
        user = User(
            name="Dr. Sarah Connor",
            email="admin@vigilai.com",
            password_hash=admin_pass,
            phone="+1 (555) 019-2834",
            plan="premium",
            created_at=datetime.utcnow() - timedelta(days=10)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"[SUCCESS] Created user: {user.name} ({user.email})")

        # 2. Create Cameras
        print("- Seeding cameras...")
        cam1 = Camera(
            user_id=user.id,
            name="Main Entrance Gate",
            location="Perimeter Front",
            type="rtsp",
            url="rtsp://demo-stream:554/live",
            status="online",
            settings={"loiter_time": 30, "enabled_detections": ["fall", "weapon", "fight", "loitering"]},
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        cam2 = Camera(
            user_id=user.id,
            name="Lobby Reception Desk",
            location="Building A Lobby",
            type="ip_webcam",
            url="http://192.168.1.100/video",
            status="online",
            settings={"loiter_time": 45, "enabled_detections": ["fall", "loitering"]},
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        cam3 = Camera(
            user_id=user.id,
            name="Loading Dock West",
            location="Warehouse Gate 2",
            type="rtsp",
            url="rtsp://demo-stream2:554/live",
            status="offline",
            settings={"loiter_time": 20, "enabled_detections": ["weapon", "fight"]},
            created_at=datetime.utcnow() - timedelta(days=5)
        )
        db.add_all([cam1, cam2, cam3])
        db.commit()
        db.refresh(cam1)
        db.refresh(cam2)
        db.refresh(cam3)
        print(f"[SUCCESS] Created cameras: {cam1.name}, {cam2.name}, {cam3.name}")

        # 3. Create Emergency Contacts
        print("- Seeding emergency contacts...")
        contact1 = EmergencyContact(
            user_id=user.id,
            name="John Diggle",
            phone="+1 (555) 014-9988",
            email="diggle@vigilai.com",
            relationship="partner",
            is_default=1
        )
        contact2 = EmergencyContact(
            user_id=user.id,
            name="Central Security Dispatch",
            phone="+1 (555) 911-0000",
            email="dispatch@safety.org",
            relationship="police",
            is_default=0
        )
        db.add_all([contact1, contact2])
        db.commit()
        print("[SUCCESS] Created emergency contacts.")

        # 4. Create Alerts
        print("- Seeding alerts...")
        # A mix of unread, read, and resolved alerts of different anomaly types
        alerts = [
            Alert(
                camera_id=cam1.id,
                user_id=user.id,
                anomaly_type="WEAPON",
                confidence=0.94,
                snapshot_path="/api/snapshots/det_weapon_001.jpg",
                clip_path="/api/clips/clip_weapon_001.mp4",
                timestamp=datetime.utcnow() - timedelta(hours=2),
                status="unread",
                alert_sent=1
            ),
            Alert(
                camera_id=cam2.id,
                user_id=user.id,
                anomaly_type="FALL",
                confidence=0.88,
                snapshot_path="/api/snapshots/det_fall_002.jpg",
                clip_path="/api/clips/clip_fall_002.mp4",
                timestamp=datetime.utcnow() - timedelta(hours=4),
                status="resolved",
                resolved_at=datetime.utcnow() - timedelta(hours=3),
                alert_sent=1
            ),
            Alert(
                camera_id=cam1.id,
                user_id=user.id,
                anomaly_type="FIGHT",
                confidence=0.78,
                snapshot_path="/api/snapshots/det_fight_003.jpg",
                clip_path=None,
                timestamp=datetime.utcnow() - timedelta(days=1),
                status="read",
                alert_sent=1
            ),
            Alert(
                camera_id=cam2.id,
                user_id=user.id,
                anomaly_type="LOITERING",
                confidence=0.72,
                snapshot_path=None,
                clip_path=None,
                timestamp=datetime.utcnow() - timedelta(days=2),
                status="resolved",
                resolved_at=datetime.utcnow() - timedelta(days=2, hours=23),
                alert_sent=0
            )
        ]
        db.add_all(alerts)
        db.commit()
        print("[SUCCESS] Created incident alerts.")

        # 5. Create Recordings
        print("- Seeding recordings...")
        recordings = [
            Recording(
                camera_id=cam1.id,
                file_path="/storage/recordings/gate_20260602_1000.mp4",
                start_time=datetime.utcnow() - timedelta(hours=3),
                end_time=datetime.utcnow() - timedelta(hours=2, minutes=50),
                file_size=154201000,
                duration=600
            ),
            Recording(
                camera_id=cam2.id,
                file_path="/storage/recordings/lobby_20260602_1100.mp4",
                start_time=datetime.utcnow() - timedelta(hours=1),
                end_time=datetime.utcnow() - timedelta(minutes=50),
                file_size=75300000,
                duration=600
            )
        ]
        db.add_all(recordings)
        db.commit()
        print("[SUCCESS] Created recording schedules.")

        print("[SUCCESS] Database seeding completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[CRITICAL ERROR] Seeding aborted: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed()
