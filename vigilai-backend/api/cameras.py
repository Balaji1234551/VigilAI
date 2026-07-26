"""
FastAPI Camera Management Router for VigilAI.
Implements Camera Adding, Listing, Settings edits, Streaming MJPEG, Deleting, and testing connectivity.
"""
import cv2
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from database.db import get_db, Base
from database.crud import get_camera, get_cameras, create_camera, update_camera_settings, delete_camera, update_camera_status
from api.auth import get_current_user, UserResponseSchema
from video.camera_manager import CameraManager
from video.recorder import RecordingManager
from video.streamer import generate_mjpeg_stream
from detection.detection_manager import DetectionManager

router = APIRouter()


# ==========================================
# PYDANTIC SCHEMAS FOR CAMERAS
# ==========================================

class CameraAddSchema(BaseModel):
    name: str
    location: Optional[str] = "Main Entrance"
    type: str  # 'usb', 'rtsp', 'ip_webcam'
    url: str   # '0' for webcam, rtsp URL, or shot URL
    settings: Optional[Dict[str, Any]] = {
        "loiter_time": 30,
        "enabled_detections": ["FALL", "WEAPON", "FIGHT", "LOITERING"],
        "quiet_hours": {"enabled": False, "start": "22:00", "end": "06:00"}
    }


class CameraResponseSchema(BaseModel):
    id: int
    user_id: int
    name: str
    location: Optional[str]
    type: str
    url: str
    status: str
    settings: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class ConnectionTestSchema(BaseModel):
    url: str


# ==========================================
# CAMERA MANAGEMENT ENDPOINTS
# ==========================================

