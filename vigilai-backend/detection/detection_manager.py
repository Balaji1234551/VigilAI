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
from database.db import SessionLocal
from database.crud import get_camera
from video.camera_manager import CameraManager
from detection.fall_detector import FallDetector
from detection.weapon_detector import WeaponDetector
from detection.fight_detector import FightDetector
from detection.loiter_detector import LoiterDetector
from detection.intrusion_detector import IntrusionDetector
from detection.abandoned_object_detector import AbandonedObjectDetector
from detection.running_detector import RunningDetector
from detection.crowd_detector import CrowdDetector
from detection.fire_detector import FireDetector
from detection.face_detector import FaceDetector

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
        
        self.intrusion_detector = IntrusionDetector()
        self.abandoned_obj_detector = AbandonedObjectDetector()
        self.running_detector = RunningDetector()
        self.crowd_detector = CrowdDetector()
        self.fire_detector = FireDetector()
        self.face_detector = FaceDetector()
        
        # Operational states
        self.is_running = False
        self.latest_overlays: Dict[int, Dict[str, Any]] = {}
        self.overlay_locks: Dict[int, threading.Lock] = {}
        
        # Keep track of active alarms to prevent duplicate spam queueing
        # e.g., {camera_id: {anomaly_type: last_trigger_timestamp}}
        self.active_alarms: Dict[int, Dict[str, float]] = {}
        self.alarm_cool_down = 30.0  # Prevent queueing same alarm for 30s
        
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
                    person_boxes = [b for b in frame_boxes if b["label"] == "PERSON" or b["label"] == "FALLING"]
                    luggage_boxes = [b for b in frame_boxes if b["label"] == "LUGGAGE"]

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

                    # 6. RUN NEW DETECTORS
                    is_intrusion, int_conf, int_boxes = self.intrusion_detector.process_frame(cid, person_boxes, frame.shape)
                    if int_boxes: frame_boxes.extend(int_boxes)
                    
                    is_abandoned, ab_conf, ab_boxes = self.abandoned_obj_detector.process_frame(cid, luggage_boxes, person_boxes)
                    if ab_boxes: frame_boxes.extend(ab_boxes)
                    
                    is_running, run_conf, run_boxes = self.running_detector.process_frame(cid, frame)
                    if run_boxes: frame_boxes.extend(run_boxes)
                    
                    is_crowd, cr_conf, cr_boxes = self.crowd_detector.process_frame(cid, person_boxes)
                    if cr_boxes: frame_boxes.extend(cr_boxes)
                    
                    is_fire, f_conf, f_boxes_arr = self.fire_detector.process_frame(cid, frame)
                    if f_boxes_arr: frame_boxes.extend(f_boxes_arr)
                    
                    is_face, face_conf, face_boxes = self.face_detector.process_frame(cid, frame)
                    if face_boxes: frame_boxes.extend(face_boxes)

                    # Update visualization cache
                    self._update_overlay(cid, frame_boxes, frame_skeleton)

                    # 7. ENQUEUE TRIGGERED ANOMALIES
                    # Check conditions and push anomalies to AlertCoordinator via Queue
                    self._evaluate_alerts(cid, frame, 
                                          is_fall, fall_conf, is_weapon, weapon_conf, 
                                          is_fight, fight_conf, is_loiter, loiter_dwell,
                                          is_intrusion, int_conf, is_abandoned, ab_conf,
                                          is_running, run_conf, is_crowd, cr_conf,
                                          is_fire, f_conf, is_face, face_conf)

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
        is_fall: bool, fall_conf: float, 
        is_weapon: bool, weapon_conf: float, 
        is_fight: bool, fight_conf: float, 
        is_loiter: bool, loiter_dwell: float,
        is_intrusion: bool, int_conf: float,
        is_abandoned: bool, ab_conf: float,
        is_running: bool, run_conf: float,
        is_crowd: bool, cr_conf: float,
        is_fire: bool, f_conf: float,
        is_face: bool, face_conf: float
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
            ("INTRUSION", is_intrusion, int_conf),
            ("ABANDONED_OBJECT", is_abandoned, ab_conf),
            ("RUNNING", is_running, run_conf),
            ("CROWD", is_crowd, cr_conf),
            ("FIRE", is_fire, f_conf),
            ("UNKNOWN_PERSON", is_face, face_conf)
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
