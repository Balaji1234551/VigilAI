import cv2
import math
import time
import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from app.config import FALL_CONF_THRESHOLD, FALL_TRACK_THRESHOLD, FALL_ANGLE_THRESHOLD, FALL_VELOCITY_THRESHOLD, FALL_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FallDetector")

class FallDetector:
    def __init__(self):
        logger.info("Initializing YOLOv8-Pose for Fall Detection...")
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

    def process_frame(self, camera_id: int, frame: np.ndarray, pose_model) -> Tuple[bool, float, List[Tuple[Tuple[int, int], Tuple[int, int]]], List[Dict[str, Any]]]:
        h, w, _ = frame.shape
        state = self._get_or_create_state(camera_id)
        
        skeleton_lines: List[Tuple[Tuple[int, int], Tuple[int, int]]] = []
        boxes: List[Dict[str, Any]] = []
        is_fall_detected_now = False
        avg_confidence = 0.0

        if pose_model is None:
            return False, 0.0, [], []

        results = pose_model(frame, verbose=False)
        
        if not results or not results[0].keypoints or results[0].keypoints.data.shape[1] == 0:
            state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)
            state["last_y_pixel"] = None
            state["last_timestamp"] = None
            return False, 0.0, [], []

        try:
            # Multi-person processing
            keypoints_tensor = results[0].keypoints.data
            
            for person_idx in range(keypoints_tensor.shape[0]):
                kpts = keypoints_tensor[person_idx]
                
                # COCO Indices: 5=LShoulder, 6=RShoulder, 11=LHip, 12=RHip
                L_SH, R_SH = kpts[5], kpts[6]
                L_HIP, R_HIP = kpts[11], kpts[12]
                
                if L_SH[2] > 0.4 and R_SH[2] > 0.4 and L_HIP[2] > 0.4 and R_HIP[2] > 0.4:
                    avg_confidence = float((L_SH[2] + R_SH[2] + L_HIP[2] + R_HIP[2]) / 4.0)

                    mid_shoulder_x = (L_SH[0] + R_SH[0]) / 2.0
                    mid_shoulder_y = (L_SH[1] + R_SH[1]) / 2.0
                    mid_hip_x = (L_HIP[0] + R_HIP[0]) / 2.0
                    mid_hip_y = (L_HIP[1] + R_HIP[1]) / 2.0

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
                        is_fall_detected_now = True

                # Bounding box extraction
                valid_kpts = [k for k in kpts if k[2] > 0.2]
                if valid_kpts:
                    xs = [k[0] for k in valid_kpts]
                    ys = [k[1] for k in valid_kpts]
                    x1, y1 = max(0, int(min(xs) - 20)), max(0, int(min(ys) - 20))
                    x2, y2 = min(w, int(max(xs) + 20)), min(h, int(max(ys) + 20))
                    
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "FALLING" if is_fall_detected_now else "PERSON",
                        "conf": avg_confidence,
                        "is_anomaly": is_fall_detected_now
                    })
                
                # Add basic skeleton lines
                self._add_yolo_skeleton(kpts, skeleton_lines)
                
            if is_fall_detected_now:
                state["consecutive_fall_frames"] += 1
            else:
                state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)

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

    def _add_yolo_skeleton(self, kpts, lines: List):
        # Basic YOLO COCO skeleton connections
        connections = [(5,7), (7,9), (6,8), (8,10), (5,11), (6,12), (11,13), (13,15), (12,14), (14,16), (5,6), (11,12)]
        for start_idx, end_idx in connections:
            if start_idx < len(kpts) and end_idx < len(kpts):
                p1, p2 = kpts[start_idx], kpts[end_idx]
                if p1[2] > 0.4 and p2[2] > 0.4:
                    pt1 = (int(p1[0]), int(p1[1]))
                    pt2 = (int(p2[0]), int(p2[1]))
                    lines.append((pt1, pt2))
