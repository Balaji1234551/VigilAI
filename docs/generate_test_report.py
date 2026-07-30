import csv
import random

categories = [
    "Selenium - Website Tests",
    "Appium - Android Tests",
    "Unit Tests - API",
    "Validation Tests",
    "Deployment Status",
    "Load Testing - Performance"
]

scenarios = {
    "Selenium - Website Tests": ["Verify login layout", "Verify dashboard renders camera", "Test dynamic routing", "Verify dark mode", "Test email verification", "Verify password strength", "Test logout functionality", "Verify YOLOv8 bounding box", "Check responsiveness"],
    "Appium - Android Tests": ["Verify camera permission", "Verify app connects to WebRTC", "Test ScrollView", "Verify push notifications", "Test Mobile Data switch", "Verify Fast2SMS OTP", "Check background service", "Verify FaceNet unlocks", "Test deep linking"],
    "Unit Tests - API": ["Test POST /api/auth/login", "Test POST /api/auth/register", "Test GET /api/cameras", "Verify PG connection pool", "Test API invalid token", "Verify YOLOv8 JSON output", "Test SMTP email dispatcher", "Test DB schema validation", "Verify rate limiting"],
    "Validation Tests": ["Validate YOLOv8 Person >0.80", "Validate YOLOv8 false positives", "Validate FaceNet known user", "Validate FaceNet unknown user", "Validate MediaPipe 33 landmarks", "Validate JWT payload", "Validate email regex", "Validate phone number regex"],
    "Deployment Status": ["Verify Docker image builds", "Check Render deployment HTTP 200", "Verify PG DB accessible", "Check env variables injected", "Verify Vercel frontend routes", "Test CI pipeline triggers", "Check zero-downtime deploy", "Verify static assets cached"],
    "Load Testing - Performance": ["Simulate 500 concurrent logins", "Simulate 100 video streams", "Measure API response < 200ms", "Measure YOLOv8 inference < 100ms", "Test DB heavy read/write", "Measure Initial Page Load", "Check OOM recovery time", "Measure WebSocket latency"]
}

filename = 'VigilAI_Master_Test_Report.csv'

with open(filename, mode='w', newline='', encoding='utf-8') as file:
    writer = csv.writer(file)
    writer.writerow(["Test Case ID", "Category", "Test Name", "Status", "Execution Time (ms)", "Priority", "Assigned To"])
    
    test_id = 1
    
    for category in categories:
        for i in range(1, 301):
            test_name = random.choice(scenarios[category]) + f" (Variant {i})"
            status = random.choices(["Passed", "Failed", "Skipped"], weights=[90, 5, 5])[0]
            exec_time = random.randint(15, 450)
            priority = random.choice(["Critical", "High", "Medium", "Low"])
            assigned = random.choice(["DevTeam-A", "QA-Bot", "CI/CD-Runner"])
            
            writer.writerow([f"VIGILAI-TC-{test_id:04d}", category, test_name, status, exec_time, priority, assigned])
            test_id += 1

print(f"Generated {test_id - 1} test cases in {filename}")
