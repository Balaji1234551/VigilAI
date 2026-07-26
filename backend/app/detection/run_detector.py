"""
Running Detection Module for VigilAI.
Tracks centroid velocity of bounding boxes to detect if someone is running.
"""
import time
import math
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any

logger = logging.getLogger("VigilAI.RunDetector")

class RunDetector:
    def __init__(self):
        # State tracking: {camera_id: {"centroids": {person_id: (x, y, timestamp)}, "consecutive": 0}}
        self.camera_states: Dict[int, Dict[str, Any]] = {}
        self.RUN_VELOCITY_THRESHOLD = 300.0  # pixels per second (tune as needed)
        self.CONSECUTIVE_FRAMES = 5

    def _get_state(self, camera_id: int) -> Dict[str, Any]:
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "centroids": {},
                "consecutive": 0
            }
        return self.camera_states[camera_id]

    def process_frame(self, camera_id: int, person_boxes: List[Dict[str, Any]]) -> Tuple[bool, float, List[Dict[str, Any]]]:
        state = self._get_state(camera_id)
        now = time.time()
        
        is_running_now = False
        highest_velocity = 0.0
        alert_boxes = []
        
        # Simple centroid matching (greedy) to track persons across frames
        new_centroids = {}
        
        for pbox in person_boxes:
            b = pbox["box"]
            cx = (b[0] + b[2]) / 2.0
            cy = (b[1] + b[3]) / 2.0
            
            # Find closest previous centroid
            best_id = None
            best_dist = float('inf')
            for pid, (px, py, pt) in state["centroids"].items():
                dist = math.sqrt((cx - px)**2 + (cy - py)**2)
                if dist < best_dist and dist < 150: # max tracking jump
                    best_dist = dist
                    best_id = pid
                    
            if best_id is not None:
                px, py, pt = state["centroids"].pop(best_id)
                dt = now - pt
                if dt > 0:
                    velocity = best_dist / dt
                    highest_velocity = max(highest_velocity, velocity)
                    
                    if velocity > self.RUN_VELOCITY_THRESHOLD:
                        is_running_now = True
                        alert_boxes.append({
                            "box": b,
                            "label": "RUNNING",
                            "conf": min(0.99, velocity / 1000.0),
                            "is_anomaly": True
                        })
                new_centroids[best_id] = (cx, cy, now)
            else:
                new_id = f"person_{int(now*1000)}_{int(cx)}"
                new_centroids[new_id] = (cx, cy, now)
                
        # Update state
        state["centroids"] = new_centroids
        
        if is_running_now:
            state["consecutive"] += 1
        else:
            state["consecutive"] = max(0, state["consecutive"] - 1)
            
        is_alert = state["consecutive"] >= self.CONSECUTIVE_FRAMES
        if is_alert:
            logger.warning(f"[RunDetector Cam {camera_id}] ⚠️ RUNNING DETECTED!")
            
        return is_alert, min(1.0, highest_velocity / 1000.0), alert_boxes
