"""
Fight and Violence Detection Module for VigilAI.
Tracks multiple person centroids, measures proximity, and implements Farneback Dense Optical Flow
to detect high-frequency physical combat/shoving velocities (>50px/frame) over 15 consecutive frames.
"""
import cv2
import math
import logging
from typing import Dict, List, Tuple, Optional, Any
from config import FIGHT_DISTANCE_THRESHOLD, FIGHT_VELOCITY_THRESHOLD, FIGHT_CONSECUTIVE_FRAMES

logger = logging.getLogger("VigilAI.FightDetector")


class FightDetector:
    """
    Combines person proximity metrics with dense pixel optical flow vector fields
    to isolate rapid limb/motion velocities characteristic of physical violence.
    """
    def __init__(self):
        # Store the grayscale version of the previous frame per camera to calculate optical flow
        self.prev_grays: Dict[int, cv2.Mat] = {}
        
        # State tracking: consecutive fight frames per camera
        self.camera_states: Dict[int, int] = {}

    def process_frame(
        self, 
        camera_id: int, 
        frame: cv2.Mat, 
        person_boxes: List[Dict[str, Any]]
    ) -> Tuple[bool, float, List[Dict[str, Any]]]:
        """
        Calculates optical flow and cross-person distances.
        Args:
            camera_id (int): ID of current stream.
            frame (cv2.Mat): RGB/BGR image frame.
            person_boxes (List): Person bounding boxes from YOLOv8.
        Returns:
            is_fight (bool): True if verified combat/brawl is occurring.
            confidence (float): Calculated severity metric.
            alert_boxes (List): Highlighted bounding boxes of fighting people.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        # 1. Initialize state variables if not exist
        if camera_id not in self.camera_states:
            self.camera_states[camera_id] = 0
            self.prev_grays[camera_id] = gray
            return False, 0.0, []

        prev_gray = self.prev_grays[camera_id]
        self.prev_grays[camera_id] = gray  # Update history cache
        
        # We need at least 2 people to detect a fight/violence
        if len(person_boxes) < 2:
            self.camera_states[camera_id] = max(0, self.camera_states[camera_id] - 1)
            return False, 0.0, []

        # 2. Calculate Farneback Dense Optical Flow
        # pyr_scale=0.5, levels=3, winsize=15, iterations=3, poly_n=5, poly_sigma=1.2
        # This yields dense flow vectors (dx, dy) for every pixel in the frame
        flow = cv2.calcOpticalFlowFarneback(
            prev_gray, 
            gray, 
            None, 
            pyr_scale=0.5, 
            levels=3, 
            winsize=15, 
            iterations=3, 
            poly_n=5, 
            poly_sigma=1.2, 
            flags=0
        )
        
        # Compute flow magnitude matrix
        magnitude, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        
        fight_detected_this_frame = False
        highest_velocity = 0.0
        alert_boxes: List[Dict[str, Any]] = []
        
        # 3. Analyze proximity and velocities between pairs of people
        for i in range(len(person_boxes)):
            for j in range(i + 1, len(person_boxes)):
                box1 = person_boxes[i]["box"]
                box2 = person_boxes[j]["box"]
                
                # Bounding box coordinates: [x1, y1, x2, y2]
                b1_x1, b1_y1, b1_x2, b1_y2 = box1
                b2_x1, b2_y1, b2_x2, b2_y2 = box2
                
                # Centroids
                c1 = ((b1_x1 + b1_x2) / 2.0, (b1_y1 + b1_y2) / 2.0)
                c2 = ((b2_x1 + b2_x2) / 2.0, (b2_y1 + b2_y2) / 2.0)
                
                # Centroid Euclidean Distance (pixels)
                dist = math.sqrt((c1[0] - c2[0])**2 + (c1[1] - c2[1])**2)
                
                # Check proximity threshold (150px)
                if dist < FIGHT_DISTANCE_THRESHOLD:
                    # 4. Measure optical flow velocity inside interacting boundary area
                    # Find overlap/union bounding coordinates
                    u_x1 = max(0, min(b1_x1, b2_x1))
                    u_y1 = max(0, min(b1_y1, b2_y1))
                    u_x2 = min(frame.shape[1], max(b1_x2, b2_x2))
                    u_y2 = min(frame.shape[0], max(b1_y2, b2_y2))
                    
                    # Extract flow magnitude sub-region of interacting group
                    interact_magnitude = magnitude[u_y1:u_y2, u_x1:u_x2]
                    
                    if interact_magnitude.size > 0:
                        # Average motion speed inside the bounding region
                        avg_velocity = float(interact_magnitude.mean())
                        highest_velocity = max(highest_velocity, avg_velocity)
                        
                        # Fight Trigger Condition: close proximity AND high rapid motion velocity
                        if avg_velocity > FIGHT_VELOCITY_THRESHOLD:
                            fight_detected_this_frame = True
                            
                            # Highlight the fighting individuals
                            alert_boxes.append({
                                "box": (b1_x1, b1_y1, b1_x2, b1_y2),
                                "label": "VIOLENT ENCOUNTER",
                                "conf": min(0.99, avg_velocity / 100.0),
                                "is_anomaly": True
                            })
                            alert_boxes.append({
                                "box": (b2_x1, b2_y1, b2_x2, b2_y2),
                                "label": "VIOLENT ENCOUNTER",
                                "conf": min(0.99, avg_velocity / 100.0),
                                "is_anomaly": True
                            })
                            logger.warning(
                                f"[FightDetector Cam {camera_id}] Proximity alert! Dist={dist:.1f}px, Motion Velocity={avg_velocity:.1f}px/frame"
                            )

        # 5. Consecutive frame confirmation (15 frames)
        if fight_detected_this_frame:
            self.camera_states[camera_id] += 1
            logger.info(f"[FightDetector Cam {camera_id}] Fight frame sequence: {self.camera_states[camera_id]}/15")
        else:
            self.camera_states[camera_id] = max(0, self.camera_states[camera_id] - 1)

        is_fight_alert = self.camera_states[camera_id] >= FIGHT_CONSECUTIVE_FRAMES
        
        if is_fight_alert:
            logger.warning(f"[FightDetector Cam {camera_id}] ⚠️ FIGHT / VIOLENCE DETECTED! (15/15 frames confirmed)")

        return is_fight_alert, min(1.0, highest_velocity / 100.0), alert_boxes
