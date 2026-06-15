"""Repository layer for database operations on AI Detections."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional
from app.models.schemas import Detection
from app.schemas import DetectionCreate


class DetectionRepository:
    """Data access layer for AI anomaly detections."""

    @staticmethod
    def get_by_id(db: Session, detection_id: int, user_id: Optional[int] = None) -> Optional[Detection]:
        """Fetch a specific detection record, with optional user filter."""
        query = db.query(Detection).filter(Detection.id == detection_id)
        if user_id is not None:
            query = query.filter(Detection.user_id == user_id)
        return query.first()

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        camera_id: Optional[int] = None,
        detection_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[int] = None
    ) -> List[Detection]:
        """Query and filter detections with pagination and user restriction."""
        query = db.query(Detection)
        
        if user_id is not None:
            query = query.filter(Detection.user_id == user_id)
        if camera_id is not None:
            query = query.filter(Detection.camera_id == camera_id)
        if detection_type:
            query = query.filter(Detection.detection_type == detection_type)
        if start_date:
            query = query.filter(Detection.detected_at >= start_date)
        if end_date:
            query = query.filter(Detection.detected_at <= end_date)
            
        return query.order_by(desc(Detection.detected_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_count(
        db: Session,
        camera_id: Optional[int] = None,
        detection_type: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> int:
        """Count total detections filtered by camera, type, and user."""
        query = db.query(Detection)
        if user_id is not None:
            query = query.filter(Detection.user_id == user_id)
        if camera_id is not None:
            query = query.filter(Detection.camera_id == camera_id)
        if detection_type:
            query = query.filter(Detection.detection_type == detection_type)
        return query.count()

    @staticmethod
    def create(db: Session, detection_create: DetectionCreate, user_id: int) -> Detection:
        """Insert a newly captured AI detection into the database for a user."""
        db_detection = Detection(
            camera_id=detection_create.camera_id,
            user_id=user_id,
            detection_type=detection_create.detection_type,
            confidence_score=detection_create.confidence_score,
            bounding_box=detection_create.bounding_box,
            pose_data=detection_create.pose_data,
            snapshot_url=detection_create.snapshot_url,
            video_clip_url=detection_create.video_clip_url,
            detected_at=datetime.utcnow()
        )
        db.add(db_detection)
        db.commit()
        db.refresh(db_detection)
        return db_detection
