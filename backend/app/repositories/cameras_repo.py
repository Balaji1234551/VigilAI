"""Repository layer for database operations on Cameras."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.models.schemas import Camera
from app.schemas import CameraCreate, CameraUpdate


class CameraRepository:
    """Data access layer for cameras."""

    @staticmethod
    def get_by_id(db: Session, camera_id: int, user_id: Optional[int] = None) -> Optional[Camera]:
        """Fetch a single camera by its integer ID, with optional user filter."""
        query = db.query(Camera).filter(Camera.id == camera_id)
        if user_id is not None:
            query = query.filter(Camera.user_id == user_id)
        return query.first()

    @staticmethod
    def get_all(
        db: Session, 
        skip: int = 0, 
        limit: int = 50, 
        status: Optional[str] = None, 
        user_id: Optional[int] = None
    ) -> List[Camera]:
        """Fetch cameras with pagination and optional user/status filters."""
        query = db.query(Camera)
        if user_id is not None:
            query = query.filter(Camera.user_id == user_id)
        if status:
            query = query.filter(Camera.status == status)
        return query.order_by(desc(Camera.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_count(db: Session, status: Optional[str] = None, user_id: Optional[int] = None) -> int:
        """Count total cameras in database with optional filters."""
        query = db.query(Camera)
        if user_id is not None:
            query = query.filter(Camera.user_id == user_id)
        if status:
            query = query.filter(Camera.status == status)
        return query.count()

    @staticmethod
    def create(db: Session, camera_create: CameraCreate, user_id: int) -> Camera:
        """Create a new camera record associated with a user."""
        db_camera = Camera(**camera_create.dict(), user_id=user_id)
        db.add(db_camera)
        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def update(db: Session, camera_id: int, camera_update: CameraUpdate, user_id: Optional[int] = None) -> Optional[Camera]:
        """Update fields of an existing camera."""
        query = db.query(Camera).filter(Camera.id == camera_id)
        if user_id is not None:
            query = query.filter(Camera.user_id == user_id)
        db_camera = query.first()
        
        if not db_camera:
            return None

        update_data = camera_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_camera, key, value)

        db.commit()
        db.refresh(db_camera)
        return db_camera

    @staticmethod
    def delete(db: Session, camera_id: int, user_id: Optional[int] = None) -> bool:
        """Delete camera record (automatically cascades to live streams, detections, recordings)."""
        query = db.query(Camera).filter(Camera.id == camera_id)
        if user_id is not None:
            query = query.filter(Camera.user_id == user_id)
        db_camera = query.first()
        
        if not db_camera:
            return False
        db.delete(db_camera)
        db.commit()
        return True
