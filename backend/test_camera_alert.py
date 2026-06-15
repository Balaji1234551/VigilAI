import cv2
import sys
import os

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.detection_service import DetectionService

def main():
    print("Initializing YOLOv8 Detection Service...")
    # Initialize the detection service (downloads the model if not present)
    detector = DetectionService(model_name="yolov8n.pt")  # Using nano for faster testing
    
    # Wowza Test Stream URL (Public, no password)
    url = "rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1"
    
    print(f"Connecting to Wowza Test Stream: {url}")
    cap = cv2.VideoCapture(url)
    
    if not cap.isOpened():
        print("Error: Could not connect to the stream.")
        return
        
    print("Successfully connected! Press 'q' to quit.")
    
    frame_count = 0
    # Process every nth frame to prevent lag if CPU is slow
    process_every_n_frames = 3 
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame. Stream might have ended or disconnected.")
            break
            
        frame_count += 1
        
        # Only run detection every few frames for smoother playback
        if frame_count % process_every_n_frames == 0:
            # Detect objects and draw bounding boxes
            annotated_frame, detections = detector.detect_with_visualization(frame)
            
            # Check for alerts (e.g., person detected)
            persons = [d for d in detections if d["class_name"].lower() == "person"]
            
            if persons:
                alert_text = f"ALERT: {len(persons)} Person(s) Detected!"
                print(alert_text)
                
                # Draw a prominent alert message on the frame
                cv2.putText(
                    annotated_frame, 
                    alert_text, 
                    (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    1, 
                    (0, 0, 255),  # Red color
                    3
                )
                
                # Add a red border around the frame to indicate alert
                cv2.rectangle(annotated_frame, (0, 0), (annotated_frame.shape[1]-1, annotated_frame.shape[0]-1), (0, 0, 255), 10)
        else:
            # On frames we don't process, just use the raw frame
            annotated_frame = frame
            
        # Display the result
        cv2.imshow('VigilAI - Wowza Alert Test', annotated_frame)
        
        # Press 'q' to exit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    # Clean up
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
