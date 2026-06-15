"""
Intrusion Detection Module for VigilAI.
Identifies unauthorized entry by checking if detected persons overlap with a restricted Region of Interest (ROI).
"""
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.IntrusionDetector")

class IntrusionDetector:
    def __init__(self):
        # We define a generic central ROI. In a full system, this would be user-defined via DB.
        # Format: (x_min_ratio, y_min_ratio, x_max_ratio, y_max_ratio)
        self.roi = (0.2, 0.2, 0.8, 0.8) 
        self.consecutive_frames = {}

    def process_frame(self, camera_id: int, person_boxes: List[Dict[str, Any]], frame_shape: Tuple[int, int]) -> Tuple[bool, float, List[Dict[str, Any]]]:
        if not person_boxes:
            self.consecutive_frames[camera_id] = 0
            return False, 0.0, []

        h, w = frame_shape[:2]
        roi_x1, roi_y1 = int(w * self.roi[0]), int(h * self.roi[1])
        roi_x2, roi_y2 = int(w * self.roi[2]), int(h * self.roi[3])

        intrusion_detected = False
        max_conf = 0.0
        alert_boxes = []

        for box in person_boxes:
            bx1, by1, bx2, by2 = box["box"]
            # Check for overlap with ROI
            if not (bx2 < roi_x1 or bx1 > roi_x2 or by2 < roi_y1 or by1 > roi_y2):
                intrusion_detected = True
                max_conf = max(max_conf, box["conf"])
                
                alert_boxes.append({
                    "box": (bx1, by1, bx2, by2),
                    "label": "INTRUDER",
                    "conf": box["conf"],
                    "is_anomaly": True
                })

        if camera_id not in self.consecutive_frames:
            self.consecutive_frames[camera_id] = 0

        if intrusion_detected:
            self.consecutive_frames[camera_id] += 1
        else:
            self.consecutive_frames[camera_id] = 0

        # Require 3 consecutive frames to reduce noise
        is_alert = self.consecutive_frames[camera_id] >= 3
        
        # Add ROI box for visualization
        alert_boxes.append({
            "box": (roi_x1, roi_y1, roi_x2, roi_y2),
            "label": "RESTRICTED AREA",
            "conf": 1.0,
            "is_anomaly": False
        })

        return is_alert, max_conf, alert_boxes
