from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.api.endpoints.auth import get_current_user, require_role
from app.repositories import PrivacySettingRepository, AuditLogRepository
from app.schemas import PrivacySettingResponse, PrivacySettingUpdate
from app.models.schemas import User

router = APIRouter()


@router.get("/user/{user_id}", response_model=PrivacySettingResponse)
async def get_user_privacy_settings(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve user's core privacy preferences. Users can only view their own preferences unless they are an admin."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to view privacy preferences for other user accounts"
        )
        
    settings = PrivacySettingRepository.get_by_user_id(db, user_id)
    if not settings:
        raise HTTPException(status_code=404, detail="Privacy settings record not found")
    return settings


@router.put("/user/{user_id}", response_model=PrivacySettingResponse)
async def update_user_privacy_settings(
    user_id: int,
    settings_update: PrivacySettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Modify user's core privacy preferences. Users can only edit their own preferences unless they are an admin."""
    if current_user.id != user_id and current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="You are not authorized to modify privacy preferences for other user accounts"
        )
        
    settings = PrivacySettingRepository.update_settings(db, user_id, settings_update)
    if not settings:
        raise HTTPException(status_code=404, detail="Privacy settings record not found")
        
    # Audit log
    AuditLogRepository.log(
        db,
        user_id=current_user.id,
        action="update_privacy_settings",
        description=f"User updated privacy settings for user ID {user_id}"
    )
    return settings
