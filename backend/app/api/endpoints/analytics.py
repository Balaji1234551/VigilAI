from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.api.endpoints.auth import get_current_user
from app.repositories.analytics_repo import AnalyticsRepository
from app.models.schemas import User

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    stats = AnalyticsRepository.generate_dashboard_metrics(db, current_user.id)
    trends = AnalyticsRepository.get_trend_counts(db, current_user.id)
    stats["trends"] = trends
    return stats
