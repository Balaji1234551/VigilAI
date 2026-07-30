import cv2
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import CameraRepository, AuditLogRepository
from app.schemas import CameraCreate, CameraResponse, CameraUpdate
from app.models.schemas import User, Camera

# Import real-time thread managers
from app.video.camera_manager import CameraManager
from app.video.recorder import RecordingManager
from app.video.streamer import generate_mjpeg_stream
from app.detection.detection_manager import DetectionManager

router = APIRouter()


class ConnectionTestSchema(BaseModel):
    url: str


@router.post("/", response_model=CameraResponse, status_code=201)
async def register_camera(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Register a new camera configuration and instantly boot streaming/recording threads."""
    try:
        db_camera = CameraRepository.create(db, camera, current_user.id)
        
        # Auto-boot capturing loops and recorder workers
        camera_manager = CameraManager()
        recording_manager = RecordingManager(camera_manager)
        
        camera_manager.start_camera(db_camera.id, db_camera.camera_name, db_camera.stream_url)
        recording_manager.start_recording(db_camera.id)
        
        db.refresh(db_camera)

        AuditLogRepository.log(
            db,
            user_id=current_user.id,
            action="register_camera",
            description=f"Camera registered: '{db_camera.camera_name}' (ID: {db_camera.id}) at '{db_camera.location}'"
        )
        return db_camera
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register camera: {str(e)}")


@router.post("/add", response_model=CameraResponse, status_code=201)
async def add_camera_alias(
    camera: CameraCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Alias for camera registration to match frontend routes."""
    return await register_camera(camera, db, current_user)


@router.get("/list", response_model=List[CameraResponse])
async def list_cameras_alias(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias for camera listing to match frontend routes, enforces user isolation."""
    cameras = CameraRepository.get_all(db, skip=skip, limit=limit, status=status, user_id=current_user.id)
    
    # Sync statuses with active connection threads dynamically
    camera_manager = CameraManager()
    for cam in cameras:
        thread = camera_manager.get_thread(cam.id)
        current_status = "online" if (thread and thread.is_connected) else "offline"
        
        if cam.status != current_status:
            cam.status = current_status
            db.commit()
            
    return cameras


@router.get("/", response_model=List[CameraResponse])
async def list_cameras(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all cameras for authenticated user (paginated)."""
    return await list_cameras_alias(skip, limit, status, db, current_user)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single camera details, verifying user ownership."""
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera with ID {camera_id} not found")
    return camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: int,
    camera_update: CameraUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Update camera configuration settings (like quiet hours, thresholds), enforcing ownership."""
    camera = CameraRepository.update(db, camera_id, camera_update, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera with ID {camera_id} not found")
    
    AuditLogRepository.log(
        db,
        user_id=current_user.id,
        action="update_camera",
        description=f"Updated camera config for camera ID {camera_id}"
    )
    return camera


@router.put("/{camera_id}/settings", response_model=CameraResponse)
async def update_camera_settings_alias(
    camera_id: int,
    settings: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias for settings update schema to match React Native put calls."""
    camera_update = CameraUpdate(settings=settings)
    return await update_camera(camera_id, camera_update, db, current_user)


@router.delete("/{camera_id}", status_code=200)
async def delete_camera(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Delete a camera configuration, stop thread loops, and clean up associated tables."""
    # Enforce ownership first
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera with ID {camera_id} not found")

    # Stop live processing threads
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    recording_manager.stop_recording(camera_id)
    camera_manager.stop_camera(camera_id)

    # Delete record
    success = CameraRepository.delete(db, camera_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion failed")
    
    AuditLogRepository.log(
        db,
        user_id=current_user.id,
        action="delete_camera",
        description=f"Deleted camera ID {camera_id} from database."
    )
    return {"message": f"Camera with ID {camera_id} successfully deleted", "status": "success"}


@router.get("/{camera_id}/status")
async def get_camera_status(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get live connection thread status of a camera."""
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    camera_manager = CameraManager()
    thread = camera_manager.get_thread(camera_id)
    
    is_connected = thread is not None and thread.is_connected
    current_status = "online" if is_connected else "offline"
    
    if camera.status != current_status:
        camera.status = current_status
        db.commit()

    return {
        "id": camera_id,
        "name": camera.camera_name,
        "status": current_status,
        "is_connected": is_connected,
        "fps": thread.actual_fps if (thread and is_connected) else 0.0
    }


@router.get("/{camera_id}/stream")
async def get_mjpeg_stream(
    camera_id: int,
    # Token parameters can be verified in query strings or skipped for standard HTML <img> elements
):
    """MJPEG Live Stream Endpoint. Renders real-time computer vision bounding boxes and skeletons."""
    detection_manager = DetectionManager()
    return StreamingResponse(
        generate_mjpeg_stream(camera_id, detection_manager),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.post("/test-connection")
async def test_camera_connection(
    data: ConnectionTestSchema,
    current_user: User = Depends(get_current_user)
):
    """Validate if a camera source is reachable without adding it permanently."""
    url_str = data.url
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


@router.get("/test-stream")
async def get_test_stream(url: str):
    """Provides a smooth, optimized live stream purely for testing connections without saving to the DB."""
    from app.video.streamer import generate_test_stream
    return StreamingResponse(
        generate_test_stream(url),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.post("/start")
async def start_camera_endpoint(
    camera_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly start a camera (or the webcam if no ID provided)."""
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    if camera_id:
        cam = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
        if not cam:
            raise HTTPException(status_code=404, detail="Camera not found")
    else:
        # Default to webcam
        cam = db.query(Camera).filter(
            Camera.stream_url == "0",
            Camera.user_id == current_user.id
        ).first()
        if not cam:
            new_cam = Camera(
                user_id=current_user.id,
                camera_name="Local System Webcam",
                location="Local Device",
                camera_type="webcam",
                stream_url="0",
                status="online"
            )
            db.add(new_cam)
            db.commit()
            db.refresh(new_cam)
            cam = new_cam
            
    camera_manager.start_camera(cam.id, cam.camera_name, cam.stream_url)
    recording_manager.start_recording(cam.id)
    cam.status = "online"
    db.commit()
    return {"status": "success", "message": "Camera started", "camera_id": cam.id}


@router.post("/stop")
async def stop_camera_endpoint(
    camera_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Explicitly stop a camera (or the webcam if no ID provided)."""
    camera_manager = CameraManager()
    recording_manager = RecordingManager(camera_manager)
    
    if camera_id:
        cam = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
        if not cam:
            raise HTTPException(status_code=404, detail="Camera not found")
    else:
        # Default to webcam
        cam = db.query(Camera).filter(
            Camera.stream_url == "0",
            Camera.user_id == current_user.id
        ).first()
        if not cam:
            raise HTTPException(status_code=404, detail="Webcam not found")

    recording_manager.stop_recording(cam.id)
    camera_manager.stop_camera(cam.id)
    cam.status = "offline"
    db.commit()
    return {"status": "success", "message": "Camera stopped", "camera_id": cam.id}
