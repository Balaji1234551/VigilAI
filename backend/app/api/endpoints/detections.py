from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.schemas import DetectionCreate, DetectionResponse
from app.models.schemas import Detection, User, Camera
from app.repositories import DetectionRepository

router = APIRouter()


@router.post("/", response_model=DetectionResponse, status_code=201)
async def record_detection(
    detection: DetectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """
    Record a newly captured real-time AI anomaly detection.
    Resolves camera ownership to associate the detection user-specifically.
    """
    try:
        # Check if camera exists and resolve owner user_id
        camera = db.query(Camera).filter(Camera.id == detection.camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=404,
                detail=f"Surveillance camera ID {detection.camera_id} not registered"
            )

        # Allow admins/operators to log detections, writing to the camera owner's records
        owner_id = camera.user_id

        db_detection = DetectionRepository.create(db, detection, owner_id)
        return db_detection
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to insert real-time detection: {str(e)}"
        )


@router.get("/", response_model=List[DetectionResponse])
async def search_detections(
    skip: int = 0,
    limit: int = 50,
    camera_id: Optional[int] = None,
    detection_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search and paginate AI detections for the authenticated user."""
    return DetectionRepository.get_all(
        db,
        skip=skip,
        limit=limit,
        camera_id=camera_id,
        detection_type=detection_type,
        start_date=start_date,
        end_date=end_date,
        user_id=current_user.id
    )


@router.get("/{detection_id}", response_model=DetectionResponse)
async def get_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch single AI detection logs, verifying user ownership."""
    detection = DetectionRepository.get_by_id(db, detection_id, user_id=current_user.id)
    if not detection:
        raise HTTPException(
            status_code=404,
            detail=f"Detection with ID {detection_id} not found"
        )
    return detection
