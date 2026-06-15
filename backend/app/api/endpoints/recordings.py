import os
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import RecordingRepository
from app.schemas import RecordingCreate, RecordingResponse
from app.models.schemas import User

# Import thread managers for diagnostics
from app.video.camera_manager import CameraManager
from app.video.recorder import RecordingManager

router = APIRouter()


@router.post("/", response_model=RecordingResponse, status_code=201)
async def register_recording(
    recording: RecordingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Log a newly recorded video clip file in the system."""
    try:
        return RecordingRepository.create(db, recording, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list", response_model=List[RecordingResponse])
async def list_recordings_route(
    camera_id: int,
    date_filter: Optional[str] = Query(None, description="ISO format date (YYYY-MM-DD)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all continuous recordings for a given camera (enforces user isolation).
    Supports filtering by YYYY-MM-DD.
    """
    parsed_date = None
    if date_filter:
        try:
            parsed_date = date.fromisoformat(date_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Must be YYYY-MM-DD")

    recordings = RecordingRepository.get_by_camera(
        db, camera_id=camera_id, skip=0, limit=100, user_id=current_user.id
    )
    
    # Filter by date in Python if requested
    if parsed_date:
        recordings = [
            r for r in recordings 
            if r.start_time.date() == parsed_date
        ]
        
    return recordings


@router.get("/camera/{camera_id}", response_model=List[RecordingResponse])
async def get_camera_recordings(
    camera_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List recordings associated with a camera (paginated). Enforces user isolation."""
    return RecordingRepository.get_by_camera(db, camera_id=camera_id, skip=skip, limit=limit, user_id=current_user.id)


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a single video recording clip, verifying user ownership."""
    recording = RecordingRepository.get_by_id(db, recording_id, user_id=current_user.id)
    if not recording:
        raise HTTPException(status_code=404, detail=f"Recording ID {recording_id} not found")
    return recording


@router.get("/{recording_id}/play")
async def stream_recording_segment(
    recording_id: int,
    db: Session = Depends(get_db)
):
    """
    Streams a 10-minute continuous archive MP4 segment (supports HTTP range requests).
    Token validation is bypassed to allow HTML5 <video> streaming compatibility.
    """
    rec = db.query(RecordingRepository.get_by_id(db, recording_id)).first()
    if not rec:
        # Retry querying directly
        from app.models.schemas import Recording as DBRec
        rec = db.query(DBRec).filter(DBRec.id == recording_id).first()
        
    if not rec:
        raise HTTPException(status_code=404, detail="Recording log not found")

    if not os.path.exists(rec.file_path):
        raise HTTPException(status_code=404, detail="Physical video segment file missing from server disk")

    return FileResponse(rec.file_path, media_type="video/mp4")


@router.delete("/{recording_id}", status_code=200)
async def delete_recording(
    recording_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Delete a video recording clip metadata record and physical file from disk."""
    recording = RecordingRepository.get_by_id(db, recording_id, user_id=current_user.id)
    if not recording:
        raise HTTPException(status_code=404, detail=f"Recording ID {recording_id} not found")

    # Purge physical file
    if os.path.exists(recording.file_path):
        try:
            os.remove(recording.file_path)
        except OSError:
            pass

    success = RecordingRepository.delete(db, recording_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion transaction failed")
        
    return {"message": f"Recording ID {recording_id} successfully deleted", "status": "success"}


@router.get("/storage")
async def get_storage_footprint(
    current_user: User = Depends(get_current_user)
):
    """Get server continuous recording storage diagnostics (total file sizes, file counts, and GB usage)."""
    camera_manager = CameraManager()
    recorder_manager = RecordingManager(camera_manager)
    return recorder_manager.get_storage_diagnostics()
