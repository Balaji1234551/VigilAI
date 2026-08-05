from fastapi.responses import Response
from app.detection.report_generator import generate_pdf_report
import os
import shutil
import uuid
import threading
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import CameraRepository, AuditLogRepository
from app.schemas import CameraCreate, CameraResponse, CameraUpdate
from app.models.schemas import User, Camera, Alert
from app.detection.detection_manager import DetectionManager, PROCESSING_PROGRESS

router = APIRouter()

UPLOAD_DIR = "uploads/videos"
PROCESSED_DIR = "uploads/processed"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

@router.post("/upload", response_model=CameraResponse, status_code=201)
async def upload_video(
    file: UploadFile = File(...),
    camera_name: str = Form(...),
    location: str = Form("Unspecified"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Upload an MP4 video file and create a 'Camera' record for it to track detection status."""
    if not file.filename.endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only MP4 files are supported.")
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    camera_data = CameraCreate(
        camera_name=camera_name,
        camera_type="uploaded_video",
        stream_url=file_path,
        location=location,
        resolution="N/A",
        fps=30
    )
    
    try:
        db_camera = CameraRepository.create(db, camera_data, current_user.id)
        db_camera.status = "pending"
        db.commit()
        db.refresh(db_camera)

        AuditLogRepository.log(
            db,
            user_id=current_user.id,
            action="upload_video",
            description=f"Video uploaded: '{db_camera.camera_name}' (ID: {db_camera.id})"
        )
        return db_camera
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/{camera_id}/process")
async def process_video(
    camera_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Trigger YOLOv8 processing on the uploaded video."""
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if camera.status == "processing":
        raise HTTPException(status_code=400, detail="Video is already processing.")
        
    camera.status = "processing"
    db.commit()
    
    # Run processing asynchronously in background so we don't block the API response
    def run_detection():
        try:
            from app.database import SessionLocal
            db_bg = SessionLocal()
            manager = DetectionManager(alert_queue=None) # Start temporary manager
            manager.process_video_file(camera_id, camera.stream_url, db_bg)
            db_bg.close()
        except Exception as e:
            print(f"Error in background processing: {e}")
            
    background_tasks.add_task(run_detection)
    
    return {"message": "Video processing started.", "status": "processing"}


@router.get("/{camera_id}/progress")
async def get_processing_progress(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")
        
    prog_data = PROCESSING_PROGRESS.get(camera_id, {})
    
    if camera.status == 'completed':
        return {"progress": 100.0, "status": "completed", "stage": "Completed", "error": None}
    elif camera.status == 'failed' or prog_data.get("progress") == -1.0:
        return {"progress": -1.0, "status": "failed", "stage": "Processing Failed", "error": prog_data.get("error")}
        
    # Return the current progress (default 0.0 if not started)
    current_prog = prog_data.get("progress", 0.0)
    current_stage = prog_data.get("stage", "Starting...")
    return {"progress": current_prog, "status": camera.status, "stage": current_stage, "error": None}


@router.post("/{camera_id}/retry")
async def retry_processing(
    camera_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if camera.status == "processing":
        raise HTTPException(status_code=400, detail="Video is already processing.")
        
    camera.status = "processing"
    PROCESSING_PROGRESS[camera_id] = 0.0
    db.commit()
    
    def run_detection():
        try:
            from app.database import SessionLocal
            db_bg = SessionLocal()
            manager = DetectionManager(alert_queue=None)
            manager.process_video_file(camera_id, camera.stream_url, db_bg)
            db_bg.close()
        except Exception as e:
            print(f"Error in background processing: {e}")
            
    background_tasks.add_task(run_detection)
    return {"message": "Video processing restarted.", "status": "processing"}


@router.get("/list", response_model=List[CameraResponse])
async def list_videos(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all uploaded videos for authenticated user."""
    return CameraRepository.get_all(db, skip=skip, limit=limit, status=status, user_id=current_user.id)


@router.get("/", response_model=List[CameraResponse])
async def list_cameras(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias for list."""
    return await list_videos(skip, limit, status, db, current_user)


@router.get("/{camera_id}", response_model=CameraResponse)
async def get_video(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get single video details."""
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")
    return camera


@router.delete("/{camera_id}", status_code=200)
async def delete_video(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Delete a video and its processed files."""
    camera = CameraRepository.get_by_id(db, camera_id, user_id=current_user.id)
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete local files
    if camera.stream_url and os.path.exists(camera.stream_url):
        os.remove(camera.stream_url)
        
    # Deep sweep: Delete ALL related physical files from the hard drive
    import glob
    
    # 1. Processed videos
    processed_file = os.path.join(PROCESSED_DIR, f"{camera.id}_processed.mp4")
    if os.path.exists(processed_file):
        os.remove(processed_file)
        
    # 2. Snapshots
    snapshot_pattern = os.path.join("uploads", "snapshots", f"{camera.id}_*.*")
    for file_path in glob.glob(snapshot_pattern):
        try:
            os.remove(file_path)
        except Exception:
            pass

    # 3. Video clips (if any)
    clips_pattern = os.path.join("uploads", "clips", f"{camera.id}_*.*")
    for file_path in glob.glob(clips_pattern):
        try:
            os.remove(file_path)
        except Exception:
            pass

    success = CameraRepository.delete(db, camera_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion failed")
    
    return {"message": "Video successfully deleted", "status": "success"}

from fastapi import Query
from jose import jwt, JWTError
from app import auth_utils

def get_user_from_query(token: str = Query(...), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        user_id: int = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@router.get("/{camera_id}/report")
def get_camera_report(
    camera_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_user_from_query)
):
    camera = db.query(Camera).filter(Camera.id == camera_id, Camera.user_id == current_user.id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Video not found")
        
    alerts = db.query(Alert).filter(Alert.camera_id == camera_id).order_by(Alert.timestamp.asc()).all()
    
    video_data = {
        "camera_name": camera.camera_name,
        "created_at": str(camera.created_at),
        "processing_duration": camera.processing_duration,
        "total_frames": camera.total_frames,
        "total_detections": camera.total_detections,
        "avg_confidence": camera.avg_confidence,
        "max_confidence": camera.max_confidence,
        "min_confidence": camera.min_confidence,
        "object_counts": camera.object_counts or {}
    }
    
    alert_list = [
        {"timestamp": str(a.timestamp), "anomaly_type": a.anomaly_type, "confidence": a.confidence}
        for a in alerts
    ]
    
    pdf_bytes = generate_pdf_report(video_data, alert_list)
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=vigilai_report_{camera_id}.pdf"}
    )
