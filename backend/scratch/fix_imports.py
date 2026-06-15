import os
from pathlib import Path

# Files to fix
BASE_DIR = Path("c:/Users/kurub/OneDrive/Desktop/Vigilai/backend/app")
files = [
    # Video
    BASE_DIR / "video/camera_manager.py",
    BASE_DIR / "video/recorder.py",
    BASE_DIR / "video/clip_extractor.py",
    BASE_DIR / "video/snapshot.py",
    BASE_DIR / "video/streamer.py",
    # Detection
    BASE_DIR / "detection/detection_manager.py",
    BASE_DIR / "detection/fall_detector.py",
    BASE_DIR / "detection/fight_detector.py",
    BASE_DIR / "detection/loiter_detector.py",
    BASE_DIR / "detection/weapon_detector.py",
    # Alerts
    BASE_DIR / "alerts/alert_coordinator.py",
    BASE_DIR / "alerts/email_alert.py",
    BASE_DIR / "alerts/sms_alert.py",
    BASE_DIR / "alerts/push_alert.py",
    # Uplink
    BASE_DIR / "anvil_uplink.py",
]

# Replacements mapping
replacements = [
    ("from database.db import", "from app.database import"),
    ("from database.crud import", "from app.crud import"),
    ("from database.models import", "from app.models.schemas import"),
    ("from config import", "from app.config import"),
    ("import config", "from app import config"),
    ("from video.camera_manager import", "from app.video.camera_manager import"),
    ("from video.recorder import", "from app.video.recorder import"),
    ("from video.clip_extractor import", "from app.video.clip_extractor import"),
    ("from video.snapshot import", "from app.video.snapshot import"),
    ("from video.streamer import", "from app.video.streamer import"),
    ("from detection.fall_detector import", "from app.detection.fall_detector import"),
    ("from detection.weapon_detector import", "from app.detection.weapon_detector import"),
    ("from detection.fight_detector import", "from app.detection.fight_detector import"),
    ("from detection.loiter_detector import", "from app.detection.loiter_detector import"),
    ("from alerts.email_alert import", "from app.alerts.email_alert import"),
    ("from alerts.sms_alert import", "from app.alerts.sms_alert import"),
    ("from alerts.push_alert import", "from app.alerts.push_alert import"),
    ("from alerts.alert_coordinator import", "from app.alerts.alert_coordinator import"),
    ("from anvil_uplink import", "from app.anvil_uplink import"),
    ("import anvil_uplink", "import app.anvil_uplink as anvil_uplink"),
    ("from api.auth import", "from app.api.endpoints.auth import"),
    ("from database.db import", "from app.database import"),
]

for file_path in files:
    if not file_path.exists():
        print(f"Warning: File {file_path} not found.")
        continue
    
    print(f"Refactoring imports in: {file_path.name}")
    content = file_path.read_text(encoding="utf-8")
    
    # Apply replacements
    for target, replacement in replacements:
        content = content.replace(target, replacement)
        
    file_path.write_text(content, encoding="utf-8")

print("Import refactoring complete!")
