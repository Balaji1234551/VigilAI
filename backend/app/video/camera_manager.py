"""
Threaded Camera Capture Connection and Streams Manager for VigilAI.
Handles continuous feed extraction, thread-safe buffering, automated camera reconnection,
and live FPS watermark rendering for both local webcams and network IP cameras.
"""
import threading
import time
import cv2
import logging
from collections import deque
from typing import Dict, Optional, Union, Tuple

# Setup Logger
logger = logging.getLogger("VigilAI.CameraManager")
logging.basicConfig(level=logging.INFO)


class CameraConnectionThread(threading.Thread):
    """
    Independent thread responsible for reading frames from a single camera source,
    measuring frame rate, managing a circular buffer of recent frames, and auto-reconnecting.
    """
    def __init__(
        self, 
        camera_id: int, 
        name: str, 
        url: str, 
        target_fps: int = 30, 
        width: int = 1280, 
        height: int = 720
    ):
        super().__init__()
        self.camera_id = camera_id
        self.name = name
        self.url = url
        self.target_fps = target_fps
        self.width = width
        self.height = height
        self.daemon = True
        
        # Operational State Flags
        self.is_running = False
        self.is_connected = False
        
        # Thread-safe Frame Buffers
        self.latest_frame = None
        self.frame_lock = threading.Lock()
        
        # Circular frame buffer for T-10 second clip extraction (300 frames max @ 30fps)
        self.frame_buffer = deque(maxlen=300)
        self.buffer_lock = threading.Lock()
        
        # FPS Tracker Variables
        self.actual_fps = 0.0
        self.frame_count = 0
        self.last_fps_calc_time = time.time()

    def parse_source(self, url_str: str) -> Union[int, str]:
        """
        Differentiates between USB webcam integer index and RTSP stream URL string.
        """
        try:
            # If "0", "1" etc., convert to integer for local USB webcam
            return int(url_str)
        except ValueError:
            # Return original string for IP, RTSP, or video file path
            return url_str

    def _update_db_status(self, status: str):
        """Helper to synchronously update the camera status in the DB and broadcast via WebSockets."""
        try:
            from app.database import SessionLocal
            from app.models.schemas import Camera
            db = SessionLocal()
            status_changed = False
            try:
                cam = db.query(Camera).filter(Camera.id == self.camera_id).first()
                if cam and cam.status != status:
                    cam.status = status
                    db.commit()
                    status_changed = True
            finally:
                db.close()
                
            if status_changed:
                try:
                    import asyncio
                    from app.api.endpoints.websockets import manager
                    ws_payload = {
                        "type": "CAMERA_STATUS_CHANGED",
                        "camera_id": self.camera_id,
                        "status": status
                    }
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    loop.run_until_complete(manager.broadcast(ws_payload))
                    loop.close()
                except Exception as ws_err:
                    logger.error(f"Failed to broadcast WebSocket status for camera {self.camera_id}: {ws_err}")
                    
        except Exception as e:
            logger.error(f"Failed to update DB status for camera {self.camera_id}: {e}")

    def run(self):
        """
        Continually fetches frames, maintains the buffer, overlays watermarks, and auto-reconnects.
        """
        self.is_running = True
        logger.info(f"[{self.name}] Camera thread started for source: '{self.url}'")
        
        source = self.parse_source(self.url)
        cap = None
        
        while self.is_running:
            if cap is None or not cap.isOpened():
                self.is_connected = False
                logger.info(f"[{self.name}] Connecting to stream source...")
                
                # Ensure low latency by using the FFMPEG backend explicitly for URLs if applicable
                if isinstance(source, str) and (source.startswith("http") or source.startswith("rtsp")):
                    cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
                else:
                    cap = cv2.VideoCapture(source)
                    
                if cap.isOpened():
                    # Set custom resolution
                    cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                    # Attempt to set target FPS
                    cap.set(cv2.CAP_PROP_FPS, self.target_fps)
                    # CRITICAL: Minimize buffer size to eliminate stream lag/delay
                    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                    
                    self.is_connected = True
                    self._update_db_status("online")
                    logger.info(f"[{self.name}] Connected successfully with minimized buffer!")
                else:
                    logger.warning(f"[{self.name}] Connection failed. Retrying in 5 seconds...")
                    self._update_db_status("offline")
                    time.sleep(5)
                    continue

            # Read frame from stream
            ret, frame = cap.read()
            if not ret or frame is None:
                logger.warning(f"[{self.name}] Failed to capture frame or disconnected. Reconnecting...")
                self._update_db_status("offline")
                cap.release()
                cap = None
                time.sleep(1)
                continue

            # Ensure frame matches standard target size
            if frame.shape[1] != self.width or frame.shape[0] != self.height:
                frame = cv2.resize(frame, (self.width, self.height))

            # Dynamic FPS Calculation
            self.frame_count += 1
            now = time.time()
            elapsed = now - self.last_fps_calc_time
            if elapsed >= 1.0:
                self.actual_fps = self.frame_count / elapsed
                self.frame_count = 0
                self.last_fps_calc_time = now

            # Process timestamp and FPS Watermarks
            display_frame = frame.copy()
            timestamp_str = datetime_str = time.strftime("%Y-%m-%d %H:%M:%S")
            fps_str = f"FPS: {self.actual_fps:.1f}"
            
            # Draw overlay watermarks
            cv2.putText(display_frame, f"VigilAI - {self.name}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            cv2.putText(display_frame, f"Time: {timestamp_str}", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(display_frame, fps_str, (self.width - 150, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            # Store latest modified frame and append to rolling circular buffer
            with self.frame_lock:
                self.latest_frame = display_frame

            with self.buffer_lock:
                # Store tuple of (timestamp, raw_frame)
                self.frame_buffer.append((time.time(), frame.copy()))

            # Local Window display for testing (if desktop GUI is active)
            # Safe catch to avoid background failures in headless environments
            try:
                # Set a local flag or environment to display windows locally if needed
                pass
            except Exception:
                pass

            # Maintain correct frame rate processing intervals
            time.sleep(1.0 / self.target_fps)

        if cap is not None:
            cap.release()
        self._update_db_status("offline")
        logger.info(f"[{self.name}] Camera thread stopped.")

    def get_latest_frame(self) -> Optional[cv2.Mat]:
        """
        Thread-safe getter for the latest frame.
        """
        with self.frame_lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def get_buffer_frames(self) -> list:
        """
        Thread-safe grab of all rolling frames currently saved in the 10s buffer.
        """
        with self.buffer_lock:
            return list(self.frame_buffer)

    def stop(self):
        """
        Gracefully terminate the capture loop.
        """
        self.is_running = False


class CameraManager:
    """
    Singleton Camera Stream manager that tracks and runs capture threads for all cameras.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.active_threads = {}
        return cls._instance

    def start_camera(self, camera_id: int, name: str, url: str) -> bool:
        """
        Spins up a connection thread for a camera if not already active.
        """
        if camera_id in self.active_threads:
            logger.info(f"Camera ID {camera_id} is already running.")
            return True

        thread = CameraConnectionThread(camera_id=camera_id, name=name, url=url)
        self.active_threads[camera_id] = thread
        thread.start()
        return True

    def stop_camera(self, camera_id: int) -> bool:
        """
        Stops the thread for a given camera.
        """
        thread = self.active_threads.get(camera_id)
        if thread:
            thread.stop()
            thread.join(timeout=2.0)
            del self.active_threads[camera_id]
            logger.info(f"Stopped camera stream {camera_id}")
            return True
        return False

    def get_frame(self, camera_id: int) -> Optional[cv2.Mat]:
        """
        Fetches the latest frame from the running thread of a camera.
        """
        thread = self.active_threads.get(camera_id)
        if thread:
            return thread.get_latest_frame()
        return None

    def get_thread(self, camera_id: int) -> Optional[CameraConnectionThread]:
        """
        Get the thread object for a camera.
        """
        return self.active_threads.get(camera_id)

    def shutdown_all(self):
        """
        Closes down all active capture channels on exit.
        """
        camera_ids = list(self.active_threads.keys())
        for cid in camera_ids:
            self.stop_camera(cid)
        logger.info("All camera capture threads stopped successfully.")
