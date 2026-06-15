"""
Continuous Video Recording and Storage Management Module for VigilAI.
Records camera streams continuously to MP4 files, splits them into 10-minute blocks,
records files in database, and performs 7-day rolling circular buffer deletions.
"""
import os
import cv2
import time
import logging
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Optional, Tuple, Any
from config import RECORDINGS_DIR
from database.db import SessionLocal
from database.crud import create_recording, delete_recording
from database.models import Recording as DBRecording

logger = logging.getLogger("VigilAI.Recorder")


class CameraRecorder(threading.Thread):
    """
    Independent thread per active camera stream that continuously reads frames,
    writes them to an MP4 file, and automatically splits recordings every 10 minutes.
    """
    def __init__(
        self, 
        camera_id: int, 
        camera_thread,  # Reference to the CameraConnectionThread
        target_fps: int = 30, 
        width: int = 1280, 
        height: int = 720
    ):
        super().__init__()
        self.camera_id = camera_id
        self.camera_thread = camera_thread
        self.target_fps = target_fps
        self.width = width
        self.height = height
        self.daemon = True
        
        self.is_recording = False
        self.split_interval = 10 * 60  # Split files every 10 minutes (600 seconds)
        self.writer = None
        self.current_filepath = None
        self.segment_start_time = None

    def _get_output_path(self) -> Tuple[Path, str]:
        """
        Calculates path structure: recordings/camera_id/YYYY-MM-DD/camera_id_YYYY-MM-DD_HH-MM-SS.mp4
        Returns tuple of (full_filepath, date_folder_string).
        """
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        time_str = now.strftime("%H-%M-%S")
        
        # Structure directories
        camera_folder = RECORDINGS_DIR / str(self.camera_id) / date_str
        camera_folder.mkdir(parents=True, exist_ok=True)
        
        filename = f"camera_{self.camera_id}_{date_str}_{time_str}.mp4"
        return camera_folder / filename, date_str

    def run(self):
        """
        Continually polls latest frames and handles MP4 file generation with splitting logic.
        """
        self.is_recording = True
        logger.info(f"[Recorder Cam {self.camera_id}] Continuous recording service initialized.")
        
        last_frame_written_time = time.time()
        frame_delay = 1.0 / self.target_fps
        
        while self.is_recording:
            now = time.time()
            
            # 1. Start writer or trigger file splitting
            if self.writer is None or (now - self.segment_start_time) >= self.split_interval:
                self._rotate_recording_file()

            # 2. Grab frame from connection thread
            frame = self.camera_thread.get_latest_frame()
            if frame is not None:
                # Write to the current MP4 file
                self.writer.write(frame)
            
            # Throttling to match target frame rate
            time_spent = time.time() - now
            sleep_time = max(0.001, frame_delay - time_spent)
            time.sleep(sleep_time)

        # Cleanup on exit
        self._close_writer()
        logger.info(f"[Recorder Cam {self.camera_id}] Continuous recording service stopped.")

    def _rotate_recording_file(self):
        """
        Closes current active file, registers it in database, and sets up a new file segment.
        """
        now = datetime.now()
        
        # Close active writing segment
        if self.writer is not None:
            self._close_writer()
        
        # Define paths
        self.current_filepath, _ = self._get_output_path()
        self.segment_start_time = time.time()
        
        # Initialize video writer with 'mp4v' codec
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        self.writer = cv2.VideoWriter(
            str(self.current_filepath),
            fourcc,
            self.target_fps,
            (self.width, self.height)
        )
        logger.info(f"[Recorder Cam {self.camera_id}] Writing to segment: {self.current_filepath.name}")

    def _close_writer(self):
        """
        Closes current file handle and saves file metadata record inside the database.
        """
        if self.writer is not None:
            self.writer.release()
            self.writer = None
            
            # Track end metadata
            segment_end_time = datetime.now()
            duration_sec = int(time.time() - self.segment_start_time)
            
            try:
                # Calculate file size in bytes
                file_size_bytes = os.path.getsize(self.current_filepath)
            except OSError:
                file_size_bytes = 0

            # Calculate actual segment start datetime object
            actual_start_dt = segment_end_time - timedelta(seconds=duration_sec)

            # Log record to SQLite DB
            db = SessionLocal()
            try:
                rec_data = {
                    "camera_id": self.camera_id,
                    "file_path": str(self.current_filepath),
                    "start_time": actual_start_dt,
                    "end_time": segment_end_time,
                    "file_size": file_size_bytes,
                    "duration": duration_sec
                }
                create_recording(db, rec_data)
                logger.info(f"[Recorder Cam {self.camera_id}] Registered recording segment in database.")
            except Exception as e:
                logger.error(f"[Recorder Cam {self.camera_id}] Database register recording failed: {e}")
            finally:
                db.close()

    def stop_recording(self):
        """
        Halts the recorder thread.
        """
        self.is_recording = False


