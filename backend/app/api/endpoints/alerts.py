import os
from fastapi import APIRouter, HTTPException, Depends, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.schemas import AlertCreateNew, AlertResponseNew, MonthlyAlertTrend
from app.models.schemas import Alert, Detection, User
from app.repositories import AlertRepository

router = APIRouter()


@router.post("/", response_model=AlertResponseNew, status_code=201)
async def trigger_alert(
    alert: AlertCreateNew,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Trigger a new alert notification linked to a detection (admin or operator)."""
    try:
        # Resolve user_id from camera ownership
        from app.repositories import CameraRepository
        camera = CameraRepository.get_by_id(db, alert.camera_id, user_id=current_user.id)
        if not camera:
            raise HTTPException(status_code=404, detail="Camera not found or does not belong to user")

        db_alert = Alert(
            user_id=current_user.id,
            camera_id=alert.camera_id,
            detection_id=alert.detection_id,
            anomaly_type=alert.anomaly_type.upper(),
            alert_type=alert.anomaly_type,
            confidence=alert.confidence or 0.0,
            alert_message=alert.alert_message,
            delivery_method=alert.delivery_method,
            delivery_status=alert.delivery_status,
            snapshot_path=alert.snapshot_path,
            clip_path=alert.clip_path,
            timestamp=datetime.utcnow(),
            sent_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
            status="unread"
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        return db_alert
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create alert: {str(e)}")


@router.get("/list", response_model=List[AlertResponseNew])
async def list_alerts_alias(
    skip: int = 0,
    limit: int = 50,
    camera_id: Optional[int] = None,
    anomaly_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Alias for alerts logs list, enforcing user isolation."""
    query = db.query(Alert).filter(Alert.user_id == current_user.id)
    if camera_id is not None:
        query = query.filter(Alert.camera_id == camera_id)
    if anomaly_type and anomaly_type.lower() != "all":
        query = query.filter(Alert.anomaly_type == anomaly_type.upper())
    if status and status.lower() != "all":
        query = query.filter(Alert.status == status.lower())
        
    return query.order_by(desc(Alert.created_at)).offset(skip).limit(limit).all()


@router.get("/", response_model=List[AlertResponseNew])
async def list_alerts(
    skip: int = 0,
    limit: int = 50,
    camera_id: Optional[int] = None,
    anomaly_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search and paginate alerts for authenticated user."""
    return await list_alerts_alias(skip, limit, camera_id, anomaly_type, status, db, current_user)


@router.get("/active/list", response_model=List[AlertResponseNew])
async def get_active_alerts(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve unresolved alerts for the dashboard."""
    return AlertRepository.get_active_alerts(db, limit=limit, user_id=current_user.id)


@router.get("/{alert_id}", response_model=AlertResponseNew)
async def get_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a single alert, verifying user ownership."""
    alert = AlertRepository.get_alert(db, alert_id, user_id=current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found")
    return alert


@router.patch("/{alert_id}/resolve", response_model=AlertResponseNew)
async def resolve_alert_patch(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a pending alert as resolved (PATCH)."""
    alert = AlertRepository.update_alert(db, alert_id, is_resolved=True, user_id=current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert record not found")
    return alert


@router.put("/{alert_id}/resolve", response_model=AlertResponseNew)
async def resolve_alert_put(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a pending alert as resolved (PUT)."""
    return await resolve_alert_patch(alert_id, db, current_user)


@router.put("/{alert_id}/delivery-status")
async def update_delivery_status(
    alert_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator"]))
):
    """Update alert delivery confirmation status (sent, failed)."""
    alert = AlertRepository.get_alert(db, alert_id, user_id=current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    alert.delivery_status = status
    db.commit()
    return {"message": "Alert delivery status updated", "alert_id": alert.id, "status": alert.delivery_status}


@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "operator", "user"]))
):
    """Delete an alert record, enforcing user ownership."""
    alert = AlertRepository.get_alert(db, alert_id, user_id=current_user.id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Purge physical evidence file on server storage
    for path in [alert.snapshot_path, alert.clip_path]:
        if path and os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass

    success = AlertRepository.delete_alert(db, alert_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=500, detail="Database delete operation failed")
    return {"message": "Alert record deleted", "status": "success"}


@router.get("/{alert_id}/snapshot")
async def get_alert_snapshot(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Streams the JPEG snapshot image evidence file directly."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert or not alert.snapshot_path:
        raise HTTPException(status_code=404, detail="Snapshot not found for this alert")
        
    if not os.path.exists(alert.snapshot_path):
        raise HTTPException(status_code=404, detail="Physical snapshot file missing from server storage")
        
    return FileResponse(alert.snapshot_path, media_type="image/jpeg")


@router.get("/{alert_id}/clip")
async def get_alert_clip(
    alert_id: int,
    db: Session = Depends(get_db)
):
    """Streams the MP4 video clip evidence file directly (supports Range headers)."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert or not alert.clip_path:
        raise HTTPException(status_code=404, detail="Video clip not found for this alert")
        
    if not os.path.exists(alert.clip_path):
        raise HTTPException(status_code=404, detail="Physical video file missing from server storage")
        
    return FileResponse(alert.clip_path, media_type="video/mp4")


@router.get("/camera/{camera_id}", response_model=List[AlertResponseNew])
async def get_alerts_by_camera(
    camera_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all alerts for a specific camera, enforcing ownership."""
    return AlertRepository.get_alerts_by_camera(db, camera_id, limit=limit, user_id=current_user.id)


@router.get("/trends/{camera_id}", response_model=List[MonthlyAlertTrend])
async def get_monthly_trends(
    camera_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch monthly trend count aggregates for a camera ID, enforcing ownership."""
    return AlertRepository.get_monthly_trends(db, camera_id, user_id=current_user.id)