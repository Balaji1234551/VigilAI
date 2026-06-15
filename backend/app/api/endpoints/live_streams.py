from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import LiveStreamRepository
from app.schemas import LiveStreamCreate, LiveStreamResponse
from app.models.schemas import User

router = APIRouter()


@router.post("/", response_model=LiveStreamResponse, status_code=201)
async def start_livestream(
    stream: LiveStreamCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Start tracking a new camera livestream (admin or operator only)."""
    try:
        return LiveStreamRepository.create(db, stream, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/active", response_model=List[LiveStreamResponse])
async def list_active_streams(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all currently active livestreams for the user."""
    return LiveStreamRepository.get_active(db, skip=skip, limit=limit, user_id=current_user.id)


@router.put("/{stream_id}/end", response_model=LiveStreamResponse)
async def end_livestream(
    stream_id: int,
    final_bitrate: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Mark a livestream tracking session as ended."""
    db_stream = LiveStreamRepository.end_stream(db, stream_id, final_bitrate, user_id=current_user.id)
    if not db_stream:
        raise HTTPException(status_code=404, detail=f"Livestream session ID {stream_id} not found")
    return db_stream
