"""Repository layer for database operations on Analytics."""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from app.models.schemas import Analytics, Detection, Alert


class AnalyticsRepository:
    """Data access layer for compiled metrics."""

    @staticmethod
    def get_latest(db: Session, user_id: int) -> Optional[Analytics]:
        """Fetch the most recently generated analytics report for a user."""
        return (
            db.query(Analytics)
            .filter(Analytics.user_id == user_id)
            .order_by(Analytics.generated_at.desc())
            .first()
        )

    @staticmethod
    def generate_dashboard_metrics(db: Session, user_id: int) -> Analytics:
        """
        Dynamically calculate and record the latest system analytical snapshot for a user.
        Aggregates counts of Fall, Fight, Weapon, and Loitering anomalies.
        """
        total_detections = db.query(Detection).filter(Detection.user_id == user_id).count()
        total_alerts = db.query(Alert).filter(Alert.user_id == user_id).count()
        
        # Calculate individual threat counts
        fall_count = db.query(Detection).filter(
            Detection.user_id == user_id, Detection.detection_type.ilike("%fall%")
        ).count()
        
        fight_count = db.query(Detection).filter(
            Detection.user_id == user_id, Detection.detection_type.ilike("%fight%")
        ).count()
        
        weapon_count = db.query(Detection).filter(
            Detection.user_id == user_id, Detection.detection_type.ilike("%weapon%")
        ).count()
        
        loitering_count = db.query(Detection).filter(
            Detection.user_id == user_id, Detection.detection_type.ilike("%loiter%")
        ).count()

        db_analytics = Analytics(
            user_id=user_id,
            total_alerts=total_alerts,
            total_detections=total_detections,
            fall_count=fall_count,
            fight_count=fight_count,
            weapon_count=weapon_count,
            loitering_count=loitering_count,
            generated_at=datetime.utcnow()
        )
        db.add(db_analytics)
        db.commit()
        db.refresh(db_analytics)
        return db_analytics
