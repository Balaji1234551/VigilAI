from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
import time
import random
from app.email_utils import send_verification_email

from app.database import get_db
from app.repositories import UserRepository, AuditLogRepository
from app.schemas import UserCreate, UserResponse, UserLogin, TokenResponse, UserUpdate
from app import auth_utils
from app.models.schemas import User

router = APIRouter()
security_bearer = HTTPBearer()


# --- Pydantic Schemas local to Auth endpoints ---
class FCMTokenUpdate(BaseModel):
    token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr

class EmailRequestSchema(BaseModel):
    email: EmailStr

class VerifyCodeSchema(BaseModel):
    email: EmailStr
    code: str

# Mock OTP Cache
otp_cache: Dict[str, Dict[str, Any]] = {}


# --- JWT Authentication Dependency ---
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """
    FastAPI dependency that extracts and validates the JWT from HTTP Authorization header.
    Returns the currently authenticated database User model.
    """
    token = credentials.credentials
    try:
        payload = jwt.decode(token, auth_utils.SECRET_KEY, algorithms=[auth_utils.ALGORITHM])
        user_id: int = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is invalid: missing user identifier"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials, token is expired or altered"
        )
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user no longer exists"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This user account has been deactivated"
        )
    return user


# --- Role-Based Access Control (RBAC) Dependency ---
def require_role(allowed_roles: list):
    """
    FastAPI dependency wrapper ensuring the current user possesses one of the allowed_roles.
    """
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}. Current role: '{current_user.role}'"
            )
        return current_user
    return dependency


@router.get("/check-email")
async def check_email_exists(email: EmailStr, db: Session = Depends(get_db)):
    """Checks if a user email already exists in the PostgreSQL database."""
    user = UserRepository.get_by_email(db, email)
    return {"exists": user is not None}

@router.post("/send-verification-code")
async def send_verification_code(data: EmailRequestSchema, db: Session = Depends(get_db)):
    """Sends a 6-digit verification code for new user signup."""
    if UserRepository.get_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    code = str(random.randint(100000, 999999))
    otp_cache[data.email] = {"code": code, "expires": time.time() + 600} # 10 mins
    print(f"\n[DEV MODE] Verification Code for {data.email}: {code}\n")
    send_verification_email(data.email, code)
    return {"status": "success", "message": "Verification code sent"}

@router.post("/verify-code")
async def verify_code(data: VerifyCodeSchema):
    """Verifies the 6-digit code during signup."""
    cached = otp_cache.get(data.email)
    if not cached or time.time() > cached["expires"]:
        raise HTTPException(status_code=400, detail="Verification code expired or not found")
    if cached["code"] != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    return {"status": "success", "message": "Email verified successfully"}


@router.post("/signup", response_model=UserResponse, status_code=201)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user, automatically hash passwords, and write signup audit log."""
    existing_user = UserRepository.get_by_email(db, user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = auth_utils.hash_password(user.password)
    new_user = UserRepository.create_user(db, user, hashed_password)

    AuditLogRepository.log(
        db, 
        user_id=new_user.id, 
        action="signup", 
        description=f"User registered with email {new_user.email} and role '{new_user.role}'."
    )
    return new_user


@router.post("/register", response_model=UserResponse, status_code=201)
async def register_alias(user: UserCreate, db: Session = Depends(get_db)):
    """Alias for signup to match frontend registration routes."""
    return await signup(user, db)


@router.post("/login", response_model=TokenResponse)
async def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user credentials, log activity, and return JWT access token."""
    user = UserRepository.get_by_email(db, user_credentials.email)
    
    if not user or not auth_utils.verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid Email or Password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    access_token = auth_utils.create_access_token(data={"user_id": user.id})

    AuditLogRepository.log(
        db, 
        user_id=user.id, 
        action="login", 
        description=f"User {user.email} logged in successfully."
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.full_name,
            "email": user.email,
            "role": user.role,
            "phone": user.phone_number,
            "plan": user.plan
        }
    }


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logout current user. Client-side deletes token, server-side logs audit log."""
    AuditLogRepository.log(
        db, 
        user_id=current_user.id, 
        action="logout", 
        description=f"User {current_user.email} logged out."
    )
    return {"status": "success", "message": "Logged out successfully"}


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Fetch profile of currently authenticated user."""
    return current_user


@router.put("/profile/{email}", response_model=UserResponse)
async def update_profile(
    email: str, 
    user_update: UserUpdate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user settings. Restricted to admins or the owning user."""
    if current_user.email != email and current_user.role != "admin":
        raise HTTPException(
            status_code=403, 
            detail="You are not authorized to update another user's profile"
        )

    updated_user = UserRepository.update_user(db, email, user_update)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")

    AuditLogRepository.log(
        db, 
        user_id=current_user.id, 
        action="update_profile", 
        description=f"Updated settings for profile: {email}"
    )
    return updated_user


@router.put("/settings", response_model=UserResponse)
async def update_settings(
    settings_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update name or phone number settings for the active user."""
    return await update_profile(current_user.email, settings_data, db, current_user)


@router.post("/fcm-token")
async def register_fcm_token(
    token_data: FCMTokenUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload and save client FCM token for push notifications."""
    from app.crud import update_fcm_token
    updated_user = update_fcm_token(db, current_user.id, token_data.token)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Failed to register FCM token")
        
    AuditLogRepository.log(
        db, 
        user_id=current_user.id, 
        action="update_fcm", 
        description="FCM notification token updated."
    )
    return {"status": "success", "message": "FCM Token registered successfully"}


@router.post("/reset-password")
async def reset_password(request: PasswordResetRequest, db: Session = Depends(get_db)):
    """Mockup password reset. Dispatches reset code if email is registered."""
    user = UserRepository.get_by_email(db, request.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email address not found")
        
    AuditLogRepository.log(
        db, 
        user_id=user.id, 
        action="reset_password_request", 
        description=f"Password reset requested for {request.email}"
    )
    # Mocking SMTP send
    return {"status": "success", "message": "Password reset email sent successfully! Please check your inbox."}
