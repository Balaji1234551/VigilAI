import cv2
import math
import time
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from app.config import FIGHT_DISTANCE_THRESHOLD, FIGHT_VELOCITY_THRESHOLD, FIGHT_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FightDetector")

class FightDetector:
    def __init__(self):
        self.camera_states: Dict[int, Dict[str, Any]] = {}

    def _get_state(self, camera_id: int) -> Dict[str, Any]:
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "consecutive_frames": 0,
                "last_limbs": {}, 
                "last_timestamp": time.time()
            }
        return self.camera_states[camera_id]

    def process_frame(
        self, 
        camera_id: int, 
        pose_model,
        frame: np.ndarray, 
        person_boxes: List[Dict[str, Any]]
    ) -> Tuple[bool, float, List[Dict[str, Any]]]:
        state = self._get_state(camera_id)
        
        if len(person_boxes) < 2 or pose_model is None:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)
            return False, 0.0, []

        h, w, _ = frame.shape
        fight_detected_this_frame = False
        highest_velocity = 0.0
        alert_boxes: List[Dict[str, Any]] = []
        
        # We can just run YOLOv8 pose on the full frame once and match keypoints to boxes,
        # but since person_boxes are already detected, we will check proximity first.
        
        # Find close pairs
        close_pairs = []
        for i in range(len(person_boxes)):
            for j in range(i + 1, len(person_boxes)):
                b1 = person_boxes[i]["box"]
                b2 = person_boxes[j]["box"]
                
                c1 = ((b1[0] + b1[2]/2.0), (b1[1] + b1[3]/2.0))
                c2 = ((b2[0] + b2[2]/2.0), (b2[1] + b2[3]/2.0))
                
                dist = math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
                if dist < FIGHT_DISTANCE_THRESHOLD:
                    close_pairs.append((i, j, b1, b2))

        if not close_pairs:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)
            return False, 0.0, []

        # Run pose on full frame to get all keypoints
        pose_results = pose_model(frame, verbose=False)
        if not pose_results or not pose_results[0].keypoints or pose_results[0].keypoints.data.shape[1] == 0:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)
            return False, 0.0, []
            
        kpts_tensor = pose_results[0].keypoints.data
        
        now = time.time()
        
        for p_idx in range(kpts_tensor.shape[0]):
            kpts = kpts_tensor[p_idx]
            # 9=L_WRIST, 10=R_WRIST
            l_wrist = kpts[9]
            r_wrist = kpts[10]
            
            if l_wrist[2] > 0.4 or r_wrist[2] > 0.4:
                lx = float(l_wrist[0]) if l_wrist[2] > 0.4 else 0.0
                ly = float(l_wrist[1]) if l_wrist[2] > 0.4 else 0.0
                
                person_id = f"person_{p_idx}"
                if person_id in state["last_limbs"]:
                    last_lx, last_ly = state["last_limbs"][person_id]
                    dt = now - state["last_timestamp"]
                    if dt > 0:
                        vel = math.sqrt((lx - last_lx)**2 + (ly - last_ly)**2) / dt
                        highest_velocity = max(highest_velocity, vel)
                        
                        if vel > FIGHT_VELOCITY_THRESHOLD * 20: 
                            fight_detected_this_frame = True
                            
                state["last_limbs"][person_id] = (lx, ly)
                
        state["last_timestamp"] = now

        if fight_detected_this_frame:
            state["consecutive_frames"] += 1
            # Add alert boxes for all close pairs
            for pair in close_pairs:
                alert_boxes.append({"box": pair[2], "label": "VIOLENCE", "confidence": 0.90, "is_anomaly": True})
                alert_boxes.append({"box": pair[3], "label": "VIOLENCE", "confidence": 0.90, "is_anomaly": True})
        else:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)

        is_fight_alert = state["consecutive_frames"] >= FIGHT_CONSECUTIVE_FRAMES
        
        # Deduplicate alert boxes
        unique_boxes = []
        seen = set()
        for b in alert_boxes:
            t = tuple(b["box"])
            if t not in seen:
                seen.add(t)
                unique_boxes.append(b)
                
        return is_fight_alert, min(1.0, highest_velocity / 1000.0), unique_boxes
