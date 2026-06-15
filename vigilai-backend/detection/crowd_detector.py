"""
Crowd Detector Module for VigilAI.
Triggers an alert if the number of detected persons exceeds a maximum threshold.
"""
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.CrowdDetector")

class CrowdDetector:
    def __init__(self):
        self.crowd_threshold = 5  # Alert if more than 5 people are detected

    def process_frame(self, camera_id: int, person_boxes: List[Dict[str, Any]]) -> Tuple[bool, float, List[Dict[str, Any]]]:
        num_people = len(person_boxes)
        
        is_alert = num_people > self.crowd_threshold
        max_conf = 0.0
        alert_boxes = []

        if is_alert:
            for box in person_boxes:
                max_conf = max(max_conf, box["conf"])
                bx1, by1, bx2, by2 = box["box"]
                alert_boxes.append({
                    "box": (bx1, by1, bx2, by2),
                    "label": f"CROWD ({num_people})",
                    "conf": box["conf"],
                    "is_anomaly": True
                })

        return is_alert, max_conf, alert_boxes
