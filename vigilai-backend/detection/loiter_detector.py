"""
Loitering Detection Module for VigilAI.
Tracks individual centroids across consecutive frames using greedy Euclidean matching.
Triggers alert when a tracked person dwells within a 100px radius for over 30 seconds.
Returns precise dwell-timer metadata to render timer badges on bounding boxes.
"""
import time
import math
import logging
from typing import Dict, List, Tuple, Optional, Any
from config import LOITER_RADIUS_THRESHOLD, LOITER_TIME_THRESHOLD

logger = logging.getLogger("VigilAI.LoiterDetector")


class LoiterDetector:
    """
    Tracks human detections over time using an inline Euclidean distance tracker.
    Triggers alarms when a subject's displacement remains bounded in a local zone for an extended period.
    """
    def __init__(self):
        # Tracker states per camera: {camera_id: {tracked_persons}}
        # tracked_persons format: {person_id: {
        #    "centroid": (cx, cy),
        #    "initial_centroid": (cx, cy),
        #    "first_seen": timestamp,
        #    "last_seen": timestamp,
        #    "disappeared_frames": 0,
        #    "is_alert_triggered": False
        # }}
        self.camera_tracks: Dict[int, Dict[int, Dict[str, Any]]] = {}
        
        # Incremental ID counter per camera to assign unique IDs to subjects
        self.next_person_ids: Dict[int, int] = {}
        
        # Max frames a person can go missing (e.g. due to occlusion) before deleting track
        self.max_disappeared_frames = 15

    def _get_or_create_state(self, camera_id: int) -> Tuple[Dict[int, Dict[str, Any]], int]:
        """
        Initializes tracker tables for a new camera stream.
        """
        if camera_id not in self.camera_tracks:
            self.camera_tracks[camera_id] = {}
            self.next_person_ids[camera_id] = 0
        return self.camera_tracks[camera_id], self.next_person_ids[camera_id]

    def process_frame(
        self, 
        camera_id: int, 
        person_boxes: List[Dict[str, Any]], 
        user_threshold_seconds: int = LOITER_TIME_THRESHOLD
    ) -> Tuple[bool, float, List[Dict[str, Any]]]:
        """
        Updates trackers with current person bounding boxes and evaluates dwelling times.
        Returns:
            is_loiter_alert (bool): True if any tracked person exceeds loitering timer.
            max_dwell_time (float): The longest dwell duration in seconds among active loiterers.
            labeled_boxes (List): Person bounding boxes updated with timer badges.
        """
        tracks, next_id = self._get_or_create_state(camera_id)
        now = time.time()
        
        # Compute centroids of current incoming detections
        current_detections: List[Tuple[Tuple[int, int], Tuple[int, int, int, int]]] = []
        for p in person_boxes:
            x1, y1, x2, y2 = p["box"]
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            current_detections.append(((cx, cy), (x1, y1, x2, y2)))

        # 1. Update existing tracks
        if not tracks:
            # First frame or all tracks cleared: register all incoming detections
            for centroid, box in current_detections:
                tracks[next_id] = {
                    "centroid": centroid,
                    "initial_centroid": centroid,
                    "first_seen": now,
                    "last_seen": now,
                    "disappeared_frames": 0,
                    "is_alert_triggered": False,
                    "box": box
                }
                next_id += 1
            self.next_person_ids[camera_id] = next_id
        else:
            # Track association using simple greedy Euclidean matching
            track_ids = list(tracks.keys())
            track_centroids = [tracks[tid]["centroid"] for tid in track_ids]
            
            used_detections = set()
            used_tracks = set()

            # For each active track, find the closest current detection
            for t_idx, tid in enumerate(track_ids):
                tx, ty = track_centroids[t_idx]
                min_dist = float("inf")
                match_d_idx = -1
                
                for d_idx, (d_centroid, _) in enumerate(current_detections):
                    if d_idx in used_detections:
                        continue
                    dx, dy = d_centroid
                    dist = math.sqrt((tx - dx)**2 + (ty - dy)**2)
                    
                    if dist < min_dist:
                        min_dist = dist
                        match_d_idx = d_idx
                
                # Match gating (must be within 120 pixels to be associated with same person track)
                if match_d_idx != -1 and min_dist < 120:
                    matched_centroid, matched_box = current_detections[match_d_idx]
                    
                    # Update track metrics
                    tracks[tid]["centroid"] = matched_centroid
                    tracks[tid]["box"] = matched_box
                    tracks[tid]["last_seen"] = now
                    tracks[tid]["disappeared_frames"] = 0
                    
                    # Evaluate displacement relative to INITIAL registration coordinate
                    init_x, init_y = tracks[tid]["initial_centroid"]
                    curr_x, curr_y = matched_centroid
                    drift_dist = math.sqrt((init_x - curr_x)**2 + (init_y - curr_y)**2)
                    
                    # If they move out of the 100px radius, they are walking, reset their loiter timer
                    if drift_dist > LOITER_RADIUS_THRESHOLD:
                        tracks[tid]["initial_centroid"] = matched_centroid
                        tracks[tid]["first_seen"] = now  # Reset dwell timer
                        tracks[tid]["is_alert_triggered"] = False
                        logger.info(f"[LoiterDetector Cam {camera_id}] Track {tid} moved outside loiter radius. Resetting timer.")

                    used_detections.add(match_d_idx)
                    used_tracks.add(tid)

            # Mark unmatched tracks as disappeared
            for tid in track_ids:
                if tid not in used_tracks:
                    tracks[tid]["disappeared_frames"] += 1
                    # Clear expired tracks
                    if tracks[tid]["disappeared_frames"] > self.max_disappeared_frames:
                        del tracks[tid]
                        logger.info(f"[LoiterDetector Cam {camera_id}] Cleaned up lost track ID {tid}")

            # Register unmatched current detections as new tracks
            for d_idx, (centroid, box) in enumerate(current_detections):
                if d_idx not in used_detections:
                    tracks[next_id] = {
                        "centroid": centroid,
                        "initial_centroid": centroid,
                        "first_seen": now,
                        "last_seen": now,
                        "disappeared_frames": 0,
                        "is_alert_triggered": False,
                        "box": box
                    }
                    logger.info(f"[LoiterDetector Cam {camera_id}] Registered new track ID {next_id}")
                    next_id += 1
            self.next_person_ids[camera_id] = next_id

        # 2. Evaluate dwell durations and construct output bounding boxes
        is_loiter_alert_triggered = False
        max_dwell = 0.0
        labeled_boxes: List[Dict[str, Any]] = []

        for tid, track in list(tracks.items()):
            # Disappeared tracks are excluded from visual rendering
            if track["disappeared_frames"] > 0:
                continue

            # Dwell duration calculation
            dwell_time = now - track["first_seen"]
            max_dwell = max(max_dwell, dwell_time)
            
            is_loitering = dwell_time >= user_threshold_seconds
            
            # Format custom label containing the timer countdown
            box_label = f"PERSON | ID:{tid}"
            
            if is_loitering:
                box_label = f"⚠️ LOITERING | ID:{tid}"
                is_loiter_alert_triggered = True
                
                if not track["is_alert_triggered"]:
                    track["is_alert_triggered"] = True
                    logger.warning(
                        f"[LoiterDetector Cam {camera_id}] ⚠️ Track ID {tid} is LOITERING! Dwell Time: {dwell_time:.1f}s"
                    )

            # Push structured box metadata to display in streamer
            labeled_boxes.append({
                "box": track["box"],
                "label": box_label,
                "conf": 0.8,  # Arbitrary human visibility confidence
                "timer": int(dwell_time),
                "is_anomaly": is_loitering
            })

        return is_loiter_alert_triggered, max_dwell, labeled_boxes
