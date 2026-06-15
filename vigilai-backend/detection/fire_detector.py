"""
Fire and Smoke Detection Module for VigilAI.
Loads a custom YOLOv8 model trained to detect fire and smoke.
"""
import cv2
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.FireDetector")

class FireDetector:
    def __init__(self, model_path: str = "fire.pt"):
        # Load YOLOv8 Fire/Smoke model
        try:
            import os
            from pathlib import Path
            from ultralytics import YOLO
            
            base_dir = Path(__file__).resolve().parent.parent
            resolved_path = str(base_dir / model_path) if not os.path.isabs(model_path) else model_path
            
            if os.path.exists(resolved_path):
                self.model = YOLO(resolved_path)
                logger.info(f"YOLOv8 Fire/Smoke Detector model loaded successfully from '{resolved_path}'")
                self.is_active = True
            else:
                logger.warning(f"Fire/Smoke model not found at '{resolved_path}'. Fire detection disabled.")
                self.model = None
                self.is_active = False
        except Exception as e:
            logger.error(f"Failed to load YOLOv8 Fire model: {e}")
            self.model = None
            self.is_active = False

        self.target_class_names = {"fire", "smoke"}
        self.frame_counters = {}
        self.camera_states = {}

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[bool, float, List[Dict[str, Any]]]:
        if not self.is_active or self.model is None:
            return False, 0.0, []

        if camera_id not in self.frame_counters:
            self.frame_counters[camera_id] = 0
            self.camera_states[camera_id] = 0
            
        self.frame_counters[camera_id] += 1
        
        # Run fire detection every 5th frame to save CPU
        if self.frame_counters[camera_id] % 5 != 0:
            return False, 0.0, []

        results = self.model(frame, verbose=False)
        boxes = []
        fire_detected_this_frame = False
        max_confidence = 0.0
        
        if len(results) > 0:
            result = results[0]
            for box in result.boxes:
                coords = box.xyxy[0].tolist()
                conf = float(box.conf[0])
                cls_id = int(box.cls[0])
                class_name = self.model.names[cls_id].lower()
                
                if (class_name in self.target_class_names) and conf >= 0.5:
                    fire_detected_this_frame = True
                    max_confidence = max(max_confidence, conf)
                    x1, y1, x2, y2 = map(int, coords)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": class_name.upper(),
                        "conf": conf,
                        "is_anomaly": True
                    })
                    logger.critical(f"[FireDetector Cam {camera_id}] ⚠️ DETECTED {class_name.upper()} with confidence {conf:.2%}")

        if fire_detected_this_frame:
            self.camera_states[camera_id] += 1
        else:
            self.camera_states[camera_id] = max(0, self.camera_states[camera_id] - 1)

        is_alert = self.camera_states[camera_id] >= 2
        return is_alert, max_conf, boxes