class RecordingManager:
    """
    Coordinates recording tasks and sweeps disk space daily to execute circular cleanup rules.
    """
    def __init__(self, camera_manager):
        self.camera_manager = camera_manager
        self.active_recorders: Dict[int, CameraRecorder] = {}
        self.cleanup_thread = None
        self.is_cleaning = False

    def start_recording(self, camera_id: int) -> bool:
        """
        Begins recording thread for a given camera stream.
        """
        if camera_id in self.active_recorders:
            return True

        cam_thread = self.camera_manager.get_thread(camera_id)
        if not cam_thread:
            logger.warning(f"Unable to start recording: Camera {camera_id} capture thread is not running.")
            return False

        recorder = CameraRecorder(camera_id=camera_id, camera_thread=cam_thread)
        self.active_recorders[camera_id] = recorder
        recorder.start()
        logger.info(f"Started continuous recording for camera {camera_id}")
        return True

    def stop_recording(self, camera_id: int) -> bool:
        """
        Halts recording task for a given camera.
        """
        recorder = self.active_recorders.get(camera_id)
        if recorder:
            recorder.stop_recording()
            recorder.join(timeout=2.0)
            del self.active_recorders[camera_id]
            logger.info(f"Stopped recording for camera {camera_id}")
            return True
        return False

    def start_cleanup_scheduler(self):
        """
        Spins up continuous background circular cleanups.
        """
        self.is_cleaning = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
        logger.info("Storage cleanup background service scheduler started.")

    def _cleanup_loop(self):
        """
        Runs once every hour, deleting logs and MP4 files older than 7 days.
        """
        while self.is_cleaning:
            logger.info("Running automatic 7-day circular buffer storage sweep...")
            db = SessionLocal()
            try:
                # 1. Query recordings older than 7 days from DB
                cutoff_time = datetime.utcnow() - timedelta(days=7)
                expired_recordings = db.query(DBRecording).filter(DBRecording.start_time < cutoff_time).all()
                
                deleted_count = 0
                for rec in expired_recordings:
                    # Remove file on disk
                    file_path = Path(rec.file_path)
                    if file_path.exists():
                        try:
                            file_path.unlink()
                            logger.info(f"[Cleanup] Deleted physical recording file: {file_path.name}")
                        except OSError as e:
                            logger.error(f"[Cleanup] Failed deleting physical file {file_path}: {e}")
                    
                    # Remove database record
                    delete_recording(db, rec.id)
                    deleted_count += 1
                
                if deleted_count > 0:
                    logger.info(f"[Cleanup] Purged {deleted_count} expired recording files older than 7 days.")
                
                # 2. Prune empty date directories in recording folders
                self._prune_empty_dirs(RECORDINGS_DIR)

            except Exception as e:
                logger.error(f"[Cleanup Scheduler Error] Sweep cycle failed: {e}")
            finally:
                db.close()
                
            # Sleep for 1 hour before scanning again
            time.sleep(60 * 60)

    def _prune_empty_dirs(self, root_dir: Path):
        """
        Recursively deletes empty folders inside the recordings tree.
        """
        for dirpath, _, filenames in os.walk(root_dir, topdown=False):
            dir_path = Path(dirpath)
            if dir_path != root_dir and not os.listdir(dir_path):
                try:
                    dir_path.rmdir()
                    logger.info(f"[Cleanup] Pruned empty folder: {dir_path.relative_to(root_dir)}")
                except OSError:
                    pass

    def get_storage_diagnostics(self) -> Dict[str, Any]:
        """
        Returns a diagnostic summary showing active storage sizes in MB/GB.
        """
        total_size_bytes = 0
        file_count = 0
        
        for root, _, files in os.walk(RECORDINGS_DIR):
            for f in files:
                fp = os.path.join(root, f)
                try:
                    total_size_bytes += os.path.getsize(fp)
                    file_count += 1
                except OSError:
                    pass
        
        size_mb = total_size_bytes / (1024 * 1024)
        size_gb = size_mb / 1024
        
        return {
            "total_files": file_count,
            "total_size_bytes": total_size_bytes,
            "size_mb": f"{size_mb:.2f} MB",
            "size_gb": f"{size_gb:.2f} GB"
        }

    def shutdown_all(self):
        """
        Shuts down active continuous recorders on program close.
        """
        self.is_cleaning = False
        camera_ids = list(self.active_recorders.keys())
        for cid in camera_ids:
            self.stop_recording(cid)
        logger.info("Continuous recorders stopped.")
