"""
Pydantic schemas for request/response validation in VigilAI API.
Provides robust types and schema validations for all 12 core tables plus legacy compliance.
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import List, Optional, Dict, Any


# ==================== User & Auth Schemas (Table 1) ====================

class UserCreate(BaseModel):
    """Request schema for user sign-up."""
    full_name: str = Field(..., alias="name", min_length=2, max_length=150, description="User's full name")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, description="Minimum 6 characters password")
    role: Optional[str] = Field("operator", description="Role of the user (admin, operator, user)")
    phone_number: Optional[str] = Field(None, alias="phone", max_length=30)

    class Config:
        populate_by_name = True


class UserResponse(BaseModel):
    """Response schema for users."""
    id: int
    full_name: str
    email: EmailStr
    role: str
    phone_number: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Request schema for updating user details/preferences."""
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class UserLogin(BaseModel):
    """Request schema for user login."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response schema for login token."""
    access_token: str
    token_type: str
    user: Dict[str, Any]


# ==================== Camera Schemas (Table 2) ====================

class CameraBase(BaseModel):
    camera_name: str = Field(..., max_length=100)
    camera_type: str = Field("IP", max_length=50, description="IP, RTSP, USB, Web")
    stream_url: str = Field(..., max_length=255)
    location: Optional[str] = Field(None, max_length=150)
    status: str = Field("offline", max_length=30)
    resolution: str = Field("1280x720", max_length=30)
    fps: int = Field(30)
    settings: Optional[Dict[str, Any]] = None


class CameraCreate(CameraBase):
    pass


class CameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    camera_type: Optional[str] = None
    stream_url: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    resolution: Optional[str] = None
    fps: Optional[int] = None
    settings: Optional[Dict[str, Any]] = None


