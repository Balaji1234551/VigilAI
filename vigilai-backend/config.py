"""
Centralized Configuration and Secrets Manager for VigilAI.
Handles directory paths, database settings, AI thresholds, security tokens, and communication credentials.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from the current directory
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Base Project Directories
BASE_DIR = Path(__file__).parent
PROJECT_ROOT = BASE_DIR.parent
RECORDINGS_DIR = PROJECT_ROOT / "backend" / "storage" / "videos"
CLIPS_DIR = PROJECT_ROOT / "backend" / "storage" / "clips"
SNAPSHOTS_DIR = PROJECT_ROOT / "backend" / "storage" / "snapshots"

# Automatically ensure storage folders exist
for directory in [RECORDINGS_DIR, CLIPS_DIR, SNAPSHOTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Database URL Setup (Default to local SQLite inside vigilai-backend directory)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/vigilai.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Anvil Uplink Configuration
ANVIL_UPLINK_KEY = os.getenv("ANVIL_UPLINK_KEY", "")

# Email SMTP Settings (Default to Gmail port 587)
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # App Password
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")

# Twilio SMS API Settings
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")

# Firebase Admin Push Notifications
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", str(BASE_DIR / "firebase_credentials.json"))

# Security and Cryptography Settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "vigilai_secure_cryptographic_secret_key_2026_token")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week token life

# MediaPipe Fall Detection Parameters
FALL_CONF_THRESHOLD = 0.7
FALL_TRACK_THRESHOLD = 0.7
FALL_ANGLE_THRESHOLD = 45.0          # Maximum degrees torso is allowed to make with horizontal plane before fall alert
FALL_VELOCITY_THRESHOLD = 15.0       # Threshold for vertical speed (movement down y-axis)
FALL_CONSECUTIVE_FRAMES = 10         # Verify fall for at least 10 continuous frames

# YOLOv8 Weapon Detection Parameters
WEAPON_CONF_THRESHOLD = 0.20
WEAPON_CONSECUTIVE_FRAMES = 1        # Trigger weapon alarm if spotted in 1 straight analyzed frames

# YOLOv8 Fight Detection Parameters
FIGHT_DISTANCE_THRESHOLD = 120.0     # Max pixel distance between centroid of 2 individuals to flag potential combat
FIGHT_VELOCITY_THRESHOLD = 40.0      # Min limb/optical-flow velocity pixels per frame
FIGHT_CONSECUTIVE_FRAMES = 15        # Confirm brawl if pattern holds for 15 straight frames

# Centroid Tracking Loitering Parameters
LOITER_RADIUS_THRESHOLD = 100.0      # Person must stay within 100px radius to be counted as loitering
LOITER_TIME_THRESHOLD = 30           # Number of seconds standing in the same spot to trigger warning (default)

# Global Performance Constraints
MAX_PROCESSING_FPS = 15              # Process maximum 15 frames per second on the detection thread to bound CPU/GPU load
