from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import DeviceRepository
from app.schemas import DeviceCreate, DeviceResponse
from app.models.schemas import User

router = APIRouter()


@router.post("/", response_model=DeviceResponse, status_code=201)
async def register_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Register supported hardware device equipment (admin only)."""
    try:
        return DeviceRepository.create(db, device)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[DeviceResponse])
async def list_devices(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List registered physical devices (paginated). Requires authentication."""
    return DeviceRepository.get_all(db, skip=skip, limit=limit)


@router.put("/{device_id}/heartbeat", response_model=DeviceResponse)
async def device_heartbeat(
    device_id: int,
    status: str = "online",
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Log an active status ping from an edge node or server."""
    device = DeviceRepository.update_heartbeat(db, device_id, status)
    if not device:
        raise HTTPException(status_code=404, detail=f"Device with ID {device_id} not registered")
    return device


@router.delete("/{device_id}", status_code=200)
async def remove_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Deregister physical hardware device (admin only)."""
    success = DeviceRepository.delete(db, device_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Device with ID {device_id} not found")
    return {"message": f"Device with ID {device_id} successfully deregistered"}
