"""
Abnormal Posture Detection Module for VigilAI.
Extracts 2D skeleton keypoints using MediaPipe Pose to detect abnormal
postures such as crouching, hiding, or hands raised.
"""
import cv2
import time
import logging
import numpy as np
import mediapipe as mp
from typing import Dict, List, Tuple, Optional, Any

logger = logging.getLogger("VigilAI.PostureDetector")

class PostureDetector:
    """
    Analyzes body postures frame-by-frame using MediaPipe Pose.
    """
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=1
        )
        self.camera_states: Dict[int, Dict[str, Any]] = {}
        self.CONSECUTIVE_FRAMES = 15

    def _get_state(self, camera_id: int) -> Dict[str, Any]:
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "consecutive_frames": 0,
            }
        return self.camera_states[camera_id]

    def process_frame(self, camera_id: int, frame: np.ndarray, person_boxes: List[Dict[str, Any]]) -> Tuple[bool, float, List[Dict[str, Any]]]:
        h, w, _ = frame.shape
        state = self._get_state(camera_id)
        
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        is_abnormal = False
        highest_conf = 0.0
        alert_boxes: List[Dict[str, Any]] = []

        for pbox in person_boxes:
            b = pbox["box"]
            # Crop to person box to save processing time
            x1, y1, x2, y2 = map(int, b)
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            crop = rgb_frame[y1:y2, x1:x2]
            if crop.size == 0: continue
            
            results = self.pose.process(crop)
            if results.pose_landmarks:
                landmarks = results.pose_landmarks.landmark
                
                L_SHOULDER = landmarks[self.mp_pose.PoseLandmark.LEFT_SHOULDER.value]
                R_SHOULDER = landmarks[self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
                L_HIP = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
                R_HIP = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
                L_KNEE = landmarks[self.mp_pose.PoseLandmark.LEFT_KNEE.value]
                R_KNEE = landmarks[self.mp_pose.PoseLandmark.RIGHT_KNEE.value]
                L_WRIST = landmarks[self.mp_pose.PoseLandmark.LEFT_WRIST.value]
                R_WRIST = landmarks[self.mp_pose.PoseLandmark.RIGHT_WRIST.value]
                
                # Check Crouching (Hips close to knees horizontally/vertically)
                if (L_HIP.visibility > 0.5 and L_KNEE.visibility > 0.5):
                    hip_knee_dist = abs(L_HIP.y - L_KNEE.y)
                    # If vertical distance between hip and knee is very small compared to normal bounding box, they are crouching
                    if hip_knee_dist < 0.15: # Highly compressed vertical posture
                        is_abnormal = True
                        highest_conf = max(highest_conf, 0.8)
                
                # Check Hands Raised (Wrists above shoulders)
                if (L_WRIST.visibility > 0.5 and L_SHOULDER.visibility > 0.5):
                    if L_WRIST.y < L_SHOULDER.y and R_WRIST.y < R_SHOULDER.y:
                        is_abnormal = True
                        highest_conf = max(highest_conf, 0.9)
                        
                if is_abnormal:
                    alert_boxes.append({
                        "box": b,
                        "label": "ABNORMAL POSTURE",
                        "conf": highest_conf,
                        "is_anomaly": True
                    })

        if is_abnormal:
            state["consecutive_frames"] += 1
        else:
            state["consecutive_frames"] = max(0, state["consecutive_frames"] - 1)

        is_alert = state["consecutive_frames"] >= self.CONSECUTIVE_FRAMES
        if is_alert:
            logger.warning(f"[PostureDetector Cam {camera_id}] ⚠️ ABNORMAL POSTURE DETECTED!")
            
        return is_alert, highest_conf, alert_boxes
