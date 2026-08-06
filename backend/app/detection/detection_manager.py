import time
import queue
import logging
import cv2
import os
import numpy as np
from typing import Dict, List, Any
from app.database import SessionLocal
from app.crud import get_camera
from app.detection.model_loader import AIModelLoader
from app.detection.fight_detector import FightDetector
import json

# Global progress tracker for frontend polling
PROCESSING_PROGRESS = {}

logger = logging.getLogger("VigilAI.DetectionManager")
os.makedirs("uploads/snapshots", exist_ok=True)

class DetectionManager:
    def __init__(self, alert_queue=None):
        self.alert_queue = alert_queue or queue.Queue()
        self.active_alarms = {}
        self.alarm_cool_down = 10.0
        self.models = AIModelLoader()
        self.fight_detector = FightDetector()
        
        # Track stats for the current video
        self.current_stats = {
            "start_time": 0,
            "confidences": [],
            "object_counts": {},
            "total_frames": 0,
            "total_detections": 0
        }

    def _nms(self, boxes: List[Dict], iou_threshold=0.3) -> List[Dict]:
        if len(boxes) == 0: return []
        b = np.array([box["box"] for box in boxes])
        x1 = b[:, 0]
        y1 = b[:, 1]
        x2 = b[:, 0] + b[:, 2]
        y2 = b[:, 1] + b[:, 3]
        scores = np.array([box["confidence"] for box in boxes])
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]
        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            w = np.maximum(0.0, xx2 - xx1)
            h = np.maximum(0.0, yy2 - yy1)
            inter = w * h
            iou = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(iou <= iou_threshold)[0]
            order = order[inds + 1]
        return [boxes[i] for i in keep]

    def process_single_frame(self, cid: int, frame) -> Dict[str, Any]:
        frame_boxes = []
        
        # Weapon
        res_weapon = self.models.get_weapon_model()(frame, verbose=False)[0]
        for box in res_weapon.boxes:
            conf = float(box.conf[0])
            if conf < 0.3: continue
            label = res_weapon.names[int(box.cls[0])].upper()
            if 'KNIFE' in label or 'GUN' in label or 'WEAPON' in label: label = 'WEAPON'
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            frame_boxes.append({"label": label, "confidence": conf, "box": [x1, y1, x2-x1, y2-y1]})

        # Fire/Smoke
        res_fire = self.models.get_fire_model()(frame, verbose=False)[0]
        for box in res_fire.boxes:
            conf = float(box.conf[0])
            if conf < 0.3: continue
            label = res_fire.names[int(box.cls[0])].upper()
            if 'FIRE' in label: label = 'FIRE'
            if 'SMOKE' in label: label = 'SMOKE'
            if label in ['FIRE', 'SMOKE']:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                frame_boxes.append({"label": label, "confidence": conf, "box": [x1, y1, x2-x1, y2-y1]})

        # Person/Crowd
        person_count = 0
        if self.models.get_person_model():
            res_person = self.models.get_person_model()(frame, verbose=False)[0]
            for box in res_person.boxes:
                conf = float(box.conf[0])
                label = res_person.names[int(box.cls[0])].upper()
                if label == 'PERSON' and conf > 0.4:
                    person_count += 1
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    frame_boxes.append({"label": "PERSON", "confidence": conf, "box": [x1, y1, x2-x1, y2-y1]})
        
        if person_count >= 5:
            frame_boxes.append({"label": "CROWD", "confidence": 0.99, "box": [0,0,0,0]})

        # Pose
        pose_detector = self.models.get_pose_detector()
        if pose_detector:
            pose_results = pose_detector(frame, verbose=False)
            if pose_results and pose_results[0].keypoints and pose_results[0].keypoints.data.shape[1] > 0:
                kpts_tensor = pose_results[0].keypoints.data
                for p_idx in range(kpts_tensor.shape[0]):
                    kpts = kpts_tensor[p_idx]
                    # COCO Keypoints: 0=Nose, 15=LAnkle, 16=RAnkle
                    nose = kpts[0]
                    l_ankle = kpts[15]
                    r_ankle = kpts[16]
                    
                    if nose[2] > 0.4 and l_ankle[2] > 0.4 and r_ankle[2] > 0.4:
                        avg_ankle_y = (l_ankle[1] + r_ankle[1]) / 2.0
                        if nose[1] > avg_ankle_y:
                            frame_boxes.append({"label": "FALL", "confidence": 0.85, "box": [0,0,0,0]})
                            break

        # Violence / Fight Detection
        person_boxes_only = [b for b in frame_boxes if b["label"] == "PERSON"]
        is_fight, fight_conf, fight_alert_boxes = self.fight_detector.process_frame(
            cid, self.models.get_pose_detector(), frame, person_boxes_only
        )
        if is_fight:
            for fb in fight_alert_boxes:
                frame_boxes.append(fb)

        final_boxes = self._nms(frame_boxes)
        
        # Track Stats
        for box in final_boxes:
            lbl = box["label"]
            if lbl == "PERSON":
                continue
            self.current_stats["confidences"].append(box["confidence"])
            self.current_stats["object_counts"][lbl] = self.current_stats["object_counts"].get(lbl, 0) + 1
            self.current_stats["total_detections"] += 1
            
        return {"boxes": final_boxes, "status": "success"}

    def _draw_boxes_on_frame(self, frame, boxes, frame_idx=0):
        for box in boxes:
            x, y, w, h = box["box"]
            if w == 0 and h == 0: continue
            label = box["label"]
            conf = box.get("confidence", 0.0)
            color = (0, 255, 0) if label in ["PERSON", "FACE"] else (0, 0, 255)
            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)
            cv2.putText(frame, f"{label} {conf:.2f}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            # Draw extra metadata on bottom left
            timestamp_str = time.strftime("%Y-%m-%d %H:%M:%S")
            cv2.putText(frame, f"Frame: {frame_idx} | {timestamp_str}", (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255,255,255), 1)

            global_alerts = [b['label'] for b in boxes if b['box'][2] == 0]
            if global_alerts:
                cv2.putText(frame, f"ALERT: {','.join(global_alerts)}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,0,255), 3)
        return frame

    def set_progress(self, camera_id: int, pct: float, stage: str, error: str = None):
        PROCESSING_PROGRESS[camera_id] = {
            "progress": min(100.0, round(pct, 1)),
            "stage": stage,
            "error": error
        }

    def process_video_file(self, camera_id: int, file_path: str, db):
        logger.info(f"Starting offline processing for video: {file_path}")
        self.set_progress(camera_id, 2.0, "Extracting Frames...")
        
        cap = None
        out = None
        alert_coord = None
        
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                self._update_status(camera_id, "failed", db)
                self.set_progress(camera_id, -1.0, "Processing Failed", "Could not open video file.")
                return
                
            orig_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            orig_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            
            target_width = 640
            target_height = int((target_width / orig_width) * orig_height) if orig_width > 0 else 360
            
            total_frames_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            if total_frames_count <= 0:
                total_frames_count = 1
                
            self.current_stats = {
                "start_time": time.time(),
                "confidences": [],
                "object_counts": {},
                "total_frames": total_frames_count,
                "total_detections": 0
            }
            
            # Process AI at 2 frames per second to drastically speed up processing
            skip_rate = max(1, int(fps / 2.0))
            
            processed_path = f"uploads/processed/{camera_id}_processed.mp4"
            fourcc = cv2.VideoWriter_fourcc(*'avc1')
            # Output video runs at original fps for perfectly smooth playback
            out = cv2.VideoWriter(processed_path, fourcc, fps, (target_width, target_height))
            
            from app.alerts.alert_coordinator import AlertCoordinator
            alert_coord = AlertCoordinator(self.alert_queue)
            alert_coord.start()
            
            self.set_progress(camera_id, 5.0, "Running YOLO...")
            
            frame_idx = 0
            processed_frames = 0
            last_boxes = []
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                
                frame = cv2.resize(frame, (target_width, target_height))
                
                # Determine stage text dynamically
                progress_pct = 5.0 + ((frame_idx / total_frames_count) * 80.0)
                stage_text = "Analyzing Video (AI Inference)..."
                
                # Update progress in DB/Cache every ~1 second to save CPU
                if frame_idx % max(1, int(fps)) == 0:
                    self.set_progress(camera_id, progress_pct, stage_text)
                
                # Run heavy AI models ONLY on the skip rate (e.g. 2 times per second)
                if frame_idx % skip_rate == 0:
                    results = self.process_single_frame(camera_id, frame)
                    last_boxes = results["boxes"]
                    offset_sec = frame_idx / fps if fps > 0 else 0
                    self._evaluate_alerts(camera_id, frame, last_boxes, offset_seconds=offset_sec)
                
                # Always draw the last known bounding boxes on the current frame
                frame = self._draw_boxes_on_frame(frame, last_boxes, frame_idx)
                
                out.write(frame)
                
                frame_idx += 1
                processed_frames += 1
                
        except Exception as e:
            logger.error(f"Error processing video: {e}", exc_info=True)
            self._update_status(camera_id, "failed", db)
            self.set_progress(camera_id, -1.0, "Processing Failed", str(e))
        finally:
            if cap: cap.release()
            if out: out.release()
            if alert_coord:
                alert_coord.stop_coordinator()
                alert_coord.join(timeout=2.0)
            
            # Check if it wasn't a failure
            current_prog = PROCESSING_PROGRESS.get(camera_id, {})
            if current_prog.get("progress") != -1.0:
                self.set_progress(camera_id, 85.0, "Generating Results...")
                self._finalize_stats(camera_id, db)
                self.set_progress(camera_id, 95.0, "Saving Report...")
                # Simulating final step since report API generates it on demand
                time.sleep(0.5) 
                self.set_progress(camera_id, 100.0, "Completed")
                
            logger.info(f"Finished processing video. Output saved to uploads/processed/{camera_id}_processed.mp4")

    def _finalize_stats(self, camera_id: int, db):
        camera = get_camera(db, camera_id)
        if not camera: return
        
        duration = time.time() - self.current_stats["start_time"]
        confs = self.current_stats["confidences"]
        camera.processing_duration = duration
        camera.total_frames = self.current_stats["total_frames"]
        camera.total_detections = self.current_stats["total_detections"]
        camera.object_counts = self.current_stats["object_counts"]
        
        if confs:
            camera.min_confidence = min(confs)
            camera.max_confidence = max(confs)
            camera.avg_confidence = sum(confs) / len(confs)
            
        camera.status = "completed"
        db.commit()

    def _update_status(self, camera_id: int, status: str, db):
        camera = get_camera(db, camera_id)
        if camera:
            camera.status = status
            db.commit()

    def _evaluate_alerts(self, camera_id: int, frame, frame_boxes: List[Dict], offset_seconds: float = 0.0):
        now = time.time()
        if camera_id not in self.active_alarms:
            self.active_alarms[camera_id] = {}

        alertable_classes = ['WEAPON', 'FIRE', 'SMOKE', 'FALL', 'CROWD', 'VIOLENCE']
        
        for box in frame_boxes:
            label = box['label']
            conf = box['confidence']
            
            if label in alertable_classes or label == 'PERSON':
                last_trigger = self.active_alarms[camera_id].get(label, 0.0)
                if now - last_trigger >= self.alarm_cool_down:
                    self.active_alarms[camera_id][label] = now
                    
                    snapshot_filename = None
                    if label in alertable_classes:
                        snapshot_filename = f"uploads/snapshots/{camera_id}_{label}_{int(now)}.jpg"
                        snap_frame = self._draw_boxes_on_frame(frame.copy(), [box], 0)
                        cv2.imwrite(snapshot_filename, snap_frame)
                    
                    mm = int(offset_seconds // 60)
                    ss = int(offset_seconds % 60)
                    time_str = f"{mm:02d}:{ss:02d}"

                    event_data = {
                        "camera_id": camera_id,
                        "anomaly_type": label,
                        "confidence": conf,
                        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                        "alert_message": time_str,
                        "raw_frame": None, # save memory
                        "snapshot_path": f"/static/snapshots/{os.path.basename(snapshot_filename)}" if snapshot_filename else None
                    }
                    self.alert_queue.put(event_data)

    def start(self): pass
    def stop_pipeline(self): pass
    def join(self, timeout=None): pass
