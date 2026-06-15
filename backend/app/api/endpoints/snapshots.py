from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import SnapshotRepository
from app.schemas import SnapshotCreate, SnapshotResponse
from app.models.schemas import User, Detection

router = APIRouter()


@router.post("/", response_model=SnapshotResponse, status_code=201)
async def create_snapshot(
    snapshot: SnapshotCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Log a newly saved anomaly event snapshot, resolving owner user_id."""
    try:
        # Resolve owner from parent detection
        detection = db.query(Detection).filter(Detection.id == snapshot.detection_id).first()
        if not detection:
            raise HTTPException(status_code=404, detail=f"Parent detection ID {snapshot.detection_id} not found")
            
        owner_id = detection.user_id
        return SnapshotRepository.create(db, snapshot, owner_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/detection/{detection_id}", response_model=List[SnapshotResponse])
async def get_detection_snapshots(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List snapshots captured for a specific AI detection event, verifying user isolation."""
    return SnapshotRepository.get_by_detection(db, detection_id=detection_id, user_id=current_user.id)


@router.get("/{snapshot_id}", response_model=SnapshotResponse)
async def get_snapshot(
    snapshot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single snapshot details, verifying user ownership."""
    snapshot = SnapshotRepository.get_by_id(db, snapshot_id, user_id=current_user.id)
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot ID {snapshot_id} not found")
    return snapshot
