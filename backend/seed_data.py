"""
Database Seeder Script for VigilAI PostgreSQL Backend.
Fills all 12 database tables with realistic, robust dummy data.
"""
import os
import sys
from datetime import datetime, timedelta
import bcrypt

# Ensure backend directory is in python path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal, init_db
from app.models.schemas import (
    User, Camera, LiveStream, Detection, Alert,
    Recording, Snapshot, Analytics, Device, PrivacySetting, AuditLog, EmergencyContact
)


def hash_password(password: str) -> str:
    """Generate secure bcrypt password hash directly."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def seed_database():
    """Seed all 12 database tables."""
    print("Checking database schema...")
    from app.models.schemas import Base
    from app.database import engine
    # Base.metadata.drop_all(bind=engine) # DISABLED: Do not wipe existing user data!

    print("Initializing database schema...")
    init_db()
    
    db = SessionLocal()
    try:
        # Check if database has users already, indicating it might be seeded
        if db.query(User).first() is not None:
            print("Database already contains data. Skipping seeding.")
            return

        print("Seeding database tables...")

        # 1. Users Table (Table 1)
        print("- Seeding users...")
        admin_pass = hash_password("admin123")
        operator_pass = hash_password("operator123")

        user_admin = User(
            full_name="Dr. Sarah Connor",
            email="admin@vigilai.com",
            password_hash=admin_pass,
            role="admin",
            phone_number="+1 (555) 019-2834",
            is_active=True
        )
        user_operator = User(
            full_name="John Diggle",
            email="operator@vigilai.com",
            password_hash=operator_pass,
            role="operator",
            phone_number="+1 (555) 014-9988",
            is_active=True
        )
        db.add_all([user_admin, user_operator])
        db.commit()
        db.refresh(user_admin)
        db.refresh(user_operator)

        # 2. Cameras Table (Table 2)
        print("- Seeding cameras...")
        cam1 = Camera(
            user_id=user_admin.id,
            camera_name="Main Entry Gate",
            camera_type="RTSP",
            stream_url="rtsp://192.168.1.50:554/live/stream1",
            location="Front Gate Outer Perimeter",
            status="online",
            resolution="1920x1080",
            fps=30
        )
        cam2 = Camera(
            user_id=user_admin.id,
            camera_name="Building A Lobby Area",
            camera_type="IP",
            stream_url="rtsp://192.168.1.60:554/h264",
            location="Lobby Reception Desk",
            status="online",
            resolution="1280x720",
            fps=25
        )
        cam3 = Camera(
            user_id=user_operator.id,
            camera_name="Parking Lot East",
            camera_type="RTSP",
            stream_url="rtsp://192.168.1.70:554/stream2",
            location="East Fence Gate",
            status="offline",
            resolution="1920x1080",
            fps=15
        )
        db.add_all([cam1, cam2, cam3])
        db.commit()
        db.refresh(cam1)
        db.refresh(cam2)
        db.refresh(cam3)

        # 3. Live Streams Table (Table 3)
        print("- Seeding live streams...")
        stream1 = LiveStream(
            camera_id=cam1.id,
            user_id=user_admin.id,
            stream_status="active",
            started_at=datetime.utcnow() - timedelta(hours=3),
            bitrate=4096
        )
        stream2 = LiveStream(
            camera_id=cam2.id,
            user_id=user_admin.id,
            stream_status="active",
            started_at=datetime.utcnow() - timedelta(hours=1),
            bitrate=2048
        )
        db.add_all([stream1, stream2])
        db.commit()

        # 4. Detections Table (Table 4)
        print("- Seeding AI detections (Falls, Fight, Weapon)...")
        det1 = Detection(
            camera_id=cam1.id,
            user_id=user_admin.id,
            detection_type="Weapon",
            confidence_score=0.94,
            detected_at=datetime.utcnow() - timedelta(hours=2),
            bounding_box={"x1": 340, "y1": 150, "x2": 420, "y2": 290, "label": "weapon"},
            pose_data={"left_wrist": [345, 180], "right_wrist": [380, 195]},
            snapshot_url="/snapshots/det_weapon_001.jpg",
            video_clip_url="/recordings/clip_weapon_001.mp4"
        )
        det2 = Detection(
            camera_id=cam2.id,
            user_id=user_admin.id,
            detection_type="Fall",
            confidence_score=0.88,
            detected_at=datetime.utcnow() - timedelta(minutes=45),
            bounding_box={"x1": 110, "y1": 240, "x2": 280, "y2": 450, "label": "fallen_person"},
            pose_data={"head": [120, 250], "left_hip": [210, 310], "left_ankle": [270, 440]},
            snapshot_url="/snapshots/det_fall_002.jpg",
            video_clip_url="/recordings/clip_fall_002.mp4"
        )
        det3 = Detection(
            camera_id=cam1.id,
            user_id=user_admin.id,
            detection_type="Loitering",
            confidence_score=0.75,
            detected_at=datetime.utcnow() - timedelta(minutes=10),
            bounding_box={"x1": 500, "y1": 100, "x2": 620, "y2": 400, "label": "person"},
            snapshot_url="/snapshots/det_loitering_003.jpg"
        )
        db.add_all([det1, det2, det3])
        db.commit()
        db.refresh(det1)
        db.refresh(det2)
        db.refresh(det3)

        # 5. Alerts Table (Table 5)
        print("- Seeding alerts...")
        alert1 = Alert(
            detection_id=det1.id,
            camera_id=cam1.id,
            user_id=user_admin.id,
            anomaly_type="WEAPON",
            alert_type="Weapon Detected",
            confidence=0.94,
            alert_message="CRITICAL: Person carrying a weapon detected near Main Entry Gate. Immediate security dispatch required.",
            delivery_method="Push Notification",
            delivery_status="sent",
            sent_at=datetime.utcnow() - timedelta(hours=2)
        )
        alert2 = Alert(
            detection_id=det2.id,
            camera_id=cam2.id,
            user_id=user_admin.id,
            anomaly_type="FALL",
            alert_type="Fall Detected",
            confidence=0.88,
            alert_message="WARNING: Visitor Fall detected in Building A Lobby Area. Dispatch medical/facility support.",
            delivery_method="Push Notification",
            delivery_status="sent",
            sent_at=datetime.utcnow() - timedelta(minutes=45)
        )
        alert3 = Alert(
            detection_id=det3.id,
            camera_id=cam1.id,
            user_id=user_admin.id,
            anomaly_type="LOITERING",
            alert_type="Loitering Warning",
            confidence=0.75,
            alert_message="INFO: Person has been standing in restricted Outer Perimeter for over 15 minutes.",
            delivery_method="Push Notification",
            delivery_status="pending",
            sent_at=datetime.utcnow() - timedelta(minutes=10)
        )
        db.add_all([alert1, alert2, alert3])
        db.commit()

        # 6. Recordings Table (Table 6)
        print("- Seeding video recordings...")
        rec1 = Recording(
            camera_id=cam1.id,
            user_id=user_admin.id,
            file_path="/storage/recordings/gate_20260512_1000.mp4",
            duration=300.0,
            storage_type="local",
            recording_date=datetime.utcnow() - timedelta(hours=3)
        )
        rec2 = Recording(
            camera_id=cam2.id,
            user_id=user_admin.id,
            file_path="/storage/recordings/lobby_20260512_1100.mp4",
            duration=150.0,
            storage_type="local",
            recording_date=datetime.utcnow() - timedelta(hours=2)
        )
        db.add_all([rec1, rec2])
        db.commit()

        # 7. Snapshots Table (Table 7)
        print("- Seeding snapshot coordinates...")
        snap1 = Snapshot(
            detection_id=det1.id,
            user_id=user_admin.id,
            image_path="/storage/snapshots/gate_weapon_event.jpg",
            face_blurred=True,
            created_at=datetime.utcnow() - timedelta(hours=2)
        )
        snap2 = Snapshot(
            detection_id=det2.id,
            user_id=user_admin.id,
            image_path="/storage/snapshots/lobby_fall_event.jpg",
            face_blurred=False,
            created_at=datetime.utcnow() - timedelta(minutes=45)
        )
        db.add_all([snap1, snap2])
        db.commit()

        # 8. Analytics Table (Table 8)
        print("- Seeding aggregate analytics dashboard logs...")
        analysis = Analytics(
            user_id=user_admin.id,
            total_alerts=12,
            total_detections=145,
            fall_count=8,
            fight_count=2,
            weapon_count=1,
            loitering_count=22,
            generated_at=datetime.utcnow()
        )
        db.add(analysis)
        db.commit()

        # 9. Devices Table (Table 9)
        print("- Seeding devices...")
        dev1 = Device(
            device_name="Jetson Orin Nano Edge Node 01",
            device_type="edge_node",
            ip_address="192.168.1.110",
            mac_address="00:1A:3C:4E:5F:6D",
            status="online",
            last_connected=datetime.utcnow() - timedelta(minutes=2)
        )
        dev2 = Device(
            device_name="VigilAI Core Server",
            device_type="server",
            ip_address="192.168.1.100",
            mac_address="00:1A:3C:4E:5F:70",
            status="online",
            last_connected=datetime.utcnow() - timedelta(seconds=15)
        )
        db.add_all([dev1, dev2])
        db.commit()

        # 10. Privacy Settings Table (Table 10)
        print("- Updating user privacy profiles...")
        admin_settings = db.query(PrivacySetting).filter(PrivacySetting.user_id == user_admin.id).first()
        if admin_settings:
            admin_settings.face_blur_enabled = True
            admin_settings.cloud_backup_enabled = True
            admin_settings.data_retention_days = 60
        else:
            db.add(PrivacySetting(
                user_id=user_admin.id,
                face_blur_enabled=True,
                local_storage_only=False,
                cloud_backup_enabled=True,
                data_retention_days=60
            ))

        operator_settings = db.query(PrivacySetting).filter(PrivacySetting.user_id == user_operator.id).first()
        if operator_settings:
            operator_settings.face_blur_enabled = True
            operator_settings.local_storage_only = True
            operator_settings.data_retention_days = 15
        else:
            db.add(PrivacySetting(
                user_id=user_operator.id,
                face_blur_enabled=True,
                local_storage_only=True,
                cloud_backup_enabled=False,
                data_retention_days=15
            ))
        db.commit()

        # 11. Audit Logs Table (Table 11)
        print("- Seeding audit logs...")
        log1 = AuditLog(
            user_id=user_admin.id,
            action="system_startup",
            description="VigilAI Backend System initialized and started on server host 192.168.1.100",
            ip_address="127.0.0.1"
        )
        log2 = AuditLog(
            user_id=user_admin.id,
            action="register_camera",
            description="Registered camera 'Main Entry Gate' with stream RTSP endpoint.",
            ip_address="192.168.1.20"
        )
        log3 = AuditLog(
            user_id=user_operator.id,
            action="login",
            description="Operator John Diggle logged in from mobile console application.",
            ip_address="192.168.1.35"
        )
        db.add_all([log1, log2, log3])
        db.commit()

        # 12. Emergency Contacts Table (Table 12)
        print("- Seeding emergency contacts...")
        contact1 = EmergencyContact(
            user_id=user_admin.id,
            name="Officer James Gordon",
            phone="+15551234567",
            email="gordon@gcpd.gov",
            relationship="police",
            is_default=True
        )
        contact2 = EmergencyContact(
            user_id=user_operator.id,
            name="Lyla Michaels",
            phone="+15559876543",
            email="lyla@argus.gov",
            relationship="spouse",
            is_default=True
        )
        db.add_all([contact1, contact2])
        db.commit()

        print("Database seeded with high-fidelity mock records successfully!")

    except Exception as e:
        db.rollback()
        print(f"CRITICAL ERROR seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
