"""Repository layer for database operations on Privacy Settings."""
from sqlalchemy.orm import Session
from typing import Optional
from app.models.schemas import PrivacySetting
from app.schemas import PrivacySettingUpdate


class PrivacySettingRepository:
    """Data access layer for user privacy configurations."""

    @staticmethod
    def get_by_user_id(db: Session, user_id: int) -> Optional[PrivacySetting]:
        """Fetch privacy configurations for a specific user."""
        return db.query(PrivacySetting).filter(PrivacySetting.user_id == user_id).first()

    @staticmethod
    def update_settings(db: Session, user_id: int, settings_update: PrivacySettingUpdate) -> Optional[PrivacySetting]:
        """Update privacy configurations for a user."""
        db_settings = db.query(PrivacySetting).filter(PrivacySetting.user_id == user_id).first()
        if not db_settings:
            return None

        update_data = settings_update.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_settings, key, value)

        db.commit()
        db.refresh(db_settings)
        return db_settings