@router.post("/add", response_model=CameraResponseSchema, status_code=status.HTTP_201_CREATED)
async def add_camera_route(
    camera_data: CameraAddSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a new camera stream.
    Instantly spins up thread capture loops and continuous continuous recorder workers.
    """
    cam_dict = camera_data.dict()
    new_cam = create_camera(db, current_user.id, cam_dict)

    # Automatically initialize threads inside CameraManager and RecordingManager
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    # Start thread
    camera_manager.start_camera(new_cam.id, new_cam.name, new_cam.url)
    recording_manager.start_recording(new_cam.id)
    
    # Update status to online in database
    update_camera_status(db, new_cam.id, "online")
    db.refresh(new_cam)
    
    return new_cam


@router.get("/list", response_model=List[CameraResponseSchema])
async def list_cameras_route(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all cameras belonging to the active authenticated user.
    """
    cameras = get_cameras(db, current_user.id)
    
    # Refresh live status indicators dynamically based on camera capture threads
    camera_manager = CameraManager()
    for cam in cameras:
        thread = camera_manager.get_thread(cam.id)
        current_status = "offline"
        if thread and thread.is_connected:
            current_status = "online"
            
        if cam.status != current_status:
            update_camera_status(db, cam.id, current_status)
            cam.status = current_status
            
    return cameras


@router.get("/{id}/status")
async def get_camera_status_route(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get live connection status of a camera.
    """
    cam = get_camera(db, id)
    if not cam or cam.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_manager = CameraManager()
    thread = camera_manager.get_thread(id)
    
    is_connected = thread is not None and thread.is_connected
    current_status = "online" if is_connected else "offline"
    
    if cam.status != current_status:
        update_camera_status(db, id, current_status)

    return {
        "id": id,
        "name": cam.name,
        "status": current_status,
        "is_connected": is_connected,
        "fps": thread.actual_fps if (thread and is_connected) else 0.0
    }


@router.put("/{id}/settings", response_model=CameraResponseSchema)
async def update_camera_settings_route(
    id: int,
    settings: Dict[str, Any],
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Modify configuration settings (such as enabled detections, quiet hours) for a camera.
    """
    cam = get_camera(db, id)
    if not cam or cam.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Camera not found")

    updated_cam = update_camera_settings(db, id, settings)
    return updated_cam


@router.delete("/{id}")
async def delete_camera_route(
    id: int,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Deletes a camera. Instantly tears down its capture threads and active recording processes.
    """
    cam = get_camera(db, id)
    if not cam or cam.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Camera not found")

    # 1. Stop processing threads
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    recording_manager.stop_recording(id)
    camera_manager.stop_camera(id)
    
    # 2. Delete from Database
    success = delete_camera(db, id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion failed")
        
    return {"status": "success", "message": f"Camera {id} deleted successfully."}


@router.get("/{id}/stream")
async def get_mjpeg_stream_route(
    id: int,
    # Token authentication can be skipped for raw img src tags in HTML/Mobile clients
    # but we can optionally restrict using query parameters
):
    """
    MJPEG Live Stream Endpoint.
    Integrates with DetectionManager to draw real-time cyan skeletons and colored boxes.
    """
    detection_manager = DetectionManager()
    return StreamingResponse(
        generate_mjpeg_stream(id, detection_manager),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.post("/test-connection")
async def test_camera_connection(
    data: ConnectionTestSchema,
    current_user: UserResponseSchema = Depends(get_current_user)
):
    """
    Validate if a camera URL or index is reachable without adding it permanently.
    Supports USB, RTSP, and BigBuckBunny HTTP URLs.
    """
    url_str = data.url
    
    # Differentiate local integer indices from string streams
    try:
        source = int(url_str)
    except ValueError:
        source = url_str

    cap = cv2.VideoCapture(source)
    if cap.isOpened():
        ret, frame = cap.read()
        cap.release()
        if ret:
            return {
                "status": "success",
                "message": "Connection test successful! Frame captured.",
                "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
                "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stream opened but failed to retrieve frame. Check stream connectivity."
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to open connection. Ensure correct stream URL, credentials, or webcam permissions."
        )


@router.post("/start")
async def start_camera_endpoint(
    camera_id: Optional[int] = None,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly start a camera (or the webcam if no ID provided)."""
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    if camera_id:
        cam = get_camera(db, camera_id)
        if not cam or cam.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Camera not found")
    else:
        # Default to webcam
        cam = db.query(Base.metadata.tables["cameras"]).filter(
            Base.metadata.tables["cameras"].c.url == "0",
            Base.metadata.tables["cameras"].c.user_id == current_user.id
        ).first()
        if not cam:
            # Create webcam entry if it doesn't exist
            result = db.execute(
                Base.metadata.tables["cameras"].insert().values(
                    user_id=current_user.id,
                    name="Local System Webcam",
                    location="Local Device",
                    type="webcam",
                    url="0",
                    status="online",
                    settings={}
                )
            )
            db.commit()
            new_cid = result.inserted_primary_key[0]
            cam = get_camera(db, new_cid)
            
    camera_manager.start_camera(cam.id, cam.name if hasattr(cam, 'name') else cam[2], cam.url if hasattr(cam, 'url') else cam[5])
    recording_manager.start_recording(cam.id)
    update_camera_status(db, cam.id, "online")
    return {"status": "success", "message": "Camera started", "camera_id": cam.id}


@router.post("/stop")
async def stop_camera_endpoint(
    camera_id: Optional[int] = None,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly stop a camera (or the webcam if no ID provided)."""
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    if camera_id:
        cam = get_camera(db, camera_id)
        if not cam or cam.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Camera not found")
    else:
        # Default to webcam
        cam = db.query(Base.metadata.tables["cameras"]).filter(
            Base.metadata.tables["cameras"].c.url == "0",
            Base.metadata.tables["cameras"].c.user_id == current_user.id
        ).first()
        if not cam:
            raise HTTPException(status_code=404, detail="Webcam not found")

    recording_manager.stop_recording(cam.id)
    camera_manager.stop_camera(cam.id)
    update_camera_status(db, cam.id, "offline")
    return {"status": "success", "message": "Camera stopped", "camera_id": cam.id}
