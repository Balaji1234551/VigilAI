"""
FastAPI Alerts Router for VigilAI.
Supports listing (paginated, filtered by camera, type, status), details, resolving,
and streaming evidence assets (JPEGs and MP4s) directly from local disk.
"""
import os
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

from database.db import get_db
from database.crud import get_alert_by_id, get_alerts, resolve_alert, delete_alert
from api.auth import get_current_user, UserResponseSchema

router = APIRouter()


# ==========================================
# PYDANTIC SCHEMAS FOR ALERTS
# ==========================================

class AlertResponseSchema(BaseModel):
    id: int
    camera_id: int
    user_id: int
    anomaly_type: str
    confidence: float
    snapshot_path: Optional[str]
    clip_path: Optional[str]
    timestamp: datetime
    status: str
    resolved_at: Optional[datetime]
    alert_sent: int

    class Config:
        from_attributes = True


# ==========================================
# ALERTS REST ENDPOINTS
# ==========================================

@router.get("/list", response_model=List[AlertResponseSchema])
async def list_alerts_route(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    camera_id: Optional[int] = Query(None),
    anomaly_type: Optional[str] = Query("all"),
    status: Optional[str] = Query("all"),
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get paginated alert log.
    Supports filtering by camera ID, anomaly type (FALL, FIGHT, etc.), and status (unread, resolved).
    """
    alerts = get_alerts(
        db, 
        user_id=current_user.id, 
        skip=skip, 
        limit=limit, 
        camera_id=camera_id, 
        anomaly_type=anomaly_type, 
        status=status
    )
    return alerts


@router.get("/{id}", response_model=AlertResponseSchema)
async def get_alert_details_route(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve details of a single alert record.
    """
    alert = get_alert_by_id(db, id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert record not found")
    return alert


@router.put("/{id}/resolve", response_model=AlertResponseSchema)
async def resolve_alert_route(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Resolve a pending alert, logging the current timestamp.
    """
    alert = get_alert_by_id(db, id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert record not found")

    updated_alert = resolve_alert(db, id)
    return updated_alert


@router.delete("/{id}")
async def delete_alert_route(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an alert record. Also purges physical evidence assets from disk.
    """
    alert = get_alert_by_id(db, id)
    if not alert or alert.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Alert record not found")

    # Wipe assets on disk before removing database index
    for path_attr in ["snapshot_path", "clip_path"]:
        file_path_str = getattr(alert, path_attr, None)
        if file_path_str and os.path.exists(file_path_str):
            try:
                os.remove(file_path_str)
            except OSError:
                pass

    success = delete_alert(db, id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion failed")
        
    return {"status": "success", "message": f"Alert {id} deleted successfully."}


@router.get("/{id}/snapshot")
async def get_alert_snapshot(
    id: int,
    db: Session = Depends(get_db)
    # Token dependency is omitted so <img> HTML nodes can fetch directly from browser/app
):
    """
    Serves the face-blurred JPEG evidence image associated with an alert.
    """
    alert = get_alert_by_id(db, id)
    if not alert or not alert.snapshot_path:
        raise HTTPException(status_code=404, detail="Snapshot not found for this alert")

    if not os.path.exists(alert.snapshot_path):
        raise HTTPException(status_code=404, detail="Physical snapshot file missing from server storage")

    return FileResponse(alert.snapshot_path, media_type="image/jpeg")


@router.get("/{id}/clip")
async def get_alert_clip(
    id: int,
    db: Session = Depends(get_db)
    # Token dependency is omitted so video players can stream directly
):
    """
    Streams the 30-second evidence MP4 clip associated with an alert.
    Supports range request headers natively inside FastAPI.
    """
    alert = get_alert_by_id(db, id)
    if not alert or not alert.clip_path:
        raise HTTPException(status_code=404, detail="Video clip not found for this alert")

    if not os.path.exists(alert.clip_path):
        raise HTTPException(status_code=404, detail="Physical video file missing from server storage")

    return FileResponse(alert.clip_path, media_type="video/mp4")
