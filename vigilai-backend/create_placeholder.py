"""
Programmatic Placeholder Generator for VigilAI.
Creates a professional dark neon offline template image (1280x720) with a grid layout,
warning indicator icon, and high-contrast typography.
Saves image as offline_placeholder.jpg inside the vigilai-backend directory.
"""
import cv2
import numpy as np


def generate_beautiful_placeholder():
    # Width and height for HD resolution
    width, height = 1280, 720
    
    # Create dark matte background (#0b0e14)
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:] = (20, 14, 11)  # BGR order for #0d1117

    # 1. Draw subtle background coordinate grid lines (every 40px)
    grid_color = (33, 26, 22)  # BGR subtle slate
    for x in range(0, width, 40):
        cv2.line(img, (x, 0), (x, height), grid_color, 1)
    for y in range(0, height, 40):
        cv2.line(img, (0, y), (width, y), grid_color, 1)

    # 2. Draw outer cyan glow bezel border
    cv2.rectangle(img, (10, 10), (width - 10, height - 10), (255, 240, 0), 2)  # BGR Cyan: (255, 240, 0)
    
    # 3. Draw a centralized stylized warning signal box (red/orange)
    box_w, box_h = 600, 240
    bx1 = (width - box_w) // 2
    by1 = (height - box_h) // 2
    bx2 = bx1 + box_w
    by2 = by1 + box_h
    
    # Draw filled translucent black center panel for text readability
    cv2.rectangle(img, (bx1, by1), (bx2, by2), (30, 22, 18), -1)
    # Draw thin neon border around center panel
    cv2.rectangle(img, (bx1, by1), (bx2, by2), (0, 0, 255), 2)  # Red BGR

    # 4. Add warning icons / decorative corners
    corner_len = 20
    corners = [
        ((bx1, by1), (bx1 + corner_len, by1), (bx1, by1 + corner_len)),
        ((bx2, by1), (bx2 - corner_len, by1), (bx2, by1 + corner_len)),
        ((bx1, by2), (bx1 + corner_len, by2), (bx1, by2 - corner_len)),
        ((bx2, by2), (bx2 - corner_len, by2), (bx2, by2 - corner_len))
    ]
    for pt, pt_h, pt_v in corners:
        cv2.line(img, pt, pt_h, (255, 240, 0), 3)
        cv2.line(img, pt, pt_v, (255, 240, 0), 3)

    # 5. Write Typography Labels
    # Header Label
    text_header = "VigilAI SURVEILLANCE FEED"
    (tw, th), _ = cv2.getTextSize(text_header, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)
    tx = (width - tw) // 2
    cv2.putText(img, text_header, (tx, by1 + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 240, 0), 2)

    # Status Label (Pulsing Warning)
    text_status = "STREAM OFFLINE / RECONNECTING"
    (sw, sh), _ = cv2.getTextSize(text_status, cv2.FONT_HERSHEY_SIMPLEX, 0.9, 3)
    sx = (width - sw) // 2
    cv2.putText(img, text_status, (sx, by1 + 130), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 3)  # Red BGR

    # Descriptive footnote label
    text_note = "Camera connection loop running in background. Checking stream availability..."
    (nw, nh), _ = cv2.getTextSize(text_note, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
    nx = (width - nw) // 2
    cv2.putText(img, text_note, (nx, by1 + 190), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (160, 160, 160), 1)

    # 6. Save the final processed image to disk
    cv2.imwrite("offline_placeholder.jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 90])
    print("Beautiful stream placeholder image generated successfully as 'offline_placeholder.jpg'")


if __name__ == "__main__":
    generate_beautiful_placeholder()
