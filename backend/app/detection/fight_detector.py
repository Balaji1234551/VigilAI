"""
Fight and Violence Detection Module for VigilAI.
Uses MediaPipe Pose to track wrist/limb velocities and person proximity
to detect high-frequency physical combat.
"""
import cv2
import math
import time
import logging
import numpy as np
import mediapipe as mp
from typing import Dict, List, Tuple, Optional, Any
from app.config import FIGHT_DISTANCE_THRESHOLD, FIGHT_VELOCITY_THRESHOLD, FIGHT_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FightDetector")

class FightDetector:
    """
    Uses MediaPipe Pose landmarks to calculate rapid limb motion and proximity.
    """
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=1
        )
        self.camera_states: Dict[int, Dict[str, Any]] = {}

    def _get_state(self, camera_id: int) -> Dict[str, Any]:
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "consecutive_frames": 0,
                "last_limbs": {}, # {person_id: {"wrists": (lx,ly,rx,ry), "time": t}}
                "last_timestamp": time.time()
            }
        return self.camera_states[camera_id]

    def process_frame(
        self, 
        camera_id: int, 
        frame: np.ndarray, 
        person_boxes: List[Dict[str, Any]]
    ) -> Tuple[bool, float, List[Dict[str, Any]]]:
        state = self._get_state(camera_id)
        
        if len(person_boxes) < 2:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)
            return False, 0.0, []

        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        fight_detected_this_frame = False
        highest_velocity = 0.0
        alert_boxes: List[Dict[str, Any]] = []
        
        # Proximity check
        for i in range(len(person_boxes)):
            for j in range(i + 1, len(person_boxes)):
                b1 = person_boxes[i]["box"]
                b2 = person_boxes[j]["box"]
                
                c1 = ((b1[0] + b1[2]) / 2.0, (b1[1] + b1[3]) / 2.0)
                c2 = ((b2[0] + b2[2]) / 2.0, (b2[1] + b2[3]) / 2.0)
                
                dist = math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
                
                if dist < FIGHT_DISTANCE_THRESHOLD:
                    # Run MediaPipe pose on the cropped union area to be fast
                    u_x1 = max(0, int(min(b1[0], b2[0])) - 20)
                    u_y1 = max(0, int(min(b1[1], b2[1])) - 20)
                    u_x2 = min(w, int(max(b1[2], b2[2])) + 20)
                    u_y2 = min(h, int(max(b1[3], b2[3])) + 20)
                    
                    crop = rgb_frame[u_y1:u_y2, u_x1:u_x2]
                    if crop.size == 0: continue
                    
                    results = self.pose.process(crop)
                    
                    if results.pose_landmarks:
                        landmarks = results.pose_landmarks.landmark
                        L_WRIST = landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value]
                        R_WRIST = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value]
                        
                        if L_WRIST.visibility > 0.4 or R_WRIST.visibility > 0.4:
                            now = time.time()
                            lx = L_WRIST.x * (u_x2 - u_x1) if L_WRIST.visibility > 0.4 else 0
                            ly = L_WRIST.y * (u_y2 - u_y1) if L_WRIST.visibility > 0.4 else 0
                            
                            pair_id = f"{i}_{j}"
                            if pair_id in state["last_limbs"]:
                                last_lx, last_ly = state["last_limbs"][pair_id]
                                dt = now - state["last_timestamp"]
                                if dt > 0:
                                    vel = math.sqrt((lx - last_lx)**2 + (ly - last_ly)**2) / dt
                                    highest_velocity = max(highest_velocity, vel)
                                    
                                    if vel > FIGHT_VELOCITY_THRESHOLD * 20: # Adjusted for mediapipe space
                                        fight_detected_this_frame = True
                                        alert_boxes.append({
                                            "box": b1, "label": "VIOLENT ENCOUNTER", "conf": 0.9, "is_anomaly": True
                                        })
                                        alert_boxes.append({
                                            "box": b2, "label": "VIOLENT ENCOUNTER", "conf": 0.9, "is_anomaly": True
                                        })
                                        
                            state["last_limbs"][pair_id] = (lx, ly)
                            state["last_timestamp"] = now

        if fight_detected_this_frame:
            state["consecutive_frames"] += 1
        else:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)

        is_fight_alert = state["consecutive_frames"] >= FIGHT_CONSECUTIVE_FRAMES
        return is_fight_alert, min(1.0, highest_velocity / 1000.0), alert_boxes
