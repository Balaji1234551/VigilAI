"""
Face-Blurred Snapshot Capture Module for VigilAI.
Detects faces using Haar Cascades, applies Gaussian Blur for privacy compliance,
resizes output to 800x450, and saves to snapshots storage directory.
"""
import os
import cv2
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional
from config import SNAPSHOTS_DIR

logger = logging.getLogger("VigilAI.Snapshot")

# Load Haar Cascade XML classifier for frontal face recognition
CASCADE_PATH = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(CASCADE_PATH)

if face_cascade.empty():
    logger.error("Failed to load OpenCV face detection cascade classifier XML. Face blurring may fail.")


def capture_blurred_snapshot(camera_id: int, frame: cv2.Mat, anomaly_type: str) -> Optional[Path]:
    """
    Grabs a frame, detects faces, blurs them, resizes to 800x450, and saves as JPEG.
    Returns Path to the saved file or None if failed.
    """
    if frame is None:
        logger.error(f"[Snapshot Cam {camera_id}] Input frame is None.")
        return None

    try:
        # Create a copy to prevent mutating the original stream frame
        snapshot_frame = frame.copy()
        
        # 1. Convert to Grayscale for Cascade Classifier
        gray_frame = cv2.cvtColor(snapshot_frame, cv2.COLOR_BGR2GRAY)
        
        # 2. Detect Faces
        # scaleFactor=1.1, minNeighbors=5, minSize=(30,30) is the optimal standard setup
        faces = face_cascade.detectMultiScale(
            gray_frame,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # 3. Apply Gaussian Blur to each detected face region
        for (x, y, w, h) in faces:
            # Extract Region of Interest (ROI) matching face bounding box
            face_roi = snapshot_frame[y:y+h, x:x+w]
            
            # Apply Gaussian Blur (kernel width/height must be positive and odd)
            # Use kernel of size (25, 25) with a standard deviation of 30 for high privacy obfuscation
            blurred_face = cv2.GaussianBlur(face_roi, (25, 25), 30)
            
            # Replace raw face ROI with blurred face
            snapshot_frame[y:y+h, x:x+w] = blurred_face

        # 4. Resize to 800x450 for storage and network transfer efficiency
        resized_frame = cv2.resize(snapshot_frame, (800, 450))

        # 5. Format folder structure: snapshots/camera_id/
        camera_snapshot_dir = SNAPSHOTS_DIR / str(camera_id)
        camera_snapshot_dir.mkdir(parents=True, exist_ok=True)

        now = datetime.now()
        timestamp_str = now.strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"snapshot_{anomaly_type.upper()}_{timestamp_str}.jpg"
        output_filepath = camera_snapshot_dir / filename

        # 6. Save JPEG with quality=80 (bandwidth efficient)
        success = cv2.imwrite(
            str(output_filepath),
            resized_frame,
            [cv2.IMWRITE_JPEG_QUALITY, 80]
        )

        if success:
            logger.info(f"[Snapshot Cam {camera_id}] Snapshot captured successfully: {filename}")
            return output_filepath
        else:
            logger.error(f"[Snapshot Cam {camera_id}] cv2.imwrite failed for path: {output_filepath}")
            return None

    except Exception as e:
        logger.error(f"[Snapshot Cam {camera_id}] Error occurred capturing snapshot: {e}")
        return None
