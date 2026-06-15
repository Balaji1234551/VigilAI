"""Repository layer for database operations on Devices."""
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from app.models.schemas import Device
from app.schemas import DeviceCreate


class DeviceRepository:
    """Data access layer for hardware components."""

    @staticmethod
    def get_by_id(db: Session, device_id: int) -> Optional[Device]:
        """Fetch device by integer ID."""
        return db.query(Device).filter(Device.id == device_id).first()

    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 50) -> List[Device]:
        """Fetch list of all hardware devices with pagination."""
        return db.query(Device).offset(skip).limit(limit).all()

    @staticmethod
    def create(db: Session, device_create: DeviceCreate) -> Device:
        """Register a new processing device."""
        db_device = Device(
            device_name=device_create.device_name,
            device_type=device_create.device_type,
            ip_address=device_create.ip_address,
            mac_address=device_create.mac_address,
            status=device_create.status,
            last_connected=datetime.utcnow()
        )
        db.add(db_device)
        db.commit()
        db.refresh(db_device)
        return db_device

    @staticmethod
    def update_heartbeat(db: Session, device_id: int, status: str = "online") -> Optional[Device]:
        """Update last active connection ping timestamp."""
        db_device = db.query(Device).filter(Device.id == device_id).first()
        if not db_device:
            return None
        db_device.status = status
        db_device.last_connected = datetime.utcnow()
        db.commit()
        db.refresh(db_device)
        return db_device

    @staticmethod
    def delete(db: Session, device_id: int) -> bool:
        """Remove a device registration."""
        db_device = db.query(Device).filter(Device.id == device_id).first()
        if not db_device:
            return False
        db.delete(db_device)
        db.commit()
        return True
