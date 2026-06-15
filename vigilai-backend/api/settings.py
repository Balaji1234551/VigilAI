from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel
import json
from database.db import get_db
from database.models import UserSetting
from api.auth import get_current_user, UserResponseSchema

router = APIRouter()

class SettingItemSchema(BaseModel):
    setting_name: str
    setting_value: str

class SettingsBulkUpdateSchema(BaseModel):
    settings: List[SettingItemSchema]

@router.get("/")
async def get_all_settings(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fetch all persistent settings for the authenticated user.
    """
    settings = db.query(UserSetting).filter(UserSetting.user_id == current_user.id).all()
    
    # Return as a simple key-value dictionary for easy frontend parsing
    result = {}
    for s in settings:
        try:
            # If it's a JSON string, parse it. Otherwise return the raw string.
            if s.setting_value in ['true', 'false']:
                result[s.setting_name] = s.setting_value == 'true'
            else:
                result[s.setting_name] = s.setting_value
        except Exception:
            result[s.setting_name] = s.setting_value

    return result

@router.post("/")
async def update_settings(
    data: SettingsBulkUpdateSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Bulk update persistent user settings.
    """
    for item in data.settings:
        existing_setting = db.query(UserSetting).filter(
            UserSetting.user_id == current_user.id,
            UserSetting.setting_name == item.setting_name
        ).first()

        val = item.setting_value
        if isinstance(val, bool):
            val = 'true' if val else 'false'

        if existing_setting:
            existing_setting.setting_value = str(val)
        else:
            new_setting = UserSetting(
                user_id=current_user.id,
                setting_name=item.setting_name,
                setting_value=str(val)
            )
            db.add(new_setting)

    db.commit()
    return {"status": "success", "message": "Settings saved successfully"}
