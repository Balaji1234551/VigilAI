from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, time

from app.database import get_db
from app.models.schemas import Camera, Alert
from app.api.endpoints.auth import get_current_user
from app.models.schemas import User

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated dashboard statistics for uploaded videos.
    """
    # 1. Count processed videos
    processed_videos = db.query(Camera).filter(
        Camera.user_id == current_user.id,
        Camera.status == "completed"
    ).count()

    # 2. Count total alerts and average confidence
    total_alerts = db.query(Alert).filter(Alert.user_id == current_user.id).count()
    
    avg_conf_query = db.query(func.avg(Alert.confidence)).filter(
        Alert.user_id == current_user.id
    ).scalar()
    
    avg_confidence = round(avg_conf_query * 100) if avg_conf_query else 0

    # 3. Today's Detection Summary
    start_of_today = datetime.combine(datetime.utcnow().date(), time.min)
    
    todays_alerts = db.query(Alert.anomaly_type, func.count(Alert.id)).filter(
        Alert.user_id == current_user.id,
        Alert.created_at >= start_of_today
    ).group_by(Alert.anomaly_type).all()
    
    summary = {
        "WEAPON": 0,
        "FIRE": 0,
        "SMOKE": 0,
        "PERSON": 0
    }
    
    for anomaly_type, count in todays_alerts:
        upper_type = anomaly_type.upper()
        if upper_type in summary:
            summary[upper_type] = count

    return {
        "processed_videos": processed_videos,
        "total_alerts": total_alerts,
        "avg_confidence": avg_confidence,
        "system_status": "All Systems Active",
        "today_summary": summary
    }
