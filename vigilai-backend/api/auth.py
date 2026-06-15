"""
FastAPI Authentication Router for VigilAI.
Implements User Registration, Login (JWT token generation), Logout, Profile fetch, and FCM token register.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr

from database.db import get_db
from database.crud import get_user_by_email, get_user_by_id, create_user, update_fcm_token
from config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
import random
import time
from utils.email_utils import send_verification_email, send_password_reset_email
from config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


# ==========================================
# PYDANTIC SCHEMAS FOR USER & AUTH
# ==========================================

class LoginRequestSchema(BaseModel):
    email: str
    password: str
    device_info: Optional[str] = None

class UserRegisterSchema(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class EmailRequestSchema(BaseModel):
    email: EmailStr

class VerifyCodeSchema(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordSchema(BaseModel):
    email: EmailStr
    code: str
    new_password: str


class UserResponseSchema(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    plan: str
    notification_preferences: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponseSchema(BaseModel):
    success: bool
    message: str
    token: str
    user: UserResponseSchema


class TokenData(BaseModel):
    user_id: Optional[int] = None


class FCMTokenUpdateSchema(BaseModel):
    token: str


class SettingsUpdateSchema(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class PreferencesUpdateSchema(BaseModel):
    alerts: Optional[Dict[str, bool]] = None
    delivery: Optional[Dict[str, Any]] = None


# ==========================================
# AUTHENTICATION UTILITIES
# ==========================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates an HS256 JWT signed token for authentication."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> UserResponseSchema:
    """
    FastAPI dependency injection to authenticate and secure API endpoints.
    Decodes bearer token and extracts active user model.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials, access token is expired or invalid",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception
        
    user = get_user_by_id(db, user_id=token_data.user_id)
    if user is None:
        raise credentials_exception
    return user


# ==========================================
# USER & AUTH REST ENDPOINTS
# ==========================================

from database.models import OTPVerification

def generate_otp() -> str:
    return str(random.randint(100000, 999999))

@router.post("/send-verification-code")
async def send_verification_code(data: EmailRequestSchema, db: Session = Depends(get_db)):
    """Sends a 6-digit verification code for new user signup."""
    if get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    code = generate_otp()
    
    # Store OTP in Database
    existing_otp = db.query(OTPVerification).filter(OTPVerification.email == data.email).first()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    if existing_otp:
        existing_otp.otp_code = code
        existing_otp.expires_at = expires_at
        existing_otp.verified = 0
    else:
        new_otp = OTPVerification(email=data.email, otp_code=code, expires_at=expires_at, verified=0)
        db.add(new_otp)
    db.commit()

    print(f"\n[DEV MODE] Verification Code for {data.email}: {code}\n")
    try:
        send_verification_email(data.email, code)
    except Exception as e:
        print(f"Failed to send email via SMTP, check configuration. OTP is {code}")
        
    return {"status": "success", "message": "Verification code sent"}

@router.post("/verify-code")
async def verify_code(data: VerifyCodeSchema, db: Session = Depends(get_db)):
    """Verifies the 6-digit code during signup."""
    db_otp = db.query(OTPVerification).filter(OTPVerification.email == data.email).first()
    
    if not db_otp or datetime.utcnow() > db_otp.expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired or not found")
    
    if db_otp.otp_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    db_otp.verified = 1
    db.commit()
    
    return {"status": "success", "message": "Email verified successfully"}

@router.post("/forgot-password")
async def forgot_password(data: EmailRequestSchema, db: Session = Depends(get_db)):
    """Sends a 6-digit password reset code."""
    if not get_user_by_email(db, data.email):
        raise HTTPException(status_code=404, detail="Account not found with this email")
        
    code = generate_otp()
    
    # Store OTP in Database
    existing_otp = db.query(OTPVerification).filter(OTPVerification.email == data.email).first()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    if existing_otp:
        existing_otp.otp_code = code
        existing_otp.expires_at = expires_at
        existing_otp.verified = 0
    else:
        new_otp = OTPVerification(email=data.email, otp_code=code, expires_at=expires_at, verified=0)
        db.add(new_otp)
    db.commit()

    try:
        send_password_reset_email(data.email, code)
    except Exception as e:
        print(f"Failed to send email via SMTP. Reset OTP is {code}")
        
    return {"status": "success", "message": "Password reset code sent"}

