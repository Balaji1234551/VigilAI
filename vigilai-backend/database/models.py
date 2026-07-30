"""
SQLAlchemy ORM Model Definitions for VigilAI SQLite Schema.
Maps tables for Users, Cameras, Alerts, Recordings, and Emergency Contacts.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship as orm_relationship
from datetime import datetime
from database.db import Base


class User(Base):
    """
    User account information representing owners of monitored sites.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    fcm_token = Column(String, nullable=True)  # Firebase FCM token for push notifications
    plan = Column(String, default="free")      # subscription tier: 'free', 'premium', etc.
    notification_preferences = Column(JSON, nullable=True) # User notification settings (alerts & delivery)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Relationships
    cameras = orm_relationship("Camera", back_populates="owner", cascade="all, delete-orphan")
    alerts = orm_relationship("Alert", back_populates="owner", cascade="all, delete-orphan")
    emergency_contacts = orm_relationship("EmergencyContact", back_populates="owner", cascade="all, delete-orphan")


class Camera(Base):
    """
    Surveillance camera configurations (USB inputs or network IP/RTSP cams).
    """
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column("camera_name", String, nullable=False)
    location = Column(String, nullable=True)         # e.g., 'Front Yard', 'Living Room'
    type = Column("camera_type", String, nullable=False)             # e.g., 'usb', 'rtsp', 'ip_webcam'
    url = Column("stream_url", String, nullable=False)              # index '0' for webcams, rtsp URL, or web shot IP URL
    status = Column(String, default="offline")       # 'online' or 'offline'
    settings = Column(JSON, nullable=True)            # JSON config (e.g., {"loiter_time": 30, "enabled_detections": ["fall", "weapon"]})
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = orm_relationship("User", back_populates="cameras")
    alerts = orm_relationship("Alert", back_populates="camera", cascade="all, delete-orphan")
    recordings = orm_relationship("Recording", back_populates="camera", cascade="all, delete-orphan")


class Alert(Base):
    """
    Detection events logged as anomalous behaviors, including evidence links.
    """
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    anomaly_type = Column(String, nullable=False)     # 'FALL', 'WEAPON', 'FIGHT', 'LOITERING'
    confidence = Column(Float, nullable=False)
    snapshot_path = Column(String, nullable=True)     # Absolute path or relative URL to evidence JPEG
    clip_path = Column(String, nullable=True)         # Absolute path or relative URL to evidence MP4
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    status = Column(String, default="unread")         # 'unread', 'read', 'resolved'
    resolved_at = Column(DateTime, nullable=True)
    alert_sent = Column(Integer, default=0)           # 0 = not sent, 1 = successfully dispatched over channels

    # Relationships
    camera = orm_relationship("Camera", back_populates="alerts")
    owner = orm_relationship("User", back_populates="alerts")


class Recording(Base):
    """
    Continuous recording archives divided into 10-minute fragments.
    """
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    file_size = Column(Integer, nullable=False)       # stored in bytes
    duration = Column(Integer, nullable=False)        # stored in seconds (usually 600)

    # Relationships
    camera = orm_relationship("Camera", back_populates="recordings")


class EmergencyContact(Base):
    """
    Emergency phone numbers and email contacts to notify on severe anomalies.
    """
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    relationship = Column(String, nullable=True)     # 'spouse', 'police', 'neighbor'
    is_default = Column(Integer, default=0)           # 1 = primary fallback, 0 = secondary fallback

    # Relationships
    owner = orm_relationship("User", back_populates="emergency_contacts")


class AuditLog(Base):
    """
    Audit log record tracking every meaningful action performed by users.
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action = Column(String, nullable=False)           # 'LOGIN', 'SIGNUP', 'ADD_CAMERA', 'DELETE_CAMERA', 'UPDATE_SETTINGS', 'SOS_TRIGGERED', 'RESOLVED_ALERT'
    details = Column(String, nullable=True)          # human-readable detailed explanation
    ip_address = Column(String, nullable=True)
    device_info = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    owner = orm_relationship("User")


class Detection(Base):
    """
    Raw AI detection log points for statistical analysis.
    """
    __tablename__ = "detections"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    label = Column(String, nullable=False)
    confidence = Column(Float, nullable=False)
    box = Column(JSON, nullable=True) # [x1, y1, x2, y2]
    
    camera = orm_relationship("Camera")


class Snapshot(Base):
    """
    Indexed JPEG metadata linking for evidence storage.
    """
    __tablename__ = "snapshots"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    camera = orm_relationship("Camera")


class Analytic(Base):
    """
    Statistical aggregations for dashboards.
    """
    __tablename__ = "analytics"
    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False)
    metric_name = Column(String, nullable=False) # e.g. "hourly_fall_count"
    metric_value = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    camera = orm_relationship("Camera")


class OTPVerification(Base):
    """
    Temporary OTPs for email verification.
    """
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    otp_code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    verified = Column(Integer, default=0) # 0 = not verified, 1 = verified

class UserSetting(Base):
    """
    Persistent toggle settings for the user across mobile and web.
    """
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    setting_name = Column(String, nullable=False, index=True)
    setting_value = Column(String, nullable=False) # store booleans, strings, or stringified JSON
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = orm_relationship("User")
