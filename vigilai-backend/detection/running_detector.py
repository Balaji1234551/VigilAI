"""
Running Detector Module for VigilAI.
Extracts MediaPipe Pose landmarks to calculate the horizontal velocity of the person.
Triggers a panic activity alert if the person is moving unnaturally fast.
"""
import time
import math
import cv2
import logging
import mediapipe as mp
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.RunningDetector")

class RunningDetector:
    def __init__(self):
        self.is_ready = False
        try:
            self.mp_pose = mp.solutions.pose
            self.pose = self.mp_pose.Pose(
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
                model_complexity=0 # fast model for real-time
            )
            self.is_ready = True
        except Exception as e:
            logger.error(f"Failed to load mediapipe pose: {e}. Running detection disabled.")
        
        # State tracking: {camera_id: {"last_x": x, "last_time": t, "consecutive_running": n}}
        self.camera_states = {}
        # Running threshold in normalized screen width per second (e.g. 0.8 = crosses 80% of screen in 1 second)
        self.running_velocity_threshold = 0.5 

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[bool, float, List[Dict[str, Any]]]:
        if not self.is_ready:
            return False, 0.0, []

        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "last_x": None,
                "last_time": None,
                "consecutive_running": 0
            }

        state = self.camera_states[camera_id]
        now = time.time()
        
        # MediaPipe expects RGB
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(frame_rgb)
        
        is_alert = False
        max_conf = 0.0
        alert_boxes = []

        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Use hip landmarks to track horizontal position
            left_hip = landmarks[self.mp_pose.PoseLandmark.LEFT_HIP.value]
            right_hip = landmarks[self.mp_pose.PoseLandmark.RIGHT_HIP.value]
            
            # Confidence check
            if left_hip.visibility > 0.5 and right_hip.visibility > 0.5:
                avg_x = (left_hip.x + right_hip.x) / 2.0
                max_conf = (left_hip.visibility + right_hip.visibility) / 2.0
                
                if state["last_x"] is not None and state["last_time"] is not None:
                    dt = now - state["last_time"]
                    if dt > 0:
                        velocity = abs(avg_x - state["last_x"]) / dt
                        
                        if velocity > self.running_velocity_threshold:
                            state["consecutive_running"] += 1
                        else:
                            state["consecutive_running"] = max(0, state["consecutive_running"] - 1)
                            
                state["last_x"] = avg_x
                state["last_time"] = now
                
                # Check consecutive triggers to avoid glitches
                if state["consecutive_running"] >= 3:
                    is_alert = True
                    h, w = frame.shape[:2]
                    # Estimate a bounding box around the pose for visualization
                    # Find min/max x and y across all visible landmarks
                    xs = [lm.x for lm in landmarks if lm.visibility > 0.5]
                    ys = [lm.y for lm in landmarks if lm.visibility > 0.5]
                    if xs and ys:
                        x1, y1 = int(min(xs) * w), int(min(ys) * h)
                        x2, y2 = int(max(xs) * w), int(max(ys) * h)
                        alert_boxes.append({
                            "box": (max(0, x1-20), max(0, y1-20), min(w, x2+20), min(h, y2+20)),
                            "label": "RUNNING",
                            "conf": max_conf,
                            "is_anomaly": True
                        })
        else:
            state["consecutive_running"] = 0
            state["last_x"] = None
            state["last_time"] = None

        return is_alert, max_conf, alert_boxes
