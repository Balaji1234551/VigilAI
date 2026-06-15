"""Repository layer for database operations on Audit Logs."""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime
from typing import List, Optional
from app.models.schemas import AuditLog


class AuditLogRepository:
    """Data access layer for system administrative logs."""

    @staticmethod
    def get_all(
        db: Session,
        skip: int = 0,
        limit: int = 50,
        user_id: Optional[int] = None,
        action: Optional[str] = None
    ) -> List[AuditLog]:
        """Fetch audit logs with filters and pagination."""
        query = db.query(AuditLog)
        
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
            
        return query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    @staticmethod
    def get_count(
        db: Session,
        user_id: Optional[int] = None,
        action: Optional[str] = None
    ) -> int:
        """Count total audit logs matching parameters."""
        query = db.query(AuditLog)
        if user_id is not None:
            query = query.filter(AuditLog.user_id == user_id)
        if action:
            query = query.filter(AuditLog.action == action)
        return query.count()

    @staticmethod
    def log(
        db: Session,
        user_id: Optional[int],
        action: str,
        description: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        """Create a new administrative audit entry."""
        db_log = AuditLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address=ip_address,
            created_at=datetime.utcnow()
        )
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log
