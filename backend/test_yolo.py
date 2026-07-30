from ultralytics import YOLO
import cv2
import os

# -----------------------------
# Load YOLO Model
# -----------------------------
MODEL_PATH = "models/best.pt"   # Change path if needed

if not os.path.exists(MODEL_PATH):
    print(f"❌ Model not found: {MODEL_PATH}")
    exit()

print("Loading model...")
model = YOLO(MODEL_PATH)
print("✅ Model Loaded Successfully!")

# Print class names
print("Classes:", model.names)

# -----------------------------
# Open Webcam
# -----------------------------
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open webcam.")
    exit()

print("✅ Webcam Started")

while True:
    ret, frame = cap.read()

    if not ret:
        break

    # Run inference
    results = model.predict(frame, conf=0.25)

    # Draw detections
    annotated_frame = results[0].plot()

    # Print detections
    if len(results[0].boxes) > 0:
        print("\n========= DETECTION =========")
        for box in results[0].boxes:
            cls = int(box.cls[0])
            conf = float(box.conf[0])

            print(f"Detected: {model.names[cls]}")
            print(f"Confidence: {conf:.2f}")
    else:
        print("No Detection")

    cv2.imshow("VigilAI Weapon Detection", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()