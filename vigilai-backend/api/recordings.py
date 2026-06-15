"""
FastAPI Recordings Router for VigilAI.
Supports listing continuous 10-minute camera archives, streaming mp4 files,
deleting files, and fetching storage capacity diagnostics.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import date, datetime
from pydantic import BaseModel

from database.db import get_db
from database.crud import get_recording, get_recordings, delete_recording
from api.auth import get_current_user, UserResponseSchema
from video.camera_manager import CameraManager
from video.recorder import RecordingManager

router = APIRouter()


# ==========================================
# PYDANTIC SCHEMAS FOR RECORDINGS
# ==========================================

class RecordingResponseSchema(BaseModel):
    id: int
    camera_id: int
    file_path: str
    start_time: datetime
    end_time: datetime
    file_size: int
    duration: int

    class Config:
        from_attributes = True


# ==========================================
# RECORDINGS REST ENDPOINTS
# ==========================================

@router.get("/list", response_model=List[RecordingResponseSchema])
async def list_recordings_route(
    camera_id: int,
    date_filter: Optional[str] = Query(None, description="ISO format date (YYYY-MM-DD)"),
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all continuous recordings for a given camera.
    Supports filtering by a specific date.
    """
    parsed_date = None
    if date_filter:
        try:
            parsed_date = date.fromisoformat(date_filter)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Must be YYYY-MM-DD")

    recordings = get_recordings(db, camera_id=camera_id, start_date=parsed_date)
    return recordings


@router.get("/{id}/play")
async def stream_recording_segment(
    id: int,
    db: Session = Depends(get_db)
    # Token dependency is omitted so HTML5 players can stream natively
):
    """
    Streams a 10-minute continuous archive MP4 segment.
    FastAPI handles HTTP range requests automatically.
    """
    rec = get_recording(db, id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recording log not found")

    if not os.path.exists(rec.file_path):
        raise HTTPException(status_code=404, detail="Physical video segment file missing from server disk")

    return FileResponse(rec.file_path, media_type="video/mp4")


@router.delete("/{id}")
async def delete_recording_segment(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove continuous recording log and delete the physical video segment from disk.
    """
    rec = get_recording(db, id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recording log not found")

    # Purge physical file
    if os.path.exists(rec.file_path):
        try:
            os.remove(rec.file_path)
        except OSError as e:
            logger.error(f"Failed deleting recording file {rec.file_path}: {e}")

    success = delete_recording(db, id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion transaction failed")

    return {"status": "success", "message": f"Recording {id} purged successfully."}


@router.get("/storage")
async def get_storage_footprint(
    current_user: UserResponseSchema = Depends(get_current_user)
):
    """
    Get server continuous recording storage diagnostics (total file sizes, file counts, and GB usage).
    """
    camera_manager = CameraManager()
    recorder_manager = RecordingManager(camera_manager)
    
    diagnostics = recorder_manager.get_storage_diagnostics()
    return diagnostics
