from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, time, timedelta

from database.db import get_db
from database.models import Camera, Alert, Detection
from api.auth import get_current_user, UserResponseSchema

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated dashboard statistics: active cameras, today's alerts, and average detection confidence.
    """
    # 1. Count active cameras
    active_cameras = db.query(Camera).filter(
        Camera.user_id == current_user.id,
        Camera.status == "online"
    ).count()

    # 2. Count today's alerts
    start_of_today = datetime.combine(datetime.utcnow().date(), time.min)
    alerts_today = db.query(Alert).filter(
        Alert.user_id == current_user.id,
        Alert.timestamp >= start_of_today
    ).count()

    # 3. Average detection confidence for today
    avg_conf_query = db.query(func.avg(Detection.confidence)).join(Camera).filter(
        Camera.user_id == current_user.id,
        Detection.timestamp >= start_of_today
    ).scalar()
    
    avg_confidence = round(avg_conf_query * 100) if avg_conf_query else None

    # 4. System Status
    # Basic logic: If there are cameras online, system is active
    if active_cameras > 0:
        system_status = "All Systems Active"
    else:
        system_status = "System Idle"

    return {
        "active_cameras": active_cameras,
        "alerts_today": alerts_today,
        "avg_confidence": avg_confidence,
        "system_status": system_status
    }

@router.get("/camera/status")
async def get_camera_status(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns online/offline counts for UI conditional rendering.
    """
    online_count = db.query(Camera).filter(Camera.user_id == current_user.id, Camera.status == "online").count()
    return {"active": online_count > 0, "count": online_count}

@router.get("/alerts/today")
async def get_alerts_today(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start_of_today = datetime.combine(datetime.utcnow().date(), time.min)
    count = db.query(Alert).filter(Alert.user_id == current_user.id, Alert.timestamp >= start_of_today).count()
    return {"count": count}

@router.get("/detections/confidence")
async def get_detection_confidence(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    start_of_today = datetime.combine(datetime.utcnow().date(), time.min)
    avg_conf = db.query(func.avg(Detection.confidence)).join(Camera).filter(
        Camera.user_id == current_user.id,
        Detection.timestamp >= start_of_today
    ).scalar()
    return {"avg_confidence": round(avg_conf * 100) if avg_conf else None}
