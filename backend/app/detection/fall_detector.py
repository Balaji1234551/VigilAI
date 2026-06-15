"""
YOLOv8-pose Fall Detection Module for VigilAI.
Extracts 2D skeleton keypoints using a highly optimized YOLOv8 pose model,
calculates torso angle with the horizontal plane, tracks vertical velocity,
and triggers alerts with cyan skeleton visual lines.
Bypasses MediaPipe to achieve perfect compatibility and hardware acceleration.
"""
import cv2
import math
import time
import logging
from typing import Dict, List, Tuple, Optional, Any
from app.config import FALL_CONF_THRESHOLD, FALL_TRACK_THRESHOLD, FALL_ANGLE_THRESHOLD, FALL_VELOCITY_THRESHOLD, FALL_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FallDetector")


class FallDetector:
    """
    Analyzes body postures and velocities frame-by-frame using a YOLOv8-pose model.
    Maintains historical posture state to avoid transient false positives.
    """
    def __init__(self):
        # Initialize YOLOv8 Pose Model
        from ultralytics import YOLO
        import os
        from pathlib import Path
        
        # Dynamically resolve path to ensure we can load from vigilai-backend directory
        base_dir = Path(__file__).resolve().parent.parent
        model_path = str(base_dir / "yolov8n-pose.pt")
        
        logger.info(f"Initializing YOLOv8-pose model for Fall Detection from '{model_path}'...")
        self.model = YOLO(model_path)
        
        # State tracking per camera: {camera_id: {state_vars}}
        self.camera_states: Dict[int, Dict[str, Any]] = {}

    def _get_or_create_state(self, camera_id: int) -> Dict[str, Any]:
        """
        Retrieves or initializes state variables for a camera.
        """
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

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[bool, float, List[Tuple[Tuple[int, int], Tuple[int, int]]], List[Dict[str, Any]]]:
        """
        Analyzes a single frame for fall signatures using YOLOv8-pose.
        Returns:
            is_fall (bool): Whether a confirmed fall is active.
            confidence (float): Landmark tracking confidence.
            skeleton_lines (List): List of line segment tuples ((x1, y1), (x2, y2)) in cyan.
            boxes (List): Bounding boxes to draw around falling persons.
        """
        h, w, _ = frame.shape
        state = self._get_or_create_state(camera_id)
        
        # Run YOLOv8 pose inference
        results = self.model(frame, verbose=False)
        
        skeleton_lines: List[Tuple[Tuple[int, int], Tuple[int, int]]] = []
        boxes: List[Dict[str, Any]] = []
        is_fall_detected_now = False
        avg_confidence = 0.0
        
        if not results or len(results[0]) == 0:
            # No person detected; decay consecutive fall frames
            state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)
            state["last_y_pixel"] = None
            state["last_timestamp"] = None
            return False, 0.0, [], []

        result = results[0]
        
        # Check if keypoints are present
        if result.keypoints is None or len(result.keypoints) == 0:
            state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)
            state["last_y_pixel"] = None
            state["last_timestamp"] = None
            return False, 0.0, [], []

        try:
            # We iterate over detected poses
            for person_idx in range(len(result.keypoints)):
                xy = result.keypoints.xy[person_idx].cpu().numpy()  # shape (17, 2)
                conf = result.keypoints.conf[person_idx].cpu().numpy() if result.keypoints.conf is not None else None
                box = result.boxes.xyxy[person_idx].cpu().numpy()  # shape (4,)
                box_conf = float(result.boxes.conf[person_idx].cpu().numpy())

                # Keypoint indices
                LEFT_SHOULDER = 5
                RIGHT_SHOULDER = 6
                LEFT_HIP = 11
                RIGHT_HIP = 12

                # Check if we have visible shoulder and hip keypoints (confidence > 0.4)
                if conf is not None and (conf[LEFT_SHOULDER] > 0.4 and conf[RIGHT_SHOULDER] > 0.4 and 
                                         conf[LEFT_HIP] > 0.4 and conf[RIGHT_HIP] > 0.4):
                    
                    # Confidence calculation (average visibility of core trunk keypoints)
                    avg_confidence = float((conf[LEFT_SHOULDER] + conf[RIGHT_SHOULDER] + conf[LEFT_HIP] + conf[RIGHT_HIP]) / 4.0)

                    # Torso Midpoints in pixel coordinates
                    mid_shoulder_x = (xy[LEFT_SHOULDER][0] + xy[RIGHT_SHOULDER][0]) / 2.0
                    mid_shoulder_y = (xy[LEFT_SHOULDER][1] + xy[RIGHT_SHOULDER][1]) / 2.0
                    mid_hip_x = (xy[LEFT_HIP][0] + xy[RIGHT_HIP][0]) / 2.0
                    mid_hip_y = (xy[LEFT_HIP][1] + xy[RIGHT_HIP][1]) / 2.0

                    # Calculate Torso Angle with Horizontal Plane
                    dx = abs(mid_hip_x - mid_shoulder_x)
                    dy = abs(mid_hip_y - mid_shoulder_y)
                    if dx == 0:
                        dx = 0.001
                    body_angle = math.degrees(math.atan2(dy, dx))

                    # Vertical Velocity Tracking down the y-axis (pixels/sec)
                    now = time.time()
                    current_y_pixel = mid_hip_y
                    vertical_velocity = 0.0

                    if state["last_y_pixel"] is not None and state["last_timestamp"] is not None:
                        dt = now - state["last_timestamp"]
                        if dt > 0:
                            vertical_velocity = (current_y_pixel - state["last_y_pixel"]) / dt

                    state["last_y_pixel"] = current_y_pixel
                    state["last_timestamp"] = now

                    # Check Fall Conditions
                    if vertical_velocity > FALL_VELOCITY_THRESHOLD * 30:  # Scale threshold by frame interval
                        state["velocity_triggered"] = True
                        state["velocity_trigger_expiry"] = now + 1.5  # Lock velocity trigger active for 1.5s window

                    is_velocity_active = state["velocity_triggered"] and (now < state["velocity_trigger_expiry"])
                    if now >= state["velocity_trigger_expiry"]:
                        state["velocity_triggered"] = False

                    is_horizontal = body_angle < FALL_ANGLE_THRESHOLD

                    # If torso is flat AND we recently observed a high velocity, or torso is flat
                    if is_horizontal and (is_velocity_active or state["consecutive_fall_frames"] > 0):
                        state["consecutive_fall_frames"] += 1
                        is_fall_detected_now = True
                    else:
                        state["consecutive_fall_frames"] = max(0, state["consecutive_fall_frames"] - 1)

                    # Generate Cyan Pose Skeleton Lines
                    self._add_skeleton_lines_yolo(xy, conf, skeleton_lines)

                    # Add bounding box around falling person
                    x1, y1, x2, y2 = map(int, box)
                    boxes.append({
                        "box": (x1, y1, x2, y2),
                        "label": "FALLING" if is_fall_detected_now else "PERSON",
                        "conf": box_conf,
                        "is_anomaly": is_fall_detected_now
                    })
                    
                    # Analyze the most confident/primary person
                    break

        except Exception as e:
            logger.error(f"[FallDetector Cam {camera_id}] Keypoint parsing error: {e}", exc_info=True)

        # Hysteresis confirmation: Trigger alert only if horizontal persists for consecutive frames
        is_confirmed_fall = state["consecutive_fall_frames"] >= FALL_CONSECUTIVE_FRAMES
        
        if is_confirmed_fall and not state["is_alert_active"]:
            state["is_alert_active"] = True
            logger.warning(f"[FallDetector Cam {camera_id}] ⚠️ FALL ALERT CONFIRMED!")
        elif not is_fall_detected_now and state["is_alert_active"]:
            # Reset alert state once they are no longer on the ground
            state["is_alert_active"] = False
            logger.info(f"[FallDetector Cam {camera_id}] Fall resolved.")
            
        return is_confirmed_fall, avg_confidence, skeleton_lines, boxes

    def _add_skeleton_lines_yolo(self, xy, conf, lines: List):
        """
        Helper to map coordinate points for rendering a complete body pose model based on COCO 17 landmarks.
        """
        connections = [
            (5, 6),   # Shoulder connection
            (5, 7),   # Left arm upper
            (7, 9),   # Left arm lower
            (6, 8),   # Right arm upper
            (8, 10),  # Right arm lower
            (5, 11),  # Left torso
            (6, 12),  # Right torso
            (11, 12), # Hip connection
            (11, 13), # Left leg upper
            (13, 15), # Left leg lower
            (12, 14), # Right leg upper
            (14, 16)  # Right leg lower
        ]
        for start_idx, end_idx in connections:
            if conf[start_idx] > 0.4 and conf[end_idx] > 0.4:
                pt1 = (int(xy[start_idx][0]), int(xy[start_idx][1]))
                pt2 = (int(xy[end_idx][0]), int(xy[end_idx][1]))
                lines.append((pt1, pt2))
