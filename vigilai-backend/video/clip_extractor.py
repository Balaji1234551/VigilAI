"""
Incident Video Clip Extraction Module for VigilAI.
Extracts post and pre-incident clips upon AI alert triggers (T-10s to T+20s).
Maintains a 30-day storage circular buffer logic for alert clips.
"""
import os
import cv2
import time
import logging
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Tuple, Optional
from config import CLIPS_DIR

logger = logging.getLogger("VigilAI.ClipExtractor")


class ClipExtractionThread(threading.Thread):
    """
    Spins up a thread to build an incident clip.
    Flushes the 10-second rolling buffer (300 frames) of pre-incident history,
    then captures 20 seconds of real-time post-incident footage (600 frames) to complete the 30-second evidence clip.
    """
    def __init__(
        self, 
        camera_id: int, 
        camera_thread,  # Reference to CameraConnectionThread
        anomaly_type: str, 
        buffer_frames: List[Tuple[float, cv2.Mat]], 
        output_filepath: Path,
        target_fps: int = 30,
        width: int = 1280,
        height: int = 720
    ):
        super().__init__()
        self.camera_id = camera_id
        self.camera_thread = camera_thread
        self.anomaly_type = anomaly_type
        self.buffer_frames = buffer_frames
        self.output_filepath = output_filepath
        self.target_fps = target_fps
        self.width = width
        self.height = height
        self.daemon = True

    def run(self):
        """
        Dumps existing buffer to MP4 file, then pulls and records live frames for 20 additional seconds.
        """
        logger.info(f"[Clip Extractor] Starting clip generation for Camera {self.camera_id}, Type: {self.anomaly_type}")
        
        # Ensure destination directory exists
        self.output_filepath.parent.mkdir(parents=True, exist_ok=True)
        
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(
            str(self.output_filepath),
            fourcc,
            self.target_fps,
            (self.width, self.height)
        )
        
        if not writer.isOpened():
            logger.error(f"[Clip Extractor] Failed to open VideoWriter for path: {self.output_filepath}")
            return

        try:
            # 1. Flush pre-incident buffered frames (T-10s)
            frames_written = 0
            for timestamp, frame in self.buffer_frames:
                # Ensure correct frame dimensions
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))
                writer.write(frame)
                frames_written += 1
            
            logger.info(f"[Clip Extractor] Flushed {frames_written} frames of history to evidence file.")

            # 2. Record post-incident footage (T+20s)
            post_frames_needed = self.target_fps * 20  # 600 frames at 30fps
            post_frames_written = 0
            frame_delay = 1.0 / self.target_fps
            
            while post_frames_written < post_frames_needed:
                now = time.time()
                
                # Fetch latest live frame
                frame = self.camera_thread.get_latest_frame()
                if frame is not None:
                    if frame.shape[1] != self.width or frame.shape[0] != self.height:
                        frame = cv2.resize(frame, (self.width, self.height))
                    writer.write(frame)
                    post_frames_written += 1
                
                # Check for camera connection thread stoppage
                if not self.camera_thread.is_running:
                    logger.warning("[Clip Extractor] Camera capture stopped unexpectedly during clip recording.")
                    break
                
                # Regulate writing speed
                time_spent = time.time() - now
                time.sleep(max(0.001, frame_delay - time_spent))

            logger.info(f"[Clip Extractor] Added {post_frames_written} frames of real-time post-alert footage.")
            logger.info(f"[Clip Extractor] Clip saved successfully: {self.output_filepath.name}")

        except Exception as e:
            logger.error(f"[Clip Extractor Exception] Clip extraction failed: {e}")
        finally:
            writer.release()


class ClipExtractor:
    """
    Schedules clip generation and operates background threads to wipe clips older than 30 days.
    """
    def __init__(self, camera_manager):
        self.camera_manager = camera_manager
        self.cleanup_thread = None
        self.is_cleaning = False

    def trigger_incident_clip(self, camera_id: int, anomaly_type: str) -> Optional[Path]:
        """
        Pulls history frames from deque and spawns ClipExtractionThread.
        Returns the prospective Path to the generated evidence MP4.
        """
        cam_thread = self.camera_manager.get_thread(camera_id)
        if not cam_thread:
            logger.error(f"Cannot trigger clip: Camera connection {camera_id} is inactive.")
            return None

        # Fetch buffered frames snapshot thread-safely
        buffer_snapshot = cam_thread.get_buffer_frames()
        if not buffer_snapshot:
            logger.warning(f"Empty rolling frame buffer for Camera {camera_id}. Clip may be incomplete.")
        
        # Structure clip file path: clips/camera_id/clip_ANOMALY_TYPE_YYYY-MM-DD_HH-MM-SS.mp4
        now = datetime.now()
        timestamp_str = now.strftime("%Y-%m-%d_%H-%M-%S")
        
        camera_clip_folder = CLIPS_DIR / str(camera_id)
        clip_name = f"clip_{anomaly_type.upper()}_{timestamp_str}.mp4"
        output_filepath = camera_clip_folder / clip_name

        # Start background extraction
        extraction_thread = ClipExtractionThread(
            camera_id=camera_id,
            camera_thread=cam_thread,
            anomaly_type=anomaly_type,
            buffer_frames=buffer_snapshot,
            output_filepath=output_filepath
        )
        extraction_thread.start()
        
        return output_filepath

    def start_cleanup_scheduler(self):
        """
        Starts automatic 30-day clips cleanup daemon loop.
        """
        self.is_cleaning = True
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
        logger.info("Incident clips cleanup background service scheduler started.")

    def _cleanup_loop(self):
        """
        Runs once daily, deleting incident files older than 30 days.
        """
        while self.is_cleaning:
            logger.info("Running automatic 30-day incident clips filesystem purge sweep...")
            try:
                cutoff_time = datetime.now() - timedelta(days=30)
                purged_count = 0
                
                # Scan clips directory
                for root, _, files in os.walk(CLIPS_DIR):
                    for file in files:
                        file_path = Path(root) / file
                        if file_path.is_file():
                            try:
                                # Get file modified time
                                file_mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                                if file_mtime < cutoff_time:
                                    file_path.unlink()
                                    purged_count += 1
                                    logger.info(f"[Clip Cleanup] Deleted expired clip: {file_path.name}")
                            except OSError as e:
                                logger.error(f"[Clip Cleanup Error] Failed deleting {file_path}: {e}")
                
                if purged_count > 0:
                    logger.info(f"[Clip Cleanup] Purged {purged_count} expired incident clips older than 30 days.")

                # Clean empty directories
                self._prune_empty_dirs(CLIPS_DIR)

            except Exception as e:
                logger.error(f"[Clip Cleanup Scheduler Exception] Sweeping failed: {e}")

            # Sleep for 24 hours
            time.sleep(24 * 60 * 60)

    def _prune_empty_dirs(self, root_dir: Path):
        """
        Recursively deletes empty folders inside the clips tree.
        """
        for dirpath, _, filenames in os.walk(root_dir, topdown=False):
            dir_path = Path(dirpath)
            if dir_path != root_dir and not os.listdir(dir_path):
                try:
                    dir_path.rmdir()
                    logger.info(f"[Clip Cleanup] Pruned empty folder: {dir_path.relative_to(root_dir)}")
                except OSError:
                    pass

    def stop_scheduler(self):
        """
        Gracefully stop the cleanup service.
        """
        self.is_cleaning = False
