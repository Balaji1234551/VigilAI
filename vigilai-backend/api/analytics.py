"""
FastAPI Analytics Router for VigilAI.
Aggregates statistical security insights including alert summaries, anomaly types,
camera rankings, and 24-hour hourly distribution heatmaps.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from datetime import datetime, timedelta

from database.db import get_db
from database.crud import get_alerts_summary, get_alerts_by_type, get_alerts_by_camera
from database.models import Alert
from api.auth import get_current_user, UserResponseSchema

router = APIRouter()


@router.get("/summary")
async def get_analytics_summary_route(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard metric aggregates: total alerts, unresolved alerts, and camera status counts.
    """
    summary = get_alerts_summary(db, current_user.id)
    return summary


@router.get("/by-type")
async def get_analytics_by_type_route(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get counts of alerts grouped by anomaly type (FALL, FIGHT, WEAPON, LOITERING).
    Useful for rendering pie charts or bar graphs.
    """
    results = get_alerts_by_type(db, current_user.id)
    return results


@router.get("/by-camera")
async def get_analytics_by_camera_route(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get count of alerts grouped by location/camera name.
    Identifies high-risk surveillance zones.
    """
    results = get_alerts_by_camera(db, current_user.id)
    return results


@router.get("/heatmap")
async def get_activity_heatmap(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Calculates hourly incident activity distribution over the last 7 days.
    Groups events into 24-hour bins (00:00 to 23:00) using SQLite string-time formatting.
    Guarantees all 24 slots are filled so frontend charts plot correctly.
    """
    # 1. Query PostgreSQL for hourly event aggregates
    # extract('hour') gets the hour 0-23
    results = db.query(
        func.extract("hour", Alert.timestamp).label("hour"),
        func.count(Alert.id).label("count")
    ).filter(
        Alert.user_id == current_user.id,
        Alert.timestamp >= datetime.utcnow() - timedelta(days=7)
    ).group_by("hour").all()

    # 2. Map query outputs to dictionary (converting float/Decimal to int)
    db_hour_counts = {int(float(r[0])): r[1] for r in results if r[0] is not None}

    # 3. Create full 24-hour layout, filling missing slots with 0 counts
    complete_heatmap = []
    for h in range(24):
        count = db_hour_counts.get(h, 0)
        
        complete_heatmap.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "count": count
        })

    return {
        "timeframe": "last_7_days",
        "heatmap": complete_heatmap
    }
