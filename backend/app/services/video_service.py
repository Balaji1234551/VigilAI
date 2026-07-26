import cv2
import threading
import time
from fastapi import HTTPException
from app.services.detection_service import DetectionService

class VideoStreamingService:
    """Service to handle real-time OpenCV camera connections and AI processing."""
    
    def __init__(self):
        # We share one detection service instance across streams to save RAM
        # In a very large production app, you might want to run this in a background worker
        self.detector = DetectionService(model_name="models/best.pt")
        # Keep track of active streams to avoid opening the same camera multiple times
        self.active_streams = {}

    def get_video_generator(self, url: str):
        """
        Creates a generator that reads from the camera URL, processes with YOLO,
        and yields MJPEG frames.
        """
        cap = cv2.VideoCapture(url)
        
        if not cap.isOpened():
            print(f"Error: Could not open video stream for URL: {url}")
            # Yield a blank frame or error frame instead of crashing
            # But normally we'd want to raise an exception early
            raise Exception("Could not open stream")

        print(f"Successfully connected to stream: {url}")
        
        frame_skip = 2  # Process every 3rd frame to save CPU
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    # Reconnect logic or stream ended
                    print(f"Stream disconnected: {url}")
                    break
                
                frame_count += 1
                
                # Run AI detection on some frames, use raw frame on others for smooth playback
                if frame_count % frame_skip == 0:
                    annotated_frame, detections = self.detector.detect_with_visualization(frame)
                    
                    # Optional: Check for alerts
                    persons = [d for d in detections if d["class_name"].lower() == "person"]
                    if persons:
                        cv2.putText(
                            annotated_frame, 
                            f"ALERT: {len(persons)} Person(s) Detected", 
                            (50, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 
                            1, 
                            (0, 0, 255), 
                            3
                        )
                else:
                    # In a real system, you might want to keep the last bounding boxes 
                    # and draw them on this raw frame. For now, we just pass the frame.
                    annotated_frame = frame
                
                # Encode frame as JPEG
                ret, buffer = cv2.imencode('.jpg', annotated_frame)
                if not ret:
                    continue
                    
                frame_bytes = buffer.tobytes()
                
                # Yield in multipart format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                
                # Small sleep to control frame rate and avoid CPU pinning
                time.sleep(0.03) 
                
        except Exception as e:
            print(f"Error streaming video: {e}")
        finally:
            cap.release()

# Global instance
video_streaming_service = VideoStreamingService()
