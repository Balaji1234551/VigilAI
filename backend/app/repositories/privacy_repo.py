from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from app.models.schemas import PrivacyZone
from app.schemas import PrivacyZoneCreate


class PrivacyZoneRepository:
    """Data access layer for privacy zones."""
    
    @staticmethod
    def create_zone(db: Session, zone: PrivacyZoneCreate) -> PrivacyZone:
        """Create a new privacy zone."""
        db_zone = PrivacyZone(**zone.dict())
        db.add(db_zone)
        db.commit()
        db.refresh(db_zone)
        return db_zone
    
    @staticmethod
    def get_zone(db: Session, zone_id: int) -> Optional[PrivacyZone]:
        """Fetch a privacy zone by ID."""
        return db.query(PrivacyZone).filter(PrivacyZone.id == zone_id).first()
    
    @staticmethod
    def get_zones_by_camera(db: Session, camera_id: str, active_only: bool = True) -> List[PrivacyZone]:
        """Fetch all privacy zones for a camera."""
        query = db.query(PrivacyZone).filter(PrivacyZone.camera_id == camera_id)
        if active_only:
            query = query.filter(PrivacyZone.is_active == True)
        return query.order_by(desc(PrivacyZone.created_at)).all()
    
    @staticmethod
    def update_zone(db: Session, zone_id: int, **kwargs) -> Optional[PrivacyZone]:
        """Update a privacy zone."""
        db_zone = db.query(PrivacyZone).filter(PrivacyZone.id == zone_id).first()
        if db_zone:
            for key, value in kwargs.items():
                setattr(db_zone, key, value)
            db.commit()
            db.refresh(db_zone)
        return db_zone
    
    @staticmethod
    def delete_zone(db: Session, zone_id: int) -> bool:
        """Delete a privacy zone."""
        db_zone = db.query(PrivacyZone).filter(PrivacyZone.id == zone_id).first()
        if db_zone:
            db.delete(db_zone)
            db.commit()
            return True
        return False
