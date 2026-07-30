from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, time

from app.database import get_db
from app.models.schemas import Camera, Alert, Detection
from app.api.endpoints.auth import get_current_user
from app.models.schemas import User

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
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
        Alert.created_at >= start_of_today
    ).count()

    # 3. Average detection confidence for today
    avg_conf_query = db.query(func.avg(Detection.confidence_score)).join(Camera, Detection.camera_id == Camera.id).filter(
        Camera.user_id == current_user.id,
        Detection.created_at >= start_of_today
    ).scalar()
    
    avg_confidence = round(avg_conf_query * 100) if avg_conf_query else None

    # 4. System Status
    if active_cameras > 0:
        system_status = "All Systems Active"
    else:
        system_status = "System Idle"

    return {
        "active_cameras": active_cameras,
        "alerts_today": alerts_today,
        "total_incidents": alerts_today,
        "avg_confidence": avg_confidence,
        "system_status": system_status
    }
