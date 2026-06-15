from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.api.endpoints.auth import require_role
from app.repositories import AuditLogRepository
from app.schemas import AuditLogResponse
from app.models.schemas import User

router = APIRouter()


@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    skip: int = 0,
    limit: int = 50,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """
    [ADMIN ONLY] Fetch chronological system operations and audit trails.
    Allows filtering by user or administrative action type.
    """
    return AuditLogRepository.get_all(db, skip=skip, limit=limit, user_id=user_id, action=action)
