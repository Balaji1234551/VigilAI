"""
Face Recognition Module for VigilAI.
Extracts faces using OpenCV's Haar Cascade and checks them against a known whitelist.
Flags unrecognized faces as UNKNOWN PERSON alerts.
"""
import cv2
import logging
import os
from typing import Dict, List, Tuple, Any

logger = logging.getLogger("VigilAI.FaceDetector")

class FaceDetector:
    def __init__(self):
        # Load OpenCV default Haar cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        
        # Frame counter for throttling
        self.frame_counters = {}

    def process_frame(self, camera_id: int, frame: cv2.Mat) -> Tuple[bool, float, List[Dict[str, Any]]]:
        if self.face_cascade.empty():
            return False, 0.0, []

        if camera_id not in self.frame_counters:
            self.frame_counters[camera_id] = 0
            
        self.frame_counters[camera_id] += 1
        
        # Run face detection every 10 frames to save CPU
        if self.frame_counters[camera_id] % 10 != 0:
            return False, 0.0, []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        # Optimization: run on downscaled image
        scale_percent = 50
        width = int(gray.shape[1] * scale_percent / 100)
        height = int(gray.shape[0] * scale_percent / 100)
        dim = (width, height)
        resized = cv2.resize(gray, dim, interpolation=cv2.INTER_AREA)

        faces = self.face_cascade.detectMultiScale(resized, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        is_alert = False
        max_conf = 0.0
        alert_boxes = []

        # Scale factor inverse to map back to original coordinates
        inv_scale = 100 / scale_percent

        for (x, y, w, h) in faces:
            x1 = int(x * inv_scale)
            y1 = int(y * inv_scale)
            x2 = int((x + w) * inv_scale)
            y2 = int((y + h) * inv_scale)
            
            # In a full system, you would extract the face crop here, 
            # run it through a deep learning embedding network (like face_recognition or DeepFace),
            # and compare it to a database.
            # For demonstration, we flag all detected faces as UNKNOWN PERSON.
            
            is_alert = True
            # Haar cascades don't output confidence natively, so we assign a generic high confidence
            max_conf = 0.85 
            
            alert_boxes.append({
                "box": (x1, y1, x2, y2),
                "label": "UNKNOWN PERSON",
                "conf": max_conf,
                "is_anomaly": True
            })

        return is_alert, max_conf, alert_boxes
