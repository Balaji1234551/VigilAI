import logging
from ultralytics import YOLO

logger = logging.getLogger("VigilAI.AIModelLoader")

class AIModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AIModelLoader, cls).__new__(cls)
            cls._instance._init_models()
        return cls._instance

    def _init_models(self):
        logger.info("Initializing AI Model Suite...")
        try:
            self.weapon_model = YOLO("models/best.pt")
            logger.info("Loaded Weapon Model (best.pt).")
        except Exception as e:
            logger.warning(f"Weapon model failed: {e}. Fallback to yolov8n.pt")
            self.weapon_model = YOLO("yolov8n.pt")

        try:
            self.fire_model = YOLO("models/fire_smoke.pt")
            logger.info("Loaded Fire/Smoke Model (fire_smoke.pt).")
        except Exception as e:
            logger.warning(f"Fire/Smoke model failed: {e}. Fallback to yolov8n.pt")
            self.fire_model = YOLO("yolov8n.pt")
            
        try:
            self.person_model = YOLO("yolov8n.pt")
            logger.info("Loaded Person/Crowd Model (yolov8n.pt).")
        except Exception as e:
            logger.warning(f"Person model failed: {e}.")
            self.person_model = None

        try:
            self.pose_detector = YOLO("yolov8n-pose.pt")
            logger.info("Loaded YOLOv8 Pose Model (yolov8n-pose.pt).")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 pose model: {e}")
            self.pose_detector = None

        self.face_detector = None # Deprecated mediapipe face detector

    def get_weapon_model(self): return self.weapon_model
    def get_fire_model(self): return self.fire_model
    def get_person_model(self): return self.person_model
    def get_pose_detector(self): return self.pose_detector
    def get_face_detector(self): return self.face_detector
