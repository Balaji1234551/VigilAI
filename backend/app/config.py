"""
Centralized Configuration and Secrets Manager for VigilAI.
Handles directory paths, database settings, AI thresholds, security tokens, and communication credentials.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Resolve and load .env from the backend root folder
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Application Info
APP_NAME = "VigilAI Intelligent Surveillance Backend"
APP_VERSION = "2.0.0"
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Base Project Media Storage Directories (inside backend folder)
RECORDINGS_DIR = BASE_DIR / "recordings"
CLIPS_DIR = BASE_DIR / "clips"
SNAPSHOTS_DIR = BASE_DIR / "snapshots"

# Automatically ensure storage folders exist
for directory in [RECORDINGS_DIR, CLIPS_DIR, SNAPSHOTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Secure Database Connection variables
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "vigilai_db")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

# Base Connection URLs Construction
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
DATABASE_URL_SYNC = DATABASE_URL
DATABASE_URL_ASYNC = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

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
JWT_SECRET_KEY = os.getenv("SECRET_KEY", "vigilai_secure_cryptographic_secret_key_2026_token")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours

# MediaPipe / YOLO Fall Detection Parameters
FALL_CONF_THRESHOLD = 0.7
FALL_TRACK_THRESHOLD = 0.7
FALL_ANGLE_THRESHOLD = 45.0          # Torso angle with horizontal plane
FALL_VELOCITY_THRESHOLD = 15.0       # Vertical speed threshold
FALL_CONSECUTIVE_FRAMES = 10         # Frame verification window

# YOLOv8 Weapon Detection Parameters
WEAPON_CONF_THRESHOLD = 0.65
WEAPON_CONSECUTIVE_FRAMES = 5

# YOLOv8 Fight Detection Parameters
FIGHT_DISTANCE_THRESHOLD = 120.0     # Max pixel distance between 2 people
FIGHT_VELOCITY_THRESHOLD = 40.0      # Min movement velocity
FIGHT_CONSECUTIVE_FRAMES = 15

# Centroid Tracking Loitering Parameters
LOITER_RADIUS_THRESHOLD = 100.0      # Standing pixel radius
LOITER_TIME_THRESHOLD = 30           # Dwell time in seconds

# Global Performance Constraints
MAX_PROCESSING_FPS = 15              # Process limit to bound CPU load
MAX_FRAME_WIDTH = int(os.getenv("MAX_FRAME_WIDTH", "1280"))
MAX_FRAME_HEIGHT = int(os.getenv("MAX_FRAME_HEIGHT", "720"))
FRAME_RATE = int(os.getenv("FRAME_RATE", "30"))

# Default Pagination
DEFAULT_LIMIT = 50
MAX_LIMIT = 100
