from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import AnalyticsRepository
from app.schemas import AnalyticsResponse
from app.models.schemas import User, Alert, Camera

router = APIRouter()


@router.get("/summary", response_model=AnalyticsResponse)
async def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the latest cached dashboard metrics summary for the user."""
    analytics = AnalyticsRepository.get_latest(db, current_user.id)
    if not analytics:
        # Generate on the fly
        analytics = AnalyticsRepository.generate_dashboard_metrics(db, current_user.id)
    return analytics


@router.post("/generate", response_model=AnalyticsResponse, status_code=201)
async def compile_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Trigger an on-demand metrics compile and save analytical logs for the user."""
    try:
        return AnalyticsRepository.generate_dashboard_metrics(db, current_user.id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analytics: {str(e)}")


@router.get("/by-type")
async def get_analytics_by_type(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get counts of alerts grouped by anomaly type for user's pie charts."""
    results = db.query(
        Alert.anomaly_type,
        func.count(Alert.id).label("count")
    ).filter(Alert.user_id == current_user.id).group_by(Alert.anomaly_type).all()
    
    return [{"type": r[0], "count": r[1]} for r in results]


@router.get("/by-camera")
async def get_analytics_by_camera(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get counts of alerts grouped by location/camera name for user's bar charts."""
    results = db.query(
        Camera.camera_name,
        func.count(Alert.id).label("count")
    ).join(Alert, Alert.camera_id == Camera.id)\
     .filter(Camera.user_id == current_user.id)\
     .group_by(Camera.camera_name).all()
     
    return [{"camera_name": r[0], "count": r[1]} for r in results]


@router.get("/heatmap")
async def get_activity_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculates hourly incident activity distribution over the last 7 days for the user.
    Uses PostgreSQL to_char formatting to aggregate counts into 24 hour slots.
    """
    # to_char(Alert.created_at, 'HH24') returns hours as '00' to '23'
    results = db.query(
        func.to_char(Alert.created_at, 'HH24').label("hour"),
        func.count(Alert.id).label("count")
    ).filter(
        Alert.user_id == current_user.id,
        Alert.created_at >= datetime.utcnow() - timedelta(days=7)
    ).group_by("hour").all()

    # Map query output
    db_hour_counts = {r[0]: r[1] for r in results if r[0] is not None}

    # Generate full 24-hour heatmap slots
    complete_heatmap = []
    for h in range(24):
        hour_str = f"{h:02d}"
        count = db_hour_counts.get(hour_str, 0)
        
        complete_heatmap.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "count": count
        })

    return {
        "timeframe": "last_7_days",
        "heatmap": complete_heatmap
    }
