"""
Repository layer for database operations - Alerts.
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import List, Optional
from app.models.schemas import Alert, DetectionEvent
from app.schemas import AlertCreate, MonthlyAlertTrend


class AlertRepository:
    """Data access layer for alerts."""
    
    @staticmethod
    def create_alert(db: Session, alert: AlertCreate, user_id: int) -> Alert:
        """Create a new alert associated with a user in the database."""
        db_alert = Alert(
            camera_id=alert.camera_id,
            user_id=user_id,
            anomaly_type=alert.alert_type.upper(),
            alert_type=alert.alert_type,
            confidence=0.8,  # Default fallback
            alert_message=f"Surveillance alert: {alert.alert_type}",
            delivery_method="Push Notification",
            delivery_status="sent",
            timestamp=datetime.utcnow(),
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            status="unread",
            is_resolved=False,
            alert_sent=1
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return db_alert
    
    @staticmethod
    def get_alert(db: Session, alert_id: int, user_id: Optional[int] = None) -> Optional[Alert]:
        """Fetch a single alert by ID, with optional user filter."""
        query = db.query(Alert).filter(Alert.id == alert_id)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        return query.first()
    
    @staticmethod
    def get_alerts_by_camera(db: Session, camera_id: int, limit: int = 50, user_id: Optional[int] = None) -> List[Alert]:
        """Fetch all alerts for a specific camera with user check."""
        query = db.query(Alert).filter(Alert.camera_id == camera_id)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        return (
            query.order_by(desc(Alert.created_at))
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def get_active_alerts(db: Session, limit: int = 20, user_id: Optional[int] = None) -> List[Alert]:
        """Fetch unresolved alerts for a user."""
        query = db.query(Alert).filter(Alert.is_resolved == False)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        return (
            query.order_by(desc(Alert.created_at))
            .limit(limit)
            .all()
        )
    
    @staticmethod
    def get_alerts_by_date_range(
        db: Session, 
        start_date: datetime, 
        end_date: datetime,
        user_id: Optional[int] = None
    ) -> List[Alert]:
        """Fetch alerts within a date range for a user."""
        query = db.query(Alert).filter(Alert.created_at >= start_date, Alert.created_at <= end_date)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        return (
            query.order_by(desc(Alert.created_at))
            .all()
        )
    
    @staticmethod
    def get_monthly_trends(db: Session, camera_id: int, user_id: Optional[int] = None) -> List[MonthlyAlertTrend]:
        """Get monthly alert trends for a camera (last 12 months)."""
        from sqlalchemy import func
        
        one_year_ago = datetime.utcnow() - timedelta(days=365)
        
        query = db.query(
            func.to_char(Alert.created_at, 'YYYY-MM').label('month'),
            Alert.anomaly_type,
            func.count(Alert.id).label('count')
        ).filter(
            Alert.camera_id == camera_id,
            Alert.created_at >= one_year_ago
        )
        
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
            
        results = (
            query.group_by('month', Alert.anomaly_type)
            .order_by('month')
            .all()
        )
        
        return [
            MonthlyAlertTrend(month=row[0], alert_type=row[1], alert_count=row[2])
            for row in results
        ]
    
    @staticmethod
    def update_alert(db: Session, alert_id: int, is_resolved: bool = True, user_id: Optional[int] = None) -> Optional[Alert]:
        """Mark an alert as resolved."""
        query = db.query(Alert).filter(Alert.id == alert_id)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        db_alert = query.first()
        
        if db_alert:
            db_alert.is_resolved = is_resolved
            db_alert.status = "resolved" if is_resolved else "unread"
            db_alert.resolved_at = datetime.utcnow() if is_resolved else None
            db_alert.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(db_alert)
        return db_alert
    
    @staticmethod
    def delete_alert(db: Session, alert_id: int, user_id: Optional[int] = None) -> bool:
        """Delete an alert and its associated events."""
        query = db.query(Alert).filter(Alert.id == alert_id)
        if user_id is not None:
            query = query.filter(Alert.user_id == user_id)
        db_alert = query.first()
        
        if db_alert:
            db.delete(db_alert)
            db.commit()
            return True
        return False


class DetectionEventRepository:
    """Data access layer for detection events."""
    
    @staticmethod
    def add_event(
        db: Session,
        alert_id: int,
        event_type: str,
        description: str = None,
        confidence: float = 0.0
    ) -> DetectionEvent:
        """Add a detection event to an alert."""
        event = DetectionEvent(
            alert_id=alert_id,
            event_type=event_type,
            description=description,
            confidence=confidence
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
    
    @staticmethod
    def get_alert_events(db: Session, alert_id: int) -> List[DetectionEvent]:
        """Get all events for an alert in chronological order."""
        return (
            db.query(DetectionEvent)
            .filter(DetectionEvent.alert_id == alert_id)
            .order_by(DetectionEvent.timestamp)
            .all()
        )
