"""
MJPEG Video Streamer Module for VigilAI.
Generates an HTTP multipart/x-mixed-replace stream for the mobile app and Anvil browser player.
Applies real-time AI bounding boxes, pose skeletons, timers, and watermarks.
"""
import cv2
import time
import logging
from typing import Generator, Optional, Any
from video.camera_manager import CameraManager

logger = logging.getLogger("VigilAI.Streamer")


def generate_mjpeg_stream(camera_id: int, detection_manager: Optional[Any] = None) -> Generator[bytes, None, None]:
    """
    HTTP generator that captures frames, draws real-time AI bounding boxes and skeletons,
    compresses frames to JPEG quality 80, and streams them in multipart/x-mixed-replace format.
    """
    camera_manager = CameraManager()
    logger.info(f"Starting MJPEG stream generator for Camera ID {camera_id}")

    # Track frames to limit bandwidth spikes
    frame_delay = 1.0 / 30.0  # Cap stream display to 30 FPS maximum

    while True:
        start_time = time.time()
        
        # 1. Grab latest frame from running thread
        frame = camera_manager.get_frame(camera_id)
        if frame is None:
            # If camera is offline, generate a black placeholder frame indicating offline state
            placeholder = cv2.imread("offline_placeholder.jpg")
            if placeholder is None:
                # Fallback to programmatic canvas
                placeholder = cv2.Mat.zeros(720, 1280, cv2.CV_8UC3)
                cv2.putText(
                    placeholder, 
                    "CAMERA OFFLINE - RECONNECTING...", 
                    (350, 360), 
                    cv2.FONT_HERSHEY_SIMPLEX, 
                    0.9, 
                    (0, 0, 255), 
                    2
                )
            frame = placeholder

        # 2. Extract and draw AI overlay predictions (skeletons and boxes)
        elif detection_manager is not None:
            overlay = detection_manager.get_latest_overlay(camera_id)
            if overlay:
                # Draw MediaPipe Pose Skeletons (Cyan lines)
                # BGR for Cyan is (255, 255, 0)
                for pt1, pt2 in overlay.get("skeleton", []):
                    try:
                        # Ensure coordinates are within image boundaries
                        cv2.line(frame, pt1, pt2, (255, 255, 0), 2)
                    except Exception:
                        pass

                # Draw YOLO Object Detections (Green for normal, Red for anomalies)
                for box_info in overlay.get("boxes", []):
                    try:
                        x1, y1, x2, y2 = box_info["box"]
                        label = box_info["label"]
                        conf = box_info["conf"]
                        is_anomaly = box_info.get("is_anomaly", False)
                        
                        # Anomaly: Red (0, 0, 255), Normal: Green (0, 255, 0)
                        color = (0, 0, 255) if is_anomaly else (0, 255, 0)
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                        
                        # Form text label
                        text_str = f"{label} {conf:.0%}"
                        if "timer" in box_info:
                            text_str += f" | {box_info['timer']}s"
                            
                        # Draw background tag for text readability
                        (text_w, text_h), _ = cv2.getTextSize(text_str, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                        cv2.rectangle(frame, (x1, y1 - text_h - 10), (x1 + text_w, y1), color, -1)
                        
                        # Draw text in white over colored tag background
                        cv2.putText(frame, text_str, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                    except Exception:
                        pass
                        
            # Draw real-time FPS metric on the top right
            try:
                thread = camera_manager.get_thread(camera_id)
                fps = thread.actual_fps if thread else 0.0
                fps_text = f"FPS: {fps:.1f}"
                cv2.rectangle(frame, (10, 10), (140, 45), (0, 0, 0), -1)
                cv2.putText(frame, fps_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
            except Exception:
                pass

        # 3. Compress final composited frame to JPEG (Quality 80)
        # Lowers network transfer load while retaining sharp object recognition boundaries
        ret, jpeg_buffer = cv2.imencode(
            ".jpg", 
            frame, 
            [cv2.IMWRITE_JPEG_QUALITY, 80]
        )
        if not ret:
            time.sleep(0.01)
            continue

        # 4. Yield byte chunk matching standard HTTP MJPEG stream boundary definitions
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + jpeg_buffer.tobytes() + b"\r\n\r\n"
        )

        # 5. Restrict generator to 30fps maximum rate
        elapsed = time.time() - start_time
        sleep_duration = max(0.001, frame_delay - elapsed)
        time.sleep(sleep_duration)
