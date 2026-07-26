import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.schemas import Camera, User
from app.crud import get_user_by_email

def main():
    db = SessionLocal()
    try:
        # Get primary user
        user = db.query(User).first()
        if not user:
            print("No users found in database!")
            return
            
        print(f"Adding WebCam for user: {user.email}")
        
        # Check if webcam already exists
        existing_cam = db.query(Camera).filter(Camera.stream_url == "0").first()
        
        if not existing_cam:
            new_cam = Camera(
                user_id=user.id,
                camera_name="Laptop WebCam Test",
                stream_url="0",
                camera_type="webcam",
                status="online",
                settings={
                    "enabled_detections": ["WEAPON", "FALL", "FIGHT", "FIRE", "SMOKE"]
                }
            )
            db.add(new_cam)
            db.commit()
            print("✅ Successfully added Laptop WebCam (stream_url='0') to database!")
        else:
            existing_cam.settings = {
                "enabled_detections": ["WEAPON", "FALL", "FIGHT", "FIRE", "SMOKE"]
            }
            db.commit()
            print("✅ WebCam already exists in database. Settings updated!")
            
    finally:
        db.close()

if __name__ == "__main__":
    main()