@router.post("/reset-password")
async def reset_password(data: ResetPasswordSchema, db: Session = Depends(get_db)):
    """Validates reset code and updates the password."""
    db_otp = db.query(OTPVerification).filter(OTPVerification.email == data.email).first()
    
    if not db_otp or datetime.utcnow() > db_otp.expires_at:
        raise HTTPException(status_code=400, detail="Reset code expired or not found")
    if db_otp.otp_code != data.code:
        raise HTTPException(status_code=400, detail="Invalid reset code")
        
    user = get_user_by_email(db, data.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    from database.crud import get_password_hash
    user.password_hash = get_password_hash(data.new_password)
    
    # Mark OTP as verified (or delete it)
    db.delete(db_otp)
    db.commit()
    
    return {"status": "success", "message": "Password reset successfully"}

@router.get("/check-email")
async def check_email_exists(email: EmailStr, db: Session = Depends(get_db)):
    """
    Checks if a user email already exists in the VigilAI PostgreSQL database.
    """
    user = get_user_by_email(db, email)
    return {"exists": user is not None}


@router.post("/register", response_model=UserResponseSchema, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegisterSchema, db: Session = Depends(get_db)):
    """
    Register a new user in VigilAI.
    """
    existing_user = get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash password in database writer
    user_dict = user_data.dict()
    new_user = create_user(db, user_dict)
    return new_user


@router.post("/login")
async def login_user(form_data: LoginRequestSchema, db: Session = Depends(get_db)):
    """
    User login. Takes email and password in JSON, returns standard success/failure schema.
    """
    try:
        user = get_user_by_email(db, form_data.email)
        if not user:
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid email or password"}
            )
        
        # Verify password hash
        from database.crud import verify_password
        if not verify_password(form_data.password, user.password_hash):
            return JSONResponse(
                status_code=401,
                content={"success": False, "message": "Invalid email or password"}
            )
            
        # Create signed token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.id}, expires_delta=access_token_expires
        )
        
        # Update last login timestamp and record audit log
        user.last_login = datetime.utcnow()
        from database.models import AuditLog
        audit_log = AuditLog(
            user_id=user.id,
            action="LOGIN",
            details="User logged in securely via returning-user flow.",
            device_info=form_data.device_info
        )
        db.add(audit_log)
        db.commit()
        
        # Convert user to dict to return safe fields
        user_dict = UserResponseSchema.from_orm(user).dict()
        user_dict["created_at"] = user_dict["created_at"].isoformat() if user_dict["created_at"] else None
        
        return {
            "success": True,
            "message": "Login successful",
            "token": access_token, 
            "user": user_dict
        }
    except Exception as e:
        import logging
        import sqlalchemy
        if isinstance(e, sqlalchemy.exc.SQLAlchemyError):
            logging.getLogger("VigilAI.Auth").error(f"Login Database Connection Error: {e}")
            return JSONResponse(
                status_code=503,
                content={"success": False, "message": "Database is currently unreachable or disconnected. Please try again later."}
            )
        logging.getLogger("VigilAI.Auth").error(f"Login System Error: {e}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "message": "Internal Server Error during authentication."}
        )


@router.post("/logout")
async def logout_user(current_user: UserResponseSchema = Depends(get_current_user)):
    """
    Logout route. Revocation is client-side by deleting the JWT token.
    """
    return {"status": "success", "message": "Logged out successfully"}


@router.get("/profile", response_model=UserResponseSchema)
async def get_user_profile(current_user: UserResponseSchema = Depends(get_current_user)):
    """
    Fetch profile of currently authenticated user.
    """
    return current_user


@router.put("/settings", response_model=UserResponseSchema)
async def update_user_settings(
    settings_data: SettingsUpdateSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update profile variables (Name / Phone number) for the active user.
    """
    user = get_user_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if settings_data.name is not None:
        user.name = settings_data.name
    if settings_data.phone is not None:
        user.phone = settings_data.phone
        
    db.commit()
    db.refresh(user)
    return user


@router.get("/preferences")
async def get_user_preferences(
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the notification preferences for the active user.
    """
    user = get_user_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    prefs = user.notification_preferences or {
        "alerts": {"fall": True, "weapon": True, "fight": True, "loitering": False},
        "delivery": {"push": True, "email": True, "sms": False, "quietHours": False}
    }
    return prefs


@router.put("/preferences")
async def update_preferences(
    prefs_data: PreferencesUpdateSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update notification preferences for the active user.
    """
    from database.crud import update_user_preferences
    user = get_user_by_id(db, current_user.id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    current_prefs = user.notification_preferences or {
        "alerts": {"fall": True, "weapon": True, "fight": True, "loitering": False},
        "delivery": {"push": True, "email": True, "sms": False, "quietHours": False}
    }
    
    if prefs_data.alerts is not None:
        current_prefs["alerts"] = prefs_data.alerts
    if prefs_data.delivery is not None:
        current_prefs["delivery"] = prefs_data.delivery
        
    updated_user = update_user_preferences(db, current_user.id, current_prefs)
    return updated_user.notification_preferences


@router.post("/fcm-token")
async def register_fcm_token(
    token_data: FCMTokenUpdateSchema,
    current_user: UserResponseSchema = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Upload and save client FCM token to direct automated push notifications to their device.
    """
    updated_user = update_fcm_token(db, current_user.id, token_data.token)
    if not updated_user:
        raise HTTPException(status_code=404, detail="Failed to register FCM token")
    return {"status": "success", "message": "FCM Token registered successfully"}
