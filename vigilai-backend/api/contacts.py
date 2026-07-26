from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from database.db import get_db
from database.crud import get_contacts, create_contact, delete_contact
from database.models import EmergencyContact, User
from api.auth import get_current_user, UserResponseSchema

router = APIRouter()

class ContactCreateSchema(BaseModel):
    name: str
    phone: str
    is_default: int = 0

@router.get("/", response_model=List[dict])
async def list_contacts(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    contacts = get_contacts(db, current_user.id)
    return [
        {
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "is_default": c.is_default
        }
        for c in contacts
    ]

@router.post("/")
async def add_or_update_contact(
    contact: ContactCreateSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if a contact with this name exists, delete it first to 'update'
    existing = db.query(EmergencyContact).filter(
        EmergencyContact.user_id == current_user.id,
        EmergencyContact.name == contact.name
    ).first()
    
    if existing:
        delete_contact(db, existing.id)
        
    new_contact = create_contact(db, current_user.id, {
        "name": contact.name,
        "phone": contact.phone,
        "is_default": contact.is_default
    })
    
    # Also update user SMS preference to True if a primary phone is added
    if contact.is_default == 1:
        db_user = db.query(User).filter(User.id == current_user.id).first()
        user_prefs = db_user.notification_preferences or {}
        if "delivery" not in user_prefs:
            user_prefs["delivery"] = {}
        user_prefs["delivery"]["sms"] = True
        
        # We need to save the prefs to db
        db.query(User).filter(User.id == current_user.id).update({"notification_preferences": user_prefs})
        db.commit()

    return {"status": "success", "id": new_contact.id}
