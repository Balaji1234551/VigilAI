"""Repository layer for database operations on users."""
from sqlalchemy.orm import Session
from app.models.schemas import User, PrivacySetting
from app.schemas import UserCreate, UserUpdate


class UserRepository:
    """Data access layer for user accounts."""

    @staticmethod
    def get_by_email(db: Session, email: str) -> User | None:
        """Retrieve a user account by email."""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def create_user(db: Session, user_create: UserCreate, hashed_pw: str) -> User:
        """Create a new user record with automatic default privacy settings."""
        # Map user_create schema fields to model fields
        new_user = User(
            full_name=user_create.full_name,
            email=user_create.email,
            password_hash=hashed_pw,
            role=user_create.role or "operator",
            phone_number=user_create.phone_number
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Create default privacy settings for this new user
        default_privacy = PrivacySetting(
            user_id=new_user.id,
            face_blur_enabled=True,
            local_storage_only=False,
            cloud_backup_enabled=False,
            data_retention_days=30
        )
        db.add(default_privacy)
        db.commit()

        return new_user

    @staticmethod
    def update_user(db: Session, email: str, user_update: UserUpdate) -> User | None:
        """Update user preferences/profile details."""
        db_user = db.query(User).filter(User.email == email).first()
        if not db_user:
            return None
        
        update_data = user_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            if key == "phone_number":
                setattr(db_user, "phone_number", value)
            else:
                setattr(db_user, key, value)
            
        db_user.updated_at = db_user.updated_at  # triggers auto-update if desired or handled by orm
        db.commit()
        db.refresh(db_user)
        return db_user
