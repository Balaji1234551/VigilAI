from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import cv2
import numpy as np
from app.database import get_db
from app.repositories import PrivacyZoneRepository
from app.schemas import PrivacyZone, PrivacyZoneCreate, PrivacyZonesApply
from app.services.privacy_service import apply_privacy_zones

router = APIRouter()


@router.post("/zones", response_model=PrivacyZone)
async def create_privacy_zone(zone: PrivacyZoneCreate, db: Session = Depends(get_db)):
    """
    Create a new privacy zone for a camera.
    
    Example:
    {
        "camera_id": "cam_001",
        "name": "Front Door Mailbox",
        "x": 100,
        "y": 150,
        "width": 200,
        "height": 180,
        "is_active": true
    }
    """
    try:
        db_zone = PrivacyZoneRepository.create_zone(db, zone)
        return db_zone
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/zones/{camera_id}", response_model=List[PrivacyZone])
async def get_camera_privacy_zones(
    camera_id: str,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """
    Retrieve all privacy zones for a specific camera.
    """
    zones = PrivacyZoneRepository.get_zones_by_camera(db, camera_id, active_only)
    return zones


@router.get("/zones/{zone_id}/detail", response_model=PrivacyZone)
async def get_privacy_zone(zone_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific privacy zone by ID.
    """
    zone = PrivacyZoneRepository.get_zone(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail="Privacy zone not found")
    return zone


@router.patch("/zones/{zone_id}")
async def update_privacy_zone(
    zone_id: int,
    name: str = None,
    x: int = None,
    y: int = None,
    width: int = None,
    height: int = None,
    is_active: bool = None,
    db: Session = Depends(get_db)
):
    """
    Update a privacy zone's coordinates or name.
    """
    updates = {k: v for k, v in {
        "name": name,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "is_active": is_active
    }.items() if v is not None}
    
    zone = PrivacyZoneRepository.update_zone(db, zone_id, **updates)
    if not zone:
        raise HTTPException(status_code=404, detail="Privacy zone not found")
    return {"message": "Zone updated", "zone_id": zone.id}


@router.delete("/zones/{zone_id}")
async def delete_privacy_zone(zone_id: int, db: Session = Depends(get_db)):
    """
    Delete a privacy zone.
    """
    success = PrivacyZoneRepository.delete_zone(db, zone_id)
    if not success:
        raise HTTPException(status_code=404, detail="Privacy zone not found")
    return {"message": "Zone deleted"}


@router.post("/apply-zones")
async def apply_privacy_zones_endpoint(request: PrivacyZonesApply):
    """
    Apply privacy zones to a dummy frame for testing.
    In production, this would be integrated into the video processing pipeline.
    """
    # Create a dummy frame for demonstration (e.g., 640x480 RGB image)
    dummy_frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    
    modified_frame = apply_privacy_zones(dummy_frame, request.zones)
    
    # For response, we could return image data or just success
    # Here, return the shape as confirmation
    return {"message": "Privacy zones applied", "frame_shape": modified_frame.shape}


@router.post("/apply-to-image")
async def apply_zones_to_image(
    camera_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Apply all active privacy zones for a camera to an uploaded image.
    """
    try:
        # Read the uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Get active zones for this camera
        zones = PrivacyZoneRepository.get_zones_by_camera(db, camera_id, active_only=True)
        zones_dict = [{"x": z.x, "y": z.y, "w": z.width, "h": z.height} for z in zones]
        
        # Apply privacy zones
        masked_frame = apply_privacy_zones(frame, zones_dict)
        
        # Encode back to JPEG
        _, buffer = cv2.imencode('.jpg', masked_frame)
        
        return {
            "message": "Privacy zones applied to image",
            "zones_applied": len(zones_dict),
            "frame_shape": masked_frame.shape
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")