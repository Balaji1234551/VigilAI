from fastapi import APIRouter, HTTPException, Depends, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel
import base64
import cv2
import numpy as np
import tempfile
import os

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.schemas import DetectionCreate, DetectionResponse
from app.models.schemas import Detection, User, Camera
from app.repositories import DetectionRepository

router = APIRouter()

class MobileFrameUpload(BaseModel):
    base64_image: str
    camera_id: int


@router.post("/", response_model=DetectionResponse, status_code=201)
async def record_detection(
    detection: DetectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """
    Record a newly captured real-time AI anomaly detection.
    Resolves camera ownership to associate the detection user-specifically.
    """
    try:
        # Check if camera exists and resolve owner user_id
        camera = db.query(Camera).filter(Camera.id == detection.camera_id).first()
        if not camera:
            raise HTTPException(
                status_code=404,
                detail=f"Surveillance camera ID {detection.camera_id} not registered"
            )

        # Allow admins/operators to log detections, writing to the camera owner's records
        owner_id = camera.user_id

        db_detection = DetectionRepository.create(db, detection, owner_id)
        return db_detection
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to insert real-time detection: {str(e)}"
        )


@router.get("/", response_model=List[DetectionResponse])
async def search_detections(
    skip: int = 0,
    limit: int = 50,
    camera_id: Optional[int] = None,
    detection_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search and paginate AI detections for the authenticated user."""
    return DetectionRepository.get_all(
        db,
        skip=skip,
        limit=limit,
        camera_id=camera_id,
        detection_type=detection_type,
        start_date=start_date,
        end_date=end_date,
        user_id=current_user.id
    )


@router.get("/{detection_id}", response_model=DetectionResponse)
async def get_detection(
    detection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch single AI detection logs, verifying user ownership."""
    detection = DetectionRepository.get_by_id(db, detection_id, user_id=current_user.id)
    if not detection:
        raise HTTPException(
            status_code=404,
            detail=f"Detection with ID {detection_id} not found"
        )
    return detection

@router.post("/mobile-frame")
async def process_mobile_frame(
    payload: MobileFrameUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.services.video_service import video_streaming_service
        from app.alerts.alert_coordinator import AlertCoordinator
        import time
        from datetime import datetime
        
        # Strip data URL prefix if present
        base64_str = payload.base64_image
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
            
        # Decode Base64 to cv2 image
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
            
        # Run YOLO detection
        detections = video_streaming_service.detector.detect_objects(frame)
        
        # Process detections
        for det in detections:
            class_name = det["class_name"]
            confidence = det["confidence"]
            
            # Put alert in AlertCoordinator queue
            coordinator = AlertCoordinator()
            event_data = {
                "camera_id": payload.camera_id,
                "anomaly_type": class_name.upper(),
                "confidence": confidence,
                "timestamp": datetime.utcnow().isoformat(),
                "raw_frame": frame
            }
            coordinator.alert_queue.put(event_data)
            
            return {"status": "success", "message": f"Detected {class_name}", "detections": detections}
            
        return {"status": "success", "message": "No anomaly detected", "detections": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mobile-video")
async def process_mobile_video(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from app.services.video_service import video_streaming_service
        from app.alerts.alert_coordinator import AlertCoordinator
        import time
        from datetime import datetime
        
        # Save uploaded video chunk to a temporary file
        temp_fd, temp_path = tempfile.mkstemp(suffix=".mp4")
        with os.fdopen(temp_fd, "wb") as f:
            content = await file.read()
            f.write(content)
            
        with open("debug_video.log", "a") as logf:
            logf.write(f"\\n--- New Video Upload ---\\n")
            logf.write(f"File size: {len(content)} bytes\\n")
            
        cap = cv2.VideoCapture(temp_path)
        all_detections = []
        coordinator = AlertCoordinator()
        
        frame_count = 0
        with open("debug_video.log", "a") as logf:
            logf.write(f"cap.isOpened(): {cap.isOpened()}\n")
            
        # Fetch the user's first valid camera to attach the alert to
        from app.models.schemas import Camera
        first_cam = db.query(Camera).filter(Camera.user_id == current_user.id).first()
        valid_camera_id = first_cam.id if first_cam else 1
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Process frame
            detections = video_streaming_service.detector.detect_objects(frame)
            
            for det in detections:
                class_name = det["class_name"]
                confidence = det["confidence"]
                
                # Check if it's an anomaly (assuming non-person objects or specific classes)
                if class_name.upper() in ["WEAPON", "FIRE", "FIGHT", "FALL"]:
                    event_data = {
                        "camera_id": valid_camera_id,
                        "anomaly_type": class_name.upper(),
                        "confidence": confidence,
                        "timestamp": datetime.utcnow().isoformat(),
                        "raw_frame": frame
                    }
                    coordinator.alert_queue.put(event_data)
                    all_detections.append(det)
                    with open("debug_video.log", "a") as logf:
                        logf.write(f"DETECTED: {class_name.upper()} in frame {frame_count}\\n")
                    break # Don't flood the queue with every frame of the same chunk if already detected once
                    
            if all_detections:
                break # Found danger in this chunk, no need to process remaining frames
                
        cap.release()
        os.remove(temp_path)
        
        with open("debug_video.log", "a") as logf:
            logf.write(f"Total frames read: {frame_count}\\n")
            logf.write(f"Anomalies found: {len(all_detections)}\\n")
        
        if all_detections:
            return {"status": "success", "message": "Anomaly detected in video chunk", "detections": all_detections}
        return {"status": "success", "message": "No anomaly detected", "detections": []}
        
    except Exception as e:
        with open("debug_video.log", "a") as logf:
            logf.write(f"EXCEPTION: {str(e)}\\n")
        raise HTTPException(status_code=500, detail=str(e))
