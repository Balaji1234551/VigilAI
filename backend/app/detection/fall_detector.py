"""
MediaPipe Pose Fall Detection Module for VigilAI.
Extracts 2D skeleton keypoints using MediaPipe Pose, calculates torso angle,
tracks vertical velocity, and triggers alerts with skeleton lines.
"""
import cv2
import math
import time
import logging
import numpy as np
import mediapipe as mp
from typing import Dict, List, Tuple, Optional, Any
from app.config import FALL_CONF_THRESHOLD, FALL_TRACK_THRESHOLD, FALL_ANGLE_THRESHOLD, FALL_VELOCITY_THRESHOLD, FALL_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FallDetector")

class FallDetector:
    """
    Analyzes body postures and velocities frame-by-frame using MediaPipe Pose.
    Maintains historical posture state to avoid transient false positives.
    """
    def __init__(self):
        logger.info("Initializing MediaPipe Pose model for Fall Detection...")
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
            model_complexity=1  # 0=fastest, 1=balanced, 2=accurate
        )
        
        # State tracking per camera: {camera_id: {state_vars}}
        self.camera_states: Dict[int, Dict[str, Any]] = {}

    def _get_or_create_state(self, camera_id: int) -> Dict[str, Any]:
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = {
                "consecutive_fall_frames": 0,
                "last_y_pixel": None,
                "last_timestamp": None,
                "is_alert_active": False,
                "velocity_triggered": False,
                "velocity_trigger_expiry": 0.0
            }
        return self.camera_states[camera_id]

    def process_frame(self, camera_id: int, frame: np.ndarray) -> Tuple[bool, float, List[Tuple[Tuple[int, int], Tuple[int, int]]], List[Dict[str, Any]]]:
        h, w, _ = frame.shape
        state = self._get_or_create_state(camera_id)
        
        # MediaPipe requires RGB images
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)
        
        skeleton_lines: List[Tuple[Tuple[int, int], Tuple[int, int]]] = []
        boxes: List[Dict[str, Any]] = []
        is_fall_detected_now = False
        avg_confidence = 0.0
        
        if not results.pose_landmarks:
            state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)
            state["last_y_pixel"] = None
            state["last_timestamp"] = None
            return False, 0.0, [], []

        try:
            landmarks = results.pose_landmarks.landmark
            
            LEFT_SHOULDER = self.mp_pose.PoseLandmark.LEFT_SHOULDER.value
            RIGHT_SHOULDER = self.mp_pose.PoseLandmark.RIGHT_SHOULDER.value
            LEFT_HIP = self.mp_pose.PoseLandmark.LEFT_HIP.value
            RIGHT_HIP = self.mp_pose.PoseLandmark.RIGHT_HIP.value
            
            if (landmarks[LEFT_SHOULDER].visibility > 0.4 and 
                landmarks[RIGHT_SHOULDER].visibility > 0.4 and 
                landmarks[LEFT_HIP].visibility > 0.4 and 
                landmarks[RIGHT_HIP].visibility > 0.4):
                
                avg_confidence = float((landmarks[LEFT_SHOULDER].visibility + 
                                        landmarks[RIGHT_SHOULDER].visibility + 
                                        landmarks[LEFT_HIP].visibility + 
                                        landmarks[RIGHT_HIP].visibility) / 4.0)

                mid_shoulder_x = (landmarks[LEFT_SHOULDER].x + landmarks[RIGHT_SHOULDER].x) / 2.0 * w
                mid_shoulder_y = (landmarks[LEFT_SHOULDER].y + landmarks[RIGHT_SHOULDER].y) / 2.0 * h
                mid_hip_x = (landmarks[LEFT_HIP].x + landmarks[RIGHT_HIP].x) / 2.0 * w
                mid_hip_y = (landmarks[LEFT_HIP].y + landmarks[RIGHT_HIP].y) / 2.0 * h

                dx = abs(mid_hip_x - mid_shoulder_x)
                dy = abs(mid_hip_y - mid_shoulder_y)
                if dx == 0: dx = 0.001
                body_angle = math.degrees(math.atan2(dy, dx))

                now = time.time()
                current_y_pixel = mid_hip_y
                vertical_velocity = 0.0

                if state["last_y_pixel"] is not None and state["last_timestamp"] is not None:
                    dt = now - state["last_timestamp"]
                    if dt > 0:
                        vertical_velocity = (current_y_pixel - state["last_y_pixel"]) / dt

                state["last_y_pixel"] = current_y_pixel
                state["last_timestamp"] = now

                if vertical_velocity > FALL_VELOCITY_THRESHOLD * 30:
                    state["velocity_triggered"] = True
                    state["velocity_trigger_expiry"] = now + 1.5

                is_velocity_active = state["velocity_triggered"] and (now < state["velocity_trigger_expiry"])
                if now >= state["velocity_trigger_expiry"]:
                    state["velocity_triggered"] = False

                is_horizontal = body_angle < FALL_ANGLE_THRESHOLD

                if is_horizontal and (is_velocity_active or state["consecutive_fall_frames"] > 0):
                    state["consecutive_fall_frames"] += 1
                    is_fall_detected_now = True
                else:
                    state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)

                self._add_skeleton_lines_mp(landmarks, w, h, skeleton_lines)

                # Compute bounding box from all visible landmarks
                visible_landmarks = [lm for lm in landmarks if lm.visibility > 0.2]
                if visible_landmarks:
                    xs = [lm.x * w for lm in visible_landmarks]
                    ys = [lm.y * h for lm in visible_landmarks]
                    x1, y1 = max(0, int(min(xs) - 20)), max(0, int(min(ys) - 20))
                    x2, y2 = min(w, int(max(xs) + 20)), min(h, int(max(ys) + 20))
                    
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "FALLING" if is_fall_detected_now else "PERSON",
                        "conf": avg_confidence,
                        "is_anomaly": is_fall_detected_now
                    })

        except Exception as e:
            logger.error(f"[FallDetector Cam {camera_id}] Keypoint parsing error: {e}", exc_info=True)

        is_confirmed_fall = state["consecutive_fall_frames"] >= FALL_CONSECUTIVE_FRAMES
        
        if is_confirmed_fall and not state["is_alert_active"]:
            state["is_alert_active"] = True
            logger.warning(f"[FallDetector Cam {camera_id}] ⚠️ FALL ALERT CONFIRMED!")
        elif not is_fall_detected_now and state["is_alert_active"]:
            state["is_alert_active"] = False
            logger.info(f"[FallDetector Cam {camera_id}] Fall resolved.")
            
        return is_confirmed_fall, avg_confidence, skeleton_lines, boxes

    def _add_skeleton_lines_mp(self, landmarks, w, h, lines: List):
        connections = self.mp_pose.POSE_CONNECTIONS
        for connection in connections:
            start_idx = connection[0]
            end_idx = connection[1]
            if landmarks[start_idx].visibility > 0.4 and landmarks[end_idx].visibility > 0.4:
                pt1 = (int(landmarks[start_idx].x * w), int(landmarks[start_idx].y * h))
                pt2 = (int(landmarks[end_idx].x * w), int(landmarks[end_idx].y * h))
                lines.append((pt1, pt2))
