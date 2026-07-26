"""
Detection Manager Module for VigilAI.
Orchestrates Fall, Weapon, Fight, and Loitering detectors on a background thread.
Restricts frame consumption to a maximum of 15 FPS to prevent CPU/GPU bottlenecks.
Maintains live graphical overlay states and queues events to the alert dispatcher.
"""
import time
import queue
import logging
import threading
from typing import Dict, List, Tuple, Optional, Any
from app.database import SessionLocal
from app.crud import get_camera
from app.video.camera_manager import CameraManager
from app.detection.fall_detector import FallDetector
from app.detection.weapon_detector import WeaponDetector
from app.detection.fight_detector import FightDetector
from app.detection.loiter_detector import LoiterDetector
from app.detection.posture_detector import PostureDetector
from app.detection.run_detector import RunDetector

logger = logging.getLogger("VigilAI.DetectionManager")


class DetectionManager(threading.Thread):
    """
    Continuous worker thread that cycles through active camera streams,
    runs the full computer vision suite, caches visual overlays, and
    enqueues triggered anomalies to the alert system.
    """
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self, alert_queue: Optional[queue.Queue] = None):
        if self.initialized:
            return
        super().__init__()
        self.daemon = True
        self.alert_queue = alert_queue or queue.Queue()
        self.camera_manager = CameraManager()
        
        # Initialize Individual Detectors
        self.fall_detector = FallDetector()
        self.weapon_detector = WeaponDetector()
        self.fight_detector = FightDetector()
        self.loiter_detector = LoiterDetector()
        self.posture_detector = PostureDetector()
        self.run_detector = RunDetector()
        
        # Operational states
        self.is_running = False
        self.latest_overlays: Dict[int, Dict[str, Any]] = {}
        self.overlay_locks: Dict[int, threading.Lock] = {}
        
        # Keep track of active alarms to prevent duplicate spam queueing
        # e.g., {camera_id: {anomaly_type: last_trigger_timestamp}}
        self.active_alarms: Dict[int, Dict[str, float]] = {}
        self.alarm_cool_down = 60.0  # Prevent queueing same alarm for 60s (Fast2SMS rate limit buffer)

        
        self.initialized = True

    def _get_overlay_lock(self, camera_id: int) -> threading.Lock:
        """
        Thread-safe access locks for overlays.
        """
        if camera_id not in self.overlay_locks:
            self.overlay_locks[camera_id] = threading.Lock()
        return self.overlay_locks[camera_id]

    def get_latest_overlay(self, camera_id: int) -> Optional[Dict[str, Any]]:
        """
        Streamer-facing method to fetch active bounding boxes and skeleton lines.
        """
        lock = self._get_overlay_lock(camera_id)
        with lock:
            return self.latest_overlays.get(camera_id)

    def _update_overlay(self, camera_id: int, boxes: List[Dict[str, Any]], skeleton: List[Tuple[Tuple[int, int], Tuple[int, int]]]):
        """
        Updates thread-safe local drawing caches.
        """
        lock = self._get_overlay_lock(camera_id)
        with lock:
            self.latest_overlays[camera_id] = {
                "boxes": boxes,
                "skeleton": skeleton,
                "updated_at": time.time()
            }

    def run(self):
        """
        Throttled frame evaluation loop executing all AI detectors.
        """
        self.is_running = True
        logger.info("VigilAI AI Detection Manager pipeline started.")
        
        frame_interval = 1.0 / 15.0  # Throttle to process max 15 FPS
        
        while self.is_running:
            loop_start = time.time()
            
            # Fetch currently monitored cameras
            active_cameras = list(self.camera_manager.active_threads.keys())
            
            for cid in active_cameras:
                try:
                    # 1. Grab frame from connection stream
                    frame = self.camera_manager.get_frame(cid)
                    if frame is None:
                        continue

                    # Overlays collection to assemble
                    frame_boxes: List[Dict[str, Any]] = []
                    frame_skeleton: List[Tuple[Tuple[int, int], Tuple[int, int]]] = []
                    
                    # 2. RUN FALL DETECTION (MediaPipe Pose)
                    is_fall, fall_conf, skeleton, f_boxes = self.fall_detector.process_frame(cid, frame)
                    frame_skeleton.extend(skeleton)
                    frame_boxes.extend(f_boxes)

                    # 3. RUN WEAPON DETECTION (YOLOv8)
                    # This will automatically skip inference on 2 out of 3 frames to limit processing loads
                    is_weapon, weapon_conf, w_boxes = self.weapon_detector.process_frame(cid, frame)
                    if w_boxes:
                        frame_boxes.extend(w_boxes)
                    
                    # Extract person boxes from YOLO detections to reuse for Fight and Loitering
                    # Avoiding double execution of YOLO is a key optimization
                    person_boxes = [b for b in frame_boxes if b["label"] == "PERSON"]

                    # 4. RUN FIGHT / VIOLENCE DETECTION
                    # Reuses person detections and computes dense optical flow
                    is_fight, fight_conf, fight_boxes = self.fight_detector.process_frame(cid, frame, person_boxes)
                    if fight_boxes:
                        # Override standard person boxes with highlighted fight warning labels
                        frame_boxes = [b for b in frame_boxes if b["label"] != "PERSON"]
                        frame_boxes.extend(fight_boxes)

                    # 5. RUN LOITERING DETECTION
                    # Tracks centroids and triggers after 30 seconds threshold
                    is_loiter, loiter_dwell, loiter_boxes = self.loiter_detector.process_frame(cid, person_boxes)
                    if loiter_boxes:
                        # Replace standard person boxes with timer-badge boxes
                        frame_boxes = [b for b in frame_boxes if b["label"] != "PERSON"]
                        frame_boxes.extend(loiter_boxes)

                    # 6. RUN POSTURE DETECTION
                    is_posture, posture_conf, posture_boxes = self.posture_detector.process_frame(cid, frame, person_boxes)
                    if posture_boxes:
                        frame_boxes = [b for b in frame_boxes if b["label"] != "PERSON"]
                        frame_boxes.extend(posture_boxes)

                    # 7. RUN RUNNING DETECTION
                    is_run, run_conf, run_boxes = self.run_detector.process_frame(cid, person_boxes)
                    if run_boxes:
                        frame_boxes = [b for b in frame_boxes if b["label"] != "PERSON"]
                        frame_boxes.extend(run_boxes)

                    # Update visualization cache
                    self._update_overlay(cid, frame_boxes, frame_skeleton)

                    # ENQUEUE TRIGGERED ANOMALIES
                    # Check conditions and push anomalies to AlertCoordinator via Queue
                    self._evaluate_alerts(cid, frame, is_fall, fall_conf, is_weapon, weapon_conf, is_fight, fight_conf, is_loiter, loiter_dwell, is_posture, posture_conf, is_run, run_conf)

                except Exception as e:
                    logger.error(f"[DetectionManager] Pipeline error on Camera {cid}: {e}", exc_info=True)

            # Limit thread loop to 15Hz frequency
            elapsed = time.time() - loop_start
            sleep_duration = max(0.001, frame_interval - elapsed)
            time.sleep(sleep_duration)

        logger.info("VigilAI AI Detection Manager pipeline stopped.")

    def _evaluate_alerts(
        self, 
        camera_id: int, 
        frame, 
        is_fall: bool, 
        fall_conf: float, 
        is_weapon: bool, 
        weapon_conf: float, 
        is_fight: bool, 
        fight_conf: float, 
        is_loiter: bool, 
        loiter_dwell: float,
        is_posture: bool,
        posture_conf: float,
        is_run: bool,
        run_conf: float
    ):
        """
        Helper method to apply alarm rate-limiting cool-downs and push verified threats to queue.
        """
        now = time.time()
        if camera_id not in self.active_alarms:
            self.active_alarms[camera_id] = {}

        triggers = [
            ("FALL", is_fall, fall_conf),
            ("WEAPON", is_weapon, weapon_conf),
            ("FIGHT", is_fight, fight_conf),
            ("LOITERING", is_loiter, 0.8),  # Default loitering confidence metric
            ("POSTURE", is_posture, posture_conf),
            ("RUNNING", is_run, run_conf)
        ]

        for anomaly_type, is_triggered, confidence in triggers:
            if is_triggered:
                last_trigger = self.active_alarms[camera_id].get(anomaly_type, 0.0)
                # Ensure cool-down elapsed (prevent spamming alerts continuously)
                if now - last_trigger >= self.alarm_cool_down:
                    self.active_alarms[camera_id][anomaly_type] = now
                    
                    # Package anomaly event
                    event_data = {
                        "camera_id": camera_id,
                        "anomaly_type": anomaly_type,
                        "confidence": confidence,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "raw_frame": frame.copy()  # Send the exact trigger frame for blurring snapshot!
                    }
                    
                    # Push to AlertCoordinator queue
                    self.alert_queue.put(event_data)
                    logger.info(f"[DetectionManager Cam {camera_id}] Enqueued anomaly {anomaly_type} (conf={confidence:.2%}) to alert worker.")

    def stop_pipeline(self):
        """
        Gracefully stop processing.
        """
        self.is_running = False
