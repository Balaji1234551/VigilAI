"""
Database CRUD Operations and Cryptographic Utilities for VigilAI.
Implements data reading, writing, updates, and deletes for all entities.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from typing import List, Dict, Any, Optional
from passlib.context import CryptContext
from database.models import User, Camera, Alert, Recording, EmergencyContact

# Initialize password hashing context using bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ==========================================
# AUTH & USER UTILITIES
# ==========================================

def get_password_hash(password: str) -> str:
    """Hash plain text password."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify standard text matches its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Retrieve user details using email."""
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Retrieve user details using id."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, user_data: Dict[str, Any]) -> User:
    """Create a new user with hashed passwords."""
    hashed_password = get_password_hash(user_data["password"])
    db_user = User(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=hashed_password,
        phone=user_data.get("phone"),
        plan=user_data.get("plan", "free")
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_fcm_token(db: Session, user_id: int, token: str) -> Optional[User]:
    """Update Firebase cloud messaging token."""
    db_user = get_user_by_id(db, user_id)
    if db_user:
        db_user.fcm_token = token
        db.commit()
        db.refresh(db_user)
    return db_user


def update_user_preferences(db: Session, user_id: int, preferences: Dict[str, Any]) -> Optional[User]:
    """Update user notification preferences."""
    from sqlalchemy.orm.attributes import flag_modified
    db_user = get_user_by_id(db, user_id)
    if db_user:
        # Deep copy or flag_modified is needed for SQLAlchemy to detect JSON column in-place mutations
        db_user.notification_preferences = preferences
        flag_modified(db_user, "notification_preferences")
        db.commit()
        db.refresh(db_user)
    return db_user


# ==========================================
# CAMERA OPERATIONS
# ==========================================

def get_camera(db: Session, camera_id: int) -> Optional[Camera]:
    """Get individual camera details."""
    return db.query(Camera).filter(Camera.id == camera_id).first()


def get_cameras(db: Session, user_id: int) -> List[Camera]:
    """Get all cameras belonging to a user."""
    return db.query(Camera).filter(Camera.user_id == user_id).all()


def create_camera(db: Session, user_id: int, camera_data: Dict[str, Any]) -> Camera:
    """Create and configure a new camera stream."""
    db_camera = Camera(
        user_id=user_id,
        name=camera_data["name"],
        location=camera_data.get("location"),
        type=camera_data["type"],
        url=str(camera_data["url"]),
        status="offline",
        settings=camera_data.get("settings", {})
    )
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera


def update_camera_settings(db: Session, camera_id: int, settings: Dict[str, Any]) -> Optional[Camera]:
    """Update the camera parameters JSON."""
    db_camera = get_camera(db, camera_id)
    if db_camera:
        db_camera.settings = settings
        db.commit()
        db.refresh(db_camera)
    return db_camera


def update_camera_status(db: Session, camera_id: int, status: str) -> Optional[Camera]:
    """Update the camera status (online/offline)."""
    db_camera = get_camera(db, camera_id)
    if db_camera:
        db_camera.status = status
        db.commit()
        db.refresh(db_camera)
    return db_camera


def delete_camera(db: Session, camera_id: int) -> bool:
    """Remove a camera entry from database."""
    db_camera = get_camera(db, camera_id)
    if db_camera:
        db.delete(db_camera)
        db.commit()
        return True
    return False


# ==========================================
# ALERT OPERATIONS
# ==========================================

def get_alert_by_id(db: Session, alert_id: int) -> Optional[Alert]:
    """Get details of a single alert."""
    return db.query(Alert).filter(Alert.id == alert_id).first()


def get_alerts(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 20,
    camera_id: Optional[int] = None,
    anomaly_type: Optional[str] = None,
    status: Optional[str] = None
) -> List[Alert]:
    """Query list of alerts with filters and pagination."""
    query = db.query(Alert).filter(Alert.user_id == user_id)
    if camera_id is not None:
        query = query.filter(Alert.camera_id == camera_id)
    if anomaly_type and anomaly_type.lower() != "all":
        query = query.filter(Alert.anomaly_type == anomaly_type.upper())
    if status and status.lower() != "all":
        query = query.filter(Alert.status == status.lower())
    
    return query.order_by(Alert.timestamp.desc()).offset(skip).limit(limit).all()


def create_alert(db: Session, alert_data: Dict[str, Any]) -> Alert:
    """Log a newly detected anomaly event."""
    db_alert = Alert(
        camera_id=alert_data["camera_id"],
        user_id=alert_data["user_id"],
        anomaly_type=alert_data["anomaly_type"].upper(),
        confidence=float(alert_data["confidence"]),
        snapshot_path=alert_data.get("snapshot_path"),
        clip_path=alert_data.get("clip_path"),
        timestamp=alert_data.get("timestamp", datetime.utcnow()),
        status="unread",
        alert_sent=alert_data.get("alert_sent", 0)
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


def resolve_alert(db: Session, alert_id: int) -> Optional[Alert]:
    """Mark a pending alert as resolved."""
    db_alert = get_alert_by_id(db, alert_id)
    if db_alert:
        db_alert.status = "resolved"
        db_alert.resolved_at = datetime.utcnow()
        db.commit()
        db.refresh(db_alert)
    return db_alert


def update_alert_sent_status(db: Session, alert_id: int, status: int) -> Optional[Alert]:
    """Flag that notifications have successfully been delivered."""
    db_alert = get_alert_by_id(db, alert_id)
    if db_alert:
        db_alert.alert_sent = status
        db.commit()
        db.refresh(db_alert)
    return db_alert


def delete_alert(db: Session, alert_id: int) -> bool:
    """Remove a logged alert entry."""
    db_alert = get_alert_by_id(db, alert_id)
    if db_alert:
        db.delete(db_alert)
        db.commit()
        return True
    return False


# ==========================================
# RECORDING OPERATIONS
# ==========================================

def get_recording(db: Session, recording_id: int) -> Optional[Recording]:
    """Get single continuous recording file log."""
    return db.query(Recording).filter(Recording.id == recording_id).first()


def create_recording(db: Session, rec_data: Dict[str, Any]) -> Recording:
    """Log a completed 10-minute recording block."""
    db_rec = Recording(
        camera_id=rec_data["camera_id"],
        file_path=str(rec_data["file_path"]),
        start_time=rec_data["start_time"],
        end_time=rec_data["end_time"],
        file_size=int(rec_data["file_size"]),
        duration=int(rec_data["duration"])
    )
    db.add(db_rec)
    db.commit()
    db.refresh(db_rec)
    return db_rec


def get_recordings(
    db: Session,
    camera_id: int,
    start_date: Optional[date] = None
) -> List[Recording]:
    """List recordings filtered by camera and date."""
    query = db.query(Recording).filter(Recording.camera_id == camera_id)
    if start_date:
        start_dt = datetime.combine(start_date, datetime.min.time())
        end_dt = datetime.combine(start_date, datetime.max.time())
        query = query.filter(Recording.start_time >= start_dt, Recording.start_time <= end_dt)
    return query.order_by(Recording.start_time.desc()).all()


def delete_recording(db: Session, recording_id: int) -> bool:
    """Delete a recording entry."""
    db_rec = get_recording(db, recording_id)
    if db_rec:
        db.delete(db_rec)
        db.commit()
        return True
    return False


# ==========================================
# EMERGENCY CONTACT OPERATIONS
# ==========================================

def get_contacts(db: Session, user_id: int) -> List[EmergencyContact]:
    """Get all emergency contacts for a user."""
    return db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).all()


def create_contact(db: Session, user_id: int, contact_data: Dict[str, Any]) -> EmergencyContact:
    """Create an emergency contact entry."""
    # If is_default is set to 1, make sure others are set to 0 first
    if contact_data.get("is_default", 0) == 1:
        db.query(EmergencyContact).filter(EmergencyContact.user_id == user_id).update({"is_default": 0})
    
    db_contact = EmergencyContact(
        user_id=user_id,
        name=contact_data["name"],
        phone=contact_data.get("phone"),
        email=contact_data.get("email"),
        relationship=contact_data.get("relationship"),
        is_default=contact_data.get("is_default", 0)
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact


def delete_contact(db: Session, contact_id: int) -> bool:
    """Delete an emergency contact."""
    db_contact = db.query(EmergencyContact).filter(EmergencyContact.id == contact_id).first()
    if db_contact:
        db.delete(db_contact)
        db.commit()
        return True
    return False


# ==========================================
# ANALYTICS QUERIES
# ==========================================

def get_alerts_summary(db: Session, user_id: int) -> Dict[str, Any]:
    """Fetch high-level metrics for main dashboard."""
    total_alerts = db.query(Alert).filter(Alert.user_id == user_id).count()
    unresolved_alerts = db.query(Alert).filter(Alert.user_id == user_id, Alert.status != "resolved").count()
    total_cameras = db.query(Camera).filter(Camera.user_id == user_id).count()
    online_cameras = db.query(Camera).filter(Camera.user_id == user_id, Camera.status == "online").count()
    
    # Get last 7 days daily counts
    now = datetime.utcnow()
    # Simplified daily query for standard databases
    daily_stats = []
    
    return {
        "total_alerts": total_alerts,
        "unresolved_alerts": unresolved_alerts,
        "total_cameras": total_cameras,
        "online_cameras": online_cameras
    }


def get_alerts_by_type(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Return counts of alerts grouped by type."""
    results = db.query(
        Alert.anomaly_type,
        func.count(Alert.id).label("count")
    ).filter(Alert.user_id == user_id).group_by(Alert.anomaly_type).all()
    
    return [{"type": r[0], "count": r[1]} for r in results]


def get_alerts_by_camera(db: Session, user_id: int) -> List[Dict[str, Any]]:
    """Return count of alerts grouped by location/camera name."""
    results = db.query(
        Camera.name,
        func.count(Alert.id).label("count")
    ).join(Alert, Alert.camera_id == Camera.id)\
     .filter(Camera.user_id == user_id).group_by(Camera.name).all()
    
    return [{"camera_name": r[0], "count": r[1]} for r in results]
