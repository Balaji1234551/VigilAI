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

logger = logging.getLogger("VigilAI.YoloDetector")

class WeaponDetector:
    """
    Integrates YOLOv8 object detection, processing every 3rd frame.
    Dynamically tracks ALL classes found in the loaded model.names (except Person)
    and flags alerts if an object persists across consecutive frames.
    """
    def __init__(self, model_path: str = "models/best.pt"):
        # Load YOLOv8 Nano model
        try:
            import os
            from pathlib import Path
            base_dir = Path(__file__).resolve().parent.parent
            resolved_path = str(base_dir / model_path) if not os.path.isabs(model_path) else model_path
            self.model = YOLO(resolved_path)
            logger.info(f"YOLOv8 Dynamic Detector model loaded successfully from '{resolved_path}'")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 model: {e}")
            self.model = None
            
        # State tracking per camera per class: {camera_id: {class_name: consecutive_frames}}
        self.camera_states: Dict[int, Dict[str, int]] = {}
        # Frame counter per camera to support inference throttling (running every 3rd frame)
        self.frame_counters: Dict[int, int] = {}

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[List[Tuple[str, float]], List[Dict[str, Any]]]:
        """
        Runs YOLOv8 object detection dynamically on every 3rd frame.
        Returns:
            triggered_alerts (List[Tuple[str, float]]): List of (class_name, confidence) for newly confirmed threats.
            boxes (List): Bounding boxes of detected objects to draw in streamer.
        """
        if self.model is None:
            return [], []

        # 1. Manage frame rate throttling (process every 3rd frame)
        if camera_id not in self.frame_counters:
            self.frame_counters[camera_id] = 0
            self.camera_states[camera_id] = {}
            
        self.frame_counters[camera_id] += 1
        
        # If not the 3rd frame, skip model inference but return existing state to preserve stream boxes
        if self.frame_counters[camera_id] % 3 != 0:
            last_boxes = getattr(self, f"_last_boxes_{camera_id}", [])
            last_alerts = getattr(self, f"_last_alerts_{camera_id}", [])
            return last_alerts, last_boxes

        # Reset frame counter to prevent overflow
        if self.frame_counters[camera_id] >= 300:
            self.frame_counters[camera_id] = 0

        # 2. Run Inference
        results = self.model(frame, verbose=False)
        
        boxes: List[Dict[str, Any]] = []
        # Track highest confidence for each class seen in this frame
        current_frame_classes: Dict[str, float] = {}
        
        if len(results) > 0:
            result = results[0]
            for box in result.boxes:
                coords = box.xyxy[0].tolist()  # [x1, y1, x2, y2]
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                
                # Fetch class name mapping from the model dynamically!
                class_name = self.model.names[cls_id].upper()
                
                x1, y1, x2, y2 = map(int, coords)
                
                # "PERSON" is tracked for other analytics (Fall, Fight, Loitering), but does not trigger an email alert directly from here.
                if class_name == "PERSON":
                    if conf >= 0.5:
                        boxes.append({
                            "box": (x1, y1, x2, y2),
                            "label": "PERSON",
                            "conf": conf,
                            "is_anomaly": False
                        })
                else:
                    # For all other classes (Fire, Smoke, Weapon, Knife, Gun, etc)
                    if conf >= WEAPON_CONF_THRESHOLD:
                        # Register the highest confidence seen for this class in this frame
                        if class_name not in current_frame_classes or conf > current_frame_classes[class_name]:
                            current_frame_classes[class_name] = conf
                        
                        boxes.append({
                            "box": (x1, y1, x2, y2),
                            "label": class_name,
                            "conf": conf,
                            "is_anomaly": True
                        })
                        logger.warning(f"[YoloDetector Cam {camera_id}] ⚠️ DETECTED {class_name} with confidence {conf:.2%}")

        # 3. Apply Consecutive Frame Confirmation Filter per Class
        triggered_alerts = []
        camera_state = self.camera_states[camera_id]
        
        # Increment counters for classes seen in this frame
        for cls_name, conf in current_frame_classes.items():
            camera_state[cls_name] = camera_state.get(cls_name, 0) + 1
            logger.info(f"[YoloDetector Cam {camera_id}] {cls_name} frame count: {camera_state[cls_name]}/{WEAPON_CONSECUTIVE_FRAMES}")
            
            # Confirm threat if spotted in consecutive frames
            if camera_state[cls_name] >= WEAPON_CONSECUTIVE_FRAMES:
                triggered_alerts.append((cls_name, conf))
                logger.warning(f"[YoloDetector Cam {camera_id}] ⚠️ {cls_name} ALERT TRIGGERED! ({WEAPON_CONSECUTIVE_FRAMES} consecutive frames)")

        # Decay counters for classes NOT seen in this frame
        classes_to_remove = []
        for cls_name in camera_state.keys():
            if cls_name not in current_frame_classes:
                camera_state[cls_name] = max(0, camera_state[cls_name] - 1)
                if camera_state[cls_name] == 0:
                    classes_to_remove.append(cls_name)
                    
        for cls_name in classes_to_remove:
            del camera_state[cls_name]

        # Cache results for skipped frames
        setattr(self, f"_last_boxes_{camera_id}", boxes)
        setattr(self, f"_last_alerts_{camera_id}", triggered_alerts)
            
        return triggered_alerts, boxes
