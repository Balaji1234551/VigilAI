import cv2
import numpy as np

def apply_privacy_zones(frame: np.ndarray, zones: list[dict]) -> np.ndarray:
    """
    Applies privacy zones to a video frame by drawing black rectangles over specified coordinates.

    Args:
        frame (np.ndarray): The input video frame as a NumPy array (BGR format).
        zones (list[dict]): List of dictionaries, each containing 'x', 'y', 'w', 'h' keys for rectangle coordinates.

    Returns:
        np.ndarray: The modified frame with privacy zones applied.
    """
    for zone in zones:
        x = zone.get('x', 0)
        y = zone.get('y', 0)
        w = zone.get('w', 0)
        h = zone.get('h', 0)
        # Draw a solid black rectangle
        cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 0, 0), -1)  # -1 for filled rectangle
    return frame