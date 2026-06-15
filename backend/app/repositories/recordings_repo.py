"""Repository layer for database operations on Video Recordings."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional
from app.models.schemas import Recording
from app.schemas import RecordingCreate


class RecordingRepository:
    """Data access layer for MP4 surveillance video records."""

    @staticmethod
    def get_by_id(db: Session, recording_id: int, user_id: Optional[int] = None) -> Optional[Recording]:
        """Fetch recording by ID, with optional user filter."""
        query = db.query(Recording).filter(Recording.id == recording_id)
        if user_id is not None:
            query = query.filter(Recording.user_id == user_id)
        return query.first()

    @staticmethod
    def get_by_camera(
        db: Session, 
        camera_id: int, 
        skip: int = 0, 
        limit: int = 50,
        user_id: Optional[int] = None
    ) -> List[Recording]:
        """Fetch recordings list for a given camera, verifying user ownership."""
        query = db.query(Recording).filter(Recording.camera_id == camera_id)
        if user_id is not None:
            query = query.filter(Recording.user_id == user_id)
            
        return (
            query.order_by(desc(Recording.recording_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create(db: Session, recording_create: RecordingCreate, user_id: int) -> Recording:
        """Log a new video clip recording metadata for a user."""
        db_recording = Recording(
            camera_id=recording_create.camera_id,
            user_id=user_id,
            file_path=recording_create.file_path,
            duration=recording_create.duration,
            storage_type=recording_create.storage_type,
            recording_date=datetime.utcnow(),
            start_time=recording_create.start_time or datetime.utcnow(),
            end_time=recording_create.end_time or datetime.utcnow(),
            file_size=recording_create.file_size or 0
        )
        db.add(db_recording)
        db.commit()
        db.refresh(db_recording)
        return db_recording

    @staticmethod
    def delete(db: Session, recording_id: int, user_id: Optional[int] = None) -> bool:
        """Delete historical video recording record, verifying user ownership."""
        query = db.query(Recording).filter(Recording.id == recording_id)
        if user_id is not None:
            query = query.filter(Recording.user_id == user_id)
        db_recording = query.first()
        
        if not db_recording:
            return False
        db.delete(db_recording)
        db.commit()
        return True
