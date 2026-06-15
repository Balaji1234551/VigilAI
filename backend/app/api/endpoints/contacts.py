from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.api.endpoints.auth import get_current_user
from app.schemas import EmergencyContactCreate, EmergencyContactResponse
from app.models.schemas import User
from app.crud import get_contacts, create_contact, delete_contact

router = APIRouter()


@router.get("/", response_model=List[EmergencyContactResponse])
async def list_emergency_contacts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all emergency contacts registered for the authenticated user."""
    return get_contacts(db, user_id=current_user.id)


@router.post("/", response_model=EmergencyContactResponse, status_code=201)
async def add_emergency_contact(
    contact: EmergencyContactCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a new emergency contact for the user. Automatically sets default option."""
    try:
        return create_contact(db, user_id=current_user.id, contact_data=contact.dict())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to add contact: {str(e)}")


@router.delete("/{contact_id}", status_code=200)
async def remove_emergency_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an emergency contact, ensuring user ownership."""
    # Verify contact belongs to user
    from app.models.schemas import EmergencyContact
    db_contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id, EmergencyContact.user_id == current_user.id
    ).first()
    
    if not db_contact:
        raise HTTPException(status_code=404, detail="Emergency contact not found")

    success = delete_contact(db, contact_id)
    if not success:
        raise HTTPException(status_code=500, detail="Database deletion failed")
        
    return {"message": "Emergency contact deleted successfully", "status": "success"}
