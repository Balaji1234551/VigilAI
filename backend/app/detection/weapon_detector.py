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
from app.config import WEAPON_CONF_THRESHOLD, WEAPON_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.WeaponDetector")


class WeaponDetector:
    """
    Integrates YOLOv8 object detection, processing every 3rd frame
    to identify weapon classes with high-confidence thresholds.
    """
    def __init__(self, model_path: str = "yolov8n.pt"):
        # Load YOLOv8 Nano model
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
        Returns:
            is_weapon_alert (bool): Active confirmed weapon threat.
            max_confidence (float): Highest confidence score among detected weapons.
            boxes (List): Bounding boxes of detected objects to draw in streamer.
        """
        if self.model is None:
            return False, 0.0, []

        # 1. Manage frame rate throttling (process every 3rd frame)
        if camera_id not in self.frame_counters:
            self.frame_counters[camera_id] = 0
            self.camera_states[camera_id] = 0
            
        self.frame_counters[camera_id] += 1
        
        # If not the 3rd frame, skip model inference but return existing state to preserve stream boxes
        if self.frame_counters[camera_id] % 3 != 0:
            # We return False and let the manager read from cache to keep visuals responsive
            return False, 0.0, []

        # Reset frame counter to prevent overflow
        if self.frame_counters[camera_id] >= 300:
            self.frame_counters[camera_id] = 0

        # 2. Run Inference
        # verbose=False suppresses CLI logging of predictions to keep server console clean
        results = self.model(frame, verbose=False)
        
        boxes: List[Dict[str, Any]] = []
        weapon_detected_this_frame = False
        max_confidence = 0.0
        
        if len(results) > 0:
            result = results[0]
            # Extract detected bounding boxes, confidence, and class mappings
            for box in result.boxes:
                coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                
                # Fetch class name mapping from the model
                class_name = self.model.names[cls_id].lower()
                
                # Determine if the detected class represents a knife/weapon
                is_target_weapon = (cls_id in self.target_class_ids) or (class_name in self.target_class_names)
                
                # We check the confidence score against the threshold (0.65)
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
                    logger.warning(f"[WeaponDetector Cam {camera_id}] ⚠️ DETECTED {class_name.upper()} with confidence {conf:.2%}")
                
                # Also include person bounding boxes if needed (class ID 0 is person), normal rendering
                elif cls_id == 0 and conf >= 0.5:
                    x1, y1, x2, y2 = map(int, coords)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "PERSON",
                        "conf": conf,
                        "is_anomaly": False
                    })

        # 3. Apply Consecutive Frame Confirmation Filter
        if weapon_detected_this_frame:
            self.camera_states[camera_id] += 1
            logger.info(f"[WeaponDetector Cam {camera_id}] Weapon frame count: {self.camera_states[camera_id]}/5")
        else:
            # Gradually decay counter to avoid instantaneous drops during fast motion
            self.camera_states[camera_id] = max(0, self.camera_states[camera_id] - 1)

        # Confirm weapon threat if spotted in 5 consecutive processed frames
        is_alert_triggered = self.camera_states[camera_id] >= WEAPON_CONSECUTIVE_FRAMES
        
        if is_alert_triggered:
            logger.warning(f"[WeaponDetector Cam {camera_id}] ⚠️ WEAPON DETECTION ALERT TRIGGERED! (5/5 consecutive frames)")
            
        return is_alert_triggered, max_confidence, boxes
