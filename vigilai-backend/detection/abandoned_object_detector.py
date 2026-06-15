"""
Abandoned Object Detector Module for VigilAI.
Tracks stationary luggage/bags that have no nearby person for a defined dwell time.
"""
import time
import math
import logging
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.AbandonedObjectDetector")

class AbandonedObjectDetector:
    def __init__(self):
        # {camera_id: {object_id: {"centroid": (x, y), "first_seen": timestamp, "last_seen": timestamp}}}
        self.tracked_objects = {}
        self.next_id = 0
        self.max_distance = 50.0  # Max pixel movement to be considered the same stationary object
        self.abandon_time = 15.0  # Seconds before triggering alert
        self.person_distance = 150.0 # Pixel distance threshold to consider bag "attended"

    def process_frame(self, camera_id: int, luggage_boxes: List[Dict[str, Any]], person_boxes: List[Dict[str, Any]]) -> Tuple[bool, float, List[Dict[str, Any]]]:
        if camera_id not in self.tracked_objects:
            self.tracked_objects[camera_id] = {}

        now = time.time()
        current_objects = self.tracked_objects[camera_id]
        new_objects = {}
        
        is_alert = False
        max_conf = 0.0
        alert_boxes = []

        for box in luggage_boxes:
            bx1, by1, bx2, by2 = box["box"]
            cx = (bx1 + bx2) / 2.0
            cy = (by1 + by2) / 2.0
            
            # Find if this matches an existing tracked object
            matched_id = None
            min_dist = self.max_distance
            
            for obj_id, obj_data in current_objects.items():
                px, py = obj_data["centroid"]
                dist = math.hypot(cx - px, cy - py)
                if dist < min_dist:
                    min_dist = dist
                    matched_id = obj_id
                    
            if matched_id is not None:
                # Update existing object
                new_objects[matched_id] = current_objects[matched_id]
                new_objects[matched_id]["centroid"] = (cx, cy)
                new_objects[matched_id]["last_seen"] = now
                new_objects[matched_id]["conf"] = box["conf"]
                new_objects[matched_id]["box"] = box["box"]
            else:
                # Create new object
                new_objects[self.next_id] = {
                    "centroid": (cx, cy),
                    "first_seen": now,
                    "last_seen": now,
                    "conf": box["conf"],
                    "box": box["box"]
                }
                self.next_id += 1

        self.tracked_objects[camera_id] = new_objects

        # Evaluate logic for abandoned objects
        for obj_id, obj_data in new_objects.items():
            dwell_time = now - obj_data["first_seen"]
            
            # If object has been stationary for longer than abandon_time
            if dwell_time > self.abandon_time:
                # Check if it is attended (is there a person close by?)
                attended = False
                cx, cy = obj_data["centroid"]
                
                for pbox in person_boxes:
                    px1, py1, px2, py2 = pbox["box"]
                    pcx = (px1 + px2) / 2.0
                    pcy = (py1 + py2) / 2.0
                    if math.hypot(cx - pcx, cy - pcy) < self.person_distance:
                        attended = True
                        break
                        
                if not attended:
                    is_alert = True
                    max_conf = max(max_conf, obj_data["conf"])
                    bx1, by1, bx2, by2 = obj_data["box"]
                    alert_boxes.append({
                        "box": (bx1, by1, bx2, by2),
                        "label": "SUSPICIOUS OBJECT",
                        "conf": obj_data["conf"],
                        "is_anomaly": True
                    })

        return is_alert, max_conf, alert_boxes
