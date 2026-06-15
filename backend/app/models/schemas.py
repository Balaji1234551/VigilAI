"""
SQLAlchemy ORM Database models for VigilAI.
Defines all tables with proper foreign keys, on-delete-cascade,
indexing, relationships, and strict user-specific isolation.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, LargeBinary, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import sqlalchemy.orm
from datetime import datetime

Base = declarative_base()


class User(Base):
    """Store application users and roles (Table 1)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="operator", nullable=False)  # admin, operator, user
    phone_number = Column(String(30), nullable=True)
    fcm_token = Column(String(255), nullable=True)  # Firebase Cloud Messaging token
    plan = Column(String(50), default="free")       # subscription plan: free, premium
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    privacy_settings = relationship("PrivacySetting", back_populates="user", cascade="all, delete-orphan", uselist=False)
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    cameras = relationship("Camera", back_populates="owner", cascade="all, delete-orphan")
    emergency_contacts = relationship("EmergencyContact", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"


class Camera(Base):
    """Store surveillance camera configurations (Table 2)."""
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_name = Column(String(100), nullable=False)
    camera_type = Column(String(50), default="IP", nullable=False)  # IP, RTSP, USB, Web
    stream_url = Column(String(255), nullable=False)
    location = Column(String(150), nullable=True)
    status = Column(String(30), default="offline", nullable=False)  # online, offline, error
    resolution = Column(String(30), default="1280x720", nullable=False)
    fps = Column(Integer, default=30, nullable=False)
    settings = Column(JSON, nullable=True)  # JSON config (e.g. enabled detections, quiet hours)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="cameras")
    live_streams = relationship("LiveStream", back_populates="camera", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="camera", cascade="all, delete-orphan")
    recordings = relationship("Recording", back_populates="camera", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Camera(id={self.id}, name={self.camera_name}, status={self.status})>"


class LiveStream(Base):
    """Track active live streams sessions (Table 3)."""
    __tablename__ = "live_streams"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stream_status = Column(String(30), default="inactive", nullable=False)  # active, inactive, buffering
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    ended_at = Column(DateTime, nullable=True)
    bitrate = Column(Integer, nullable=True)  # in kbps

    # Relationships
    camera = relationship("Camera", back_populates="live_streams")

    def __repr__(self):
        return f"<LiveStream(id={self.id}, camera_id={self.camera_id}, status={self.stream_status})>"


class Detection(Base):
    """Store AI behavioral and threat detections (Table 4)."""
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    detection_type = Column(String(50), nullable=False, index=True)  # Fall, Fight, Weapon, Loitering, Intrusion
    confidence_score = Column(Float, nullable=False)
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    bounding_box = Column(JSON, nullable=True)  # Coordinates of detection
    pose_data = Column(JSON, nullable=True)  # MediaPipe Pose landmarks
    snapshot_url = Column(String(255), nullable=True)
    video_clip_url = Column(String(255), nullable=True)

    # Relationships
    camera = relationship("Camera", back_populates="detections")
    alerts = relationship("Alert", back_populates="detection", cascade="all, delete-orphan")
    snapshots = relationship("Snapshot", back_populates="detection", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Detection(id={self.id}, type={self.detection_type}, camera_id={self.camera_id}, confidence={self.confidence_score})>"


class Alert(Base):
    """Store triggered alert notifications based on detections (Table 5)."""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Combined fields for backend and real-time coordinator compatibility
    anomaly_type = Column(String(50), nullable=False, index=True)     # 'FALL', 'WEAPON', 'FIGHT', 'LOITERING'
    alert_type = Column(String(50), nullable=True, index=True)       # For backend schema alias
    confidence = Column(Float, nullable=False, default=0.0)
    
    alert_message = Column(Text, nullable=True)
    delivery_method = Column(String(50), default="Push Notification", nullable=False)  # SMS, Email, Push Notification
    delivery_status = Column(String(30), default="pending", nullable=False)  # sent, failed, pending
    
    snapshot_path = Column(String(255), nullable=True)     # Absolute path or relative URL to evidence JPEG
    clip_path = Column(String(255), nullable=True)         # Absolute path or relative URL to evidence MP4
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True) # Used by alert_coordinator
    sent_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # Used by backend schemas
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    status = Column(String(30), default="unread", nullable=False)     # 'unread', 'read', 'resolved'
    resolved_at = Column(DateTime, nullable=True)
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    alert_sent = Column(Integer, default=0)                           # 0 = not sent, 1 = successfully dispatched over channels

    # Relationships
    detection = relationship("Detection", back_populates="alerts")
    camera = relationship("Camera")

    def __repr__(self):
        return f"<Alert(id={self.id}, type={self.anomaly_type}, status={self.status})>"


class Recording(Base):
    """Store surveillance video recording file metadata (Table 6)."""
    __tablename__ = "recordings"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(Integer, ForeignKey("cameras.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(255), nullable=False)
    
    # Merged columns
    start_time = Column(DateTime, nullable=False, index=True, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=False, default=datetime.utcnow)
    file_size = Column(Integer, nullable=False, default=0)        # stored in bytes
    duration = Column(Float, default=0.0, nullable=False)         # duration in seconds (usually 600)
    recording_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    storage_type = Column(String(50), default="local", nullable=False)  # local, S3, cloud

    # Relationships
    camera = relationship("Camera", back_populates="recordings")

    def __repr__(self):
        return f"<Recording(id={self.id}, camera_id={self.camera_id}, path={self.file_path})>"


class Snapshot(Base):
    """Store raw or processed image snapshots of anomaly detections (Table 7)."""
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    detection_id = Column(Integer, ForeignKey("detections.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    image_path = Column(String(255), nullable=False)
    face_blurred = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    detection = relationship("Detection", back_populates="snapshots")

    def __repr__(self):
        return f"<Snapshot(id={self.id}, detection_id={self.detection_id}, path={self.image_path})>"


class Analytics(Base):
    """Aggregate analytics dashboard logs (Table 8)."""
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    total_alerts = Column(Integer, default=0, nullable=False)
    total_detections = Column(Integer, default=0, nullable=False)
    fall_count = Column(Integer, default=0, nullable=False)
    fight_count = Column(Integer, default=0, nullable=False)
    weapon_count = Column(Integer, default=0, nullable=False)
    loitering_count = Column(Integer, default=0, nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Analytics(id={self.id}, user_id={self.user_id}, total_alerts={self.total_alerts})>"


class Device(Base):
    """Store surveillance processing equipment and hardware node data (Table 9)."""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50), default="edge_node", nullable=False)  # camera, edge_node, server
    ip_address = Column(String(45), nullable=True)
    mac_address = Column(String(17), nullable=True)
    status = Column(String(30), default="offline", nullable=False)  # online, offline, maintenance
    last_connected = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Device(id={self.id}, name={self.device_name}, status={self.status})>"


class PrivacySetting(Base):
    """Store user-defined privacy configurations (Table 10)."""
    __tablename__ = "privacy_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    face_blur_enabled = Column(Boolean, default=True, nullable=False)
    local_storage_only = Column(Boolean, default=False, nullable=False)
    cloud_backup_enabled = Column(Boolean, default=False, nullable=False)
    data_retention_days = Column(Integer, default=30, nullable=False)

    # Relationships
    user = relationship("User", back_populates="privacy_settings")

    def __repr__(self):
        return f"<PrivacySetting(id={self.id}, user_id={self.user_id}, blur={self.face_blur_enabled})>"


class AuditLog(Base):
    """Track backend system logins and administrative modifications (Table 11)."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False)  # login, create_user, update_camera, delete_camera, etc.
    description = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, user_id={self.user_id})>"


class EmergencyContact(Base):
    """Emergency contacts to notify on severe anomalies (Table 12)."""
    __tablename__ = "emergency_contacts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=True)
    email = Column(String(100), nullable=True)
    relationship = Column(String(50), nullable=True)     # 'spouse', 'police', 'neighbor'
    is_default = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = sqlalchemy.orm.relationship("User", back_populates="emergency_contacts")

    def __repr__(self):
        return f"<EmergencyContact(id={self.id}, user_id={self.user_id}, name={self.name})>"


# --- Legacy / Backwards Compatibility Models ---
# Retained so that existing OpenCV privacy zones and face recognition APIs remain functional.

class PrivacyZone(Base):
    """Legacy: User-defined privacy zones to blur/blacken in video frames."""
    __tablename__ = "privacy_zones"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(100), nullable=False, index=True)
    name = Column(String(100))
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=False)
    height = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<PrivacyZone(id={self.id}, camera={self.camera_id}, name={self.name})>"


class TrustedPerson(Base):
    """Legacy: Whitelisted trusted persons with facial embeddings."""
    __tablename__ = "trusted_persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20))
    email = Column(String(100))
    facial_embedding = Column(LargeBinary, nullable=False)
    embedding_model = Column(String(50), default="FaceNet")
    added_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<TrustedPerson(id={self.id}, name={self.name})>"


class DetectionEvent(Base):
    """Legacy: Timeline events for each alert."""
    __tablename__ = "detection_events"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, nullable=False)  # Left as generic Integer for retrofitting
    event_type = Column(String(100), nullable=False)
    description = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    confidence = Column(Float, default=0.0)

    def __repr__(self):
        return f"<DetectionEvent(id={self.id}, type={self.event_type}, alert_id={self.alert_id})>"
