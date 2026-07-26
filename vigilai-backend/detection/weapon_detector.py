"""
YOLOv8 Weapon Detection Module for VigilAI.
Performs lightweight inference using ultralytics YOLOv8n.
Detects knife (COCO 43) and custom weapon classes (like gun, pistol, rifle).
Includes consecutive-frame confirmation filters to minimize false alarms.
"""
import cv2
import logging
from typing import Dict, List, Tuple, Optional, Any
from ultralytics import YOLO
from config import WEAPON_CONF_THRESHOLD, WEAPON_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.WeaponDetector")


class WeaponDetector:
    """
    Integrates YOLOv8 object detection, processing every 3rd frame
    to identify weapon classes with high-confidence thresholds.
    """
    def __init__(self, model_path: str = "../backend/models/best.pt"):
        # Load YOLOv8 model (best.pt)
        try:
            import os
            from pathlib import Path
            base_dir = Path(__file__).resolve().parent.parent
            resolved_path = str(base_dir / model_path) if not os.path.isabs(model_path) else model_path
            self.model = YOLO(resolved_path)
            logger.info(f"YOLOv8 Weapon Detector model loaded successfully from '{resolved_path}'")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            self.model = None

        # Core Weapon Classes in standard COCO:
        # Class 43 is "knife". 
        # Standard COCO lacks "gun", but custom datasets mapping gun to standard or custom classes are fully supported.
        # We declare a list of target class IDs and also names for extensibility.
        self.target_class_ids = {43}  # 43 = knife
        self.target_class_names = {"knife", "gun", "pistol", "revolver", "rifle", "weapon", "handgun"}
        
        # State tracking per camera: {camera_id: consecutive_weapon_frames}
        self.camera_states: Dict[int, int] = {}
        # Frame counter per camera to support inference throttling (running every 3rd frame)
        self.frame_counters: Dict[int, int] = {}

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[bool, float, List[Dict[str, Any]]]:
        """
        Runs YOLOv8 object detection on every 3rd frame.
        """
        if self.model is None:
            logger.error(f"[WeaponDetector Cam {camera_id}] Pipeline Failed: Model is NOT LOADED.")
            return False, 0.0, []

        if camera_id not in self.frame_counters:
            self.frame_counters[camera_id] = 0
            self.camera_states[camera_id] = 0
            
        self.frame_counters[camera_id] += 1
        
        # Reset frame counter to prevent overflow
        if self.frame_counters[camera_id] >= 300:
            self.frame_counters[camera_id] = 0

        # EXACT USER REQUESTED PRINTS
        print("Frame Received")
        print("Inference Started")
        
        # Run Inference
        logger.debug(f"[WeaponDetector Cam {camera_id}] Running YOLO inference on frame...")
        results = self.model.predict(frame, conf=0.25, verbose=False)
        
        print("Inference Completed")
        
        boxes: List[Dict[str, Any]] = []
        weapon_detected_this_frame = False
        max_confidence = 0.0
        
        if len(results) > 0:
            result = results[0]
            num_detections = len(result.boxes)
            print(f"Detection Count: {num_detections}")
            
            if num_detections == 0:
                print("Reason: Model confidence too low or no target classes found in frame.")
            
            for box in result.boxes:
                coords = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                
                class_name = self.model.names[cls_id].lower()
                
                logger.info(f"[WeaponDetector Cam {camera_id}] Object Found: Class ID={cls_id}, Class Name='{class_name}', Confidence={conf:.2%}")
                
                is_target_weapon = True 
                
                if is_target_weapon and conf >= WEAPON_CONF_THRESHOLD:
                    weapon_detected_this_frame = True
                    max_confidence = max(max_confidence, conf)
                    
                    x1, y1, x2, y2 = map(int, coords)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": class_name.upper(),
                        "conf": conf,
                        "is_anomaly": True
                    })
                elif is_target_weapon and conf < WEAPON_CONF_THRESHOLD:
                    logger.debug(f"[WeaponDetector Cam {camera_id}] Ignored Weapon: Confidence ({conf:.2f}) < Threshold ({WEAPON_CONF_THRESHOLD:.2f})")
                
                if cls_id == 0 and conf >= 0.5:
                    x1, y1, x2, y2 = map(int, coords)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "PERSON",
                        "conf": conf,
                        "is_anomaly": False
                    })
                elif cls_id in [24, 26, 28] and conf >= 0.4:
                    x1, y1, x2, y2 = map(int, coords)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "LUGGAGE",
                        "conf": conf,
                        "is_anomaly": False
                    })
        else:
            logger.info(f"[WeaponDetector Cam {camera_id}] Model returned zero results (Processing failed or empty).")

        if weapon_detected_this_frame:
            self.camera_states[camera_id] += 1
            logger.info(f"[WeaponDetector Cam {camera_id}] Weapon frame count: {self.camera_states[camera_id]}/{WEAPON_CONSECUTIVE_FRAMES}")
        else:
            self.camera_states[camera_id] = max(0, self.camera_states[camera_id] - 1)

        is_alert_triggered = self.camera_states[camera_id] >= WEAPON_CONSECUTIVE_FRAMES
        
        if is_alert_triggered:
            logger.warning(f"[WeaponDetector Cam {camera_id}] ⚠️ WEAPON DETECTION ALERT TRIGGERED! ({self.camera_states[camera_id]}/{WEAPON_CONSECUTIVE_FRAMES} consecutive frames)")
            
        return is_alert_triggered, max_confidence, boxes
