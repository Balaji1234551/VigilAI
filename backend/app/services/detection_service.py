"""
YOLOv8 Detection Service for VigilAI
Handles real-time object detection for Package Theft and Person detection.
"""
from ultralytics import YOLO
import numpy as np
import cv2
from typing import List, Dict, Tuple


class DetectionService:
    """Service for YOLOv8 real-time object detection."""
    
    def __init__(self, model_name: str = "yolov8n.pt"):
        """
        Initialize YOLOv8 model.
        
        Args:
            model_name: YOLOv8 model size (nano, small, medium, large, xlarge)
                      Recommend 'yolov8n.pt' for balance of speed/accuracy
        """
        import os
        from pathlib import Path
        
        # Dynamically resolve path to ensure we can load from backend directory
        base_dir = Path(__file__).resolve().parent.parent.parent
        resolved_path = str(base_dir / model_name) if not os.path.isabs(model_name) else model_name
        
        self.model = YOLO(resolved_path)
        self.confidence_threshold = 0.5
        self.class_names = {
            0: "person",
            # Add other relevant classes as needed
            # 24: "backpack" (can indicate packages),
            # 39: "bottle", etc.
        }
    
    def detect_objects(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect objects in a video frame.
        
        Args:
            frame: Input frame (BGR format from OpenCV)
        
        Returns:
            List of detections with class, confidence, and bounding box
        """
        try:
            # Run inference
            results = self.model(frame, conf=self.confidence_threshold)
            
            detections = []
            if results and len(results) > 0:
                boxes = results[0].boxes
                
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.model.names[class_id]
                    
                    detections.append({
                        "class_id": class_id,
                        "class_name": class_name,
                        "confidence": confidence,
                        "bbox": {
                            "x1": float(x1),
                            "y1": float(y1),
                            "x2": float(x2),
                            "y2": float(y2),
                            "width": float(x2 - x1),
                            "height": float(y2 - y1)
                        }
                    })
            
            return detections
        except Exception as e:
            print(f"Error in object detection: {e}")
            return []
    
    def detect_with_visualization(self, frame: np.ndarray) -> Tuple[np.ndarray, List[Dict]]:
        """
        Detect objects and draw bounding boxes on frame.
        
        Args:
            frame: Input frame
        
        Returns:
            Tuple of (annotated_frame, detections)
        """
        detections = self.detect_objects(frame)
        
        # Draw bounding boxes
        for det in detections:
            bbox = det["bbox"]
            x1, y1 = int(bbox["x1"]), int(bbox["y1"])
            x2, y2 = int(bbox["x2"]), int(bbox["y2"])
            
            # Choose color based on class
            color = (0, 255, 0)  # Green for person
            if "package" in det["class_name"].lower():
                color = (0, 165, 255)  # Orange for packages
            
            # Draw rectangle
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{det['class_name']} {det['confidence']:.2f}"
            cv2.putText(
                frame, label, (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2
            )
        
        return frame, detections
    
    def detect_high_confidence_objects(
        self,
        frame: np.ndarray,
        min_confidence: float = 0.7
    ) -> List[Dict]:
        """
        Detect objects with high confidence threshold.
        Useful for alert triggering.
        """
        detections = self.detect_objects(frame)
        return [d for d in detections if d["confidence"] >= min_confidence]
    
    def detect_persons(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect only persons in the frame.
        """
        detections = self.detect_objects(frame)
        return [d for d in detections if d["class_name"].lower() == "person"]
    
    def detect_packages(self, frame: np.ndarray) -> List[Dict]:
        """
        Detect package-like objects (backpacks, boxes, handbags).
        """
        detections = self.detect_objects(frame)
        package_keywords = ["backpack", "handbag", "suitcase", "box", "package"]
        return [
            d for d in detections
            if any(keyword in d["class_name"].lower() for keyword in package_keywords)
        ]
