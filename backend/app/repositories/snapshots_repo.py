"""Repository layer for database operations on Snapshots."""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.schemas import Snapshot
from app.schemas import SnapshotCreate


class SnapshotRepository:
    """Data access layer for threat snapshots."""

    @staticmethod
    def get_by_id(db: Session, snapshot_id: int, user_id: Optional[int] = None) -> Optional[Snapshot]:
        """Fetch a specific image snapshot, with optional user filter."""
        query = db.query(Snapshot).filter(Snapshot.id == snapshot_id)
        if user_id is not None:
            query = query.filter(Snapshot.user_id == user_id)
        return query.first()

    @staticmethod
    def get_by_detection(db: Session, detection_id: int, user_id: Optional[int] = None) -> List[Snapshot]:
        """Fetch all snapshots for a particular AI detection event, with user check."""
        query = db.query(Snapshot).filter(Snapshot.detection_id == detection_id)
        if user_id is not None:
            query = query.filter(Snapshot.user_id == user_id)
        return query.all()

    @staticmethod
    def create(db: Session, snapshot_create: SnapshotCreate, user_id: int) -> Snapshot:
        """Create a new anomaly snapshot entry for a user."""
        db_snapshot = Snapshot(
            detection_id=snapshot_create.detection_id,
            user_id=user_id,
            image_path=snapshot_create.image_path,
            face_blurred=snapshot_create.face_blurred,
            created_at=datetime.utcnow()
        )
        db.add(db_snapshot)
        db.commit()
        db.refresh(db_snapshot)
        return db_snapshot
