"""Repository layer for database operations on Live Streams."""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.schemas import LiveStream
from app.schemas import LiveStreamCreate


class LiveStreamRepository:
    """Data access layer for live streams."""

    @staticmethod
    def get_by_id(db: Session, stream_id: int, user_id: Optional[int] = None) -> Optional[LiveStream]:
        """Fetch a single livestream session, with optional user filter."""
        query = db.query(LiveStream).filter(LiveStream.id == stream_id)
        if user_id is not None:
            query = query.filter(LiveStream.user_id == user_id)
        return query.first()

    @staticmethod
    def get_active(db: Session, skip: int = 0, limit: int = 50, user_id: Optional[int] = None) -> List[LiveStream]:
        """Fetch currently active livestream sessions, with optional user filter."""
        query = db.query(LiveStream).filter(LiveStream.stream_status == "active")
        if user_id is not None:
            query = query.filter(LiveStream.user_id == user_id)
            
        return (
            query.order_by(LiveStream.started_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def create(db: Session, stream_create: LiveStreamCreate, user_id: int) -> LiveStream:
        """Record the start of a livestream session associated with a user."""
        db_stream = LiveStream(
            camera_id=stream_create.camera_id,
            user_id=user_id,
            stream_status=stream_create.stream_status,
            bitrate=stream_create.bitrate,
            started_at=datetime.utcnow()
        )
        db.add(db_stream)
        db.commit()
        db.refresh(db_stream)
        return db_stream

    @staticmethod
    def end_stream(
        db: Session, 
        stream_id: int, 
        final_bitrate: Optional[int] = None, 
        user_id: Optional[int] = None
    ) -> Optional[LiveStream]:
        """Mark a livestream session as inactive/ended, with optional user filter."""
        query = db.query(LiveStream).filter(LiveStream.id == stream_id)
        if user_id is not None:
            query = query.filter(LiveStream.user_id == user_id)
        db_stream = query.first()
        
        if not db_stream:
            return None
        
        db_stream.stream_status = "inactive"
        db_stream.ended_at = datetime.utcnow()
        if final_bitrate is not None:
            db_stream.bitrate = final_bitrate

        db.commit()
        db.refresh(db_stream)
        return db_stream