class CameraResponse(CameraBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Live Stream Schemas (Table 3) ====================

class LiveStreamCreate(BaseModel):
    camera_id: int
    stream_status: str = Field("inactive", max_length=30)
    bitrate: Optional[int] = None


class LiveStreamResponse(BaseModel):
    id: int
    camera_id: int
    user_id: int
    stream_status: str
    started_at: datetime
    ended_at: Optional[datetime]
    bitrate: Optional[int]

    class Config:
        from_attributes = True


# ==================== Detection Schemas (Table 4) ====================

class DetectionCreate(BaseModel):
    camera_id: int
    detection_type: str = Field(..., description="Fall, Fight, Weapon, Loitering, Intrusion")
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    bounding_box: Optional[Dict[str, Any]] = None
    pose_data: Optional[Dict[str, Any]] = None
    snapshot_url: Optional[str] = None
    video_clip_url: Optional[str] = None


class DetectionResponse(BaseModel):
    id: int
    camera_id: int
    user_id: int
    detection_type: str
    confidence_score: float
    detected_at: datetime
    bounding_box: Optional[Dict[str, Any]]
    pose_data: Optional[Dict[str, Any]]
    snapshot_url: Optional[str]
    video_clip_url: Optional[str]

    class Config:
        from_attributes = True


# ==================== Alert Schemas (Table 5) ====================

class AlertCreateNew(BaseModel):
    """Strict model schema for inserting notifications."""
    detection_id: Optional[int] = None
    camera_id: int
    anomaly_type: str
    alert_type: Optional[str] = None
    alert_message: str
    delivery_method: str = Field("Push Notification", description="SMS, Email, Push Notification")
    delivery_status: str = Field("pending")
    confidence: Optional[float] = 0.0
    snapshot_path: Optional[str] = None
    clip_path: Optional[str] = None


class AlertResponseNew(BaseModel):
    id: int
    user_id: int
    camera_id: int
    detection_id: Optional[int]
    anomaly_type: str
    alert_type: Optional[str]
    alert_message: Optional[str]
    delivery_method: str
    delivery_status: str
    snapshot_path: Optional[str]
    clip_path: Optional[str]
    confidence: float
    status: str
    resolved_at: Optional[datetime]
    sent_at: datetime
    timestamp: datetime

    class Config:
        from_attributes = True


# ==================== Recording Schemas (Table 6) ====================

class RecordingCreate(BaseModel):
    camera_id: int
    file_path: str
    duration: float = 0.0
    storage_type: str = "local"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    file_size: Optional[int] = 0


class RecordingResponse(BaseModel):
    id: int
    camera_id: int
    user_id: int
    file_path: str
    duration: float
    recording_date: datetime
    start_time: datetime
    end_time: datetime
    file_size: int
    storage_type: str

    class Config:
        from_attributes = True


# ==================== Snapshot Schemas (Table 7) ====================

class SnapshotCreate(BaseModel):
    detection_id: int
    image_path: str
    face_blurred: bool = False


class SnapshotResponse(BaseModel):
    id: int
    detection_id: int
    user_id: int
    image_path: str
    face_blurred: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Analytics Schemas (Table 8) ====================

class AnalyticsResponse(BaseModel):
    id: int
    user_id: int
    total_alerts: int
    total_detections: int
    fall_count: int
    fight_count: int
    weapon_count: int
    loitering_count: int
    generated_at: datetime

    class Config:
        from_attributes = True


# ==================== Device Schemas (Table 9) ====================

class DeviceCreate(BaseModel):
    device_name: str
    device_type: str = "edge_node"  # camera, edge_node, server
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    status: str = "offline"


class DeviceResponse(BaseModel):
    id: int
    device_name: str
    device_type: str
    ip_address: Optional[str]
    mac_address: Optional[str]
    status: str
    last_connected: Optional[datetime]

    class Config:
        from_attributes = True


# ==================== Privacy Settings Schemas (Table 10) ====================

class PrivacySettingCreate(BaseModel):
    user_id: int
    face_blur_enabled: bool = True
    local_storage_only: bool = False
    cloud_backup_enabled: bool = False
    data_retention_days: int = 30


class PrivacySettingUpdate(BaseModel):
    face_blur_enabled: Optional[bool] = None
    local_storage_only: Optional[bool] = None
    cloud_backup_enabled: Optional[bool] = None
    data_retention_days: Optional[int] = None


class PrivacySettingResponse(BaseModel):
    id: int
    user_id: int
    face_blur_enabled: bool
    local_storage_only: bool
    cloud_backup_enabled: bool
    data_retention_days: int

    class Config:
        from_attributes = True


# ==================== Audit Log Schemas (Table 11) ====================

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    description: Optional[str]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ==================== Emergency Contact Schemas (Table 12) ====================

class EmergencyContactCreate(BaseModel):
    name: str = Field(..., max_length=100)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = Field(None)
    relationship: Optional[str] = Field(None, max_length=50)
    is_default: Optional[bool] = False


class EmergencyContactResponse(BaseModel):
    id: int
    user_id: int
    name: str
    phone: Optional[str]
    email: Optional[EmailStr]
    relationship: Optional[str]
    is_default: bool

    class Config:
        from_attributes = True


# ==================== Pagination & Wrapper Schemas ====================

class PaginatedResponse(BaseModel):
    total: int
    page: int
    limit: int
    results: List[Any]


# ====================================================================
# LEGACY SCHEMAS (Ensuring absolute backward compatibility)
# ====================================================================

class DetectionEventBase(BaseModel):
    event_type: str
    description: Optional[str] = None
    confidence: float = 0.0


class DetectionEventCreate(DetectionEventBase):
    pass


class DetectionEvent(DetectionEventBase):
    id: int
    alert_id: int
    timestamp: datetime
    
    class Config:
        from_attributes = True


class AlertBase(BaseModel):
    alert_type: str
    camera_id: str
    severity: str = "medium"


class AlertCreate(AlertBase):
    pass


class Alert(AlertBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_resolved: bool
    detection_events: List[DetectionEvent] = []
    
    class Config:
        from_attributes = True


class AlertDetails(BaseModel):
    id: int
    alert_type: str
    camera_id: str
    severity: str
    created_at: datetime
    updated_at: datetime
    is_resolved: bool
    events: List[DetectionEvent]
    
    class Config:
        from_attributes = True


class PrivacyZoneBase(BaseModel):
    name: Optional[str] = None
    x: int
    y: int
    width: int
    height: int
    is_active: bool = True


class PrivacyZoneCreate(PrivacyZoneBase):
    camera_id: str


class PrivacyZone(PrivacyZoneBase):
    id: int
    camera_id: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class PrivacyZonesApply(BaseModel):
    zones: List[Dict[str, Any]]


class TrustedPersonBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: bool = True


class TrustedPersonCreate(TrustedPersonBase):
    pass


class TrustedPerson(TrustedPersonBase):
    id: int
    added_at: datetime
    embedding_model: str
    
    class Config:
        from_attributes = True


class MonthlyAlertTrend(BaseModel):
    month: str
    alert_count: int
    alert_type: str


class CameraStats(BaseModel):
    camera_id: str
    total_alerts: int
    active_privacy_zones: int
    trusted_persons_count: int
    last_alert_time: Optional[datetime] = None
