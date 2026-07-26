import os
import requests
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("FAST2SMS_API_KEY")

def test_sms(phone_number):
    if not api_key:
        print("ERROR: FAST2SMS_API_KEY not found in .env")
        return

    url = "https://www.fast2sms.com/dev/bulkV2"
    payload = {
        "route": "q",
        "message": "🚨 VIGILAI TEST ALERT\nThis is a test message to verify Fast2SMS integration.",
        "numbers": phone_number,
    }
    
    headers = {
        "authorization": api_key,
        "Content-Type": "application/json"
    }

    try:
        print(f"Sending test SMS to {phone_number}...")
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"HTTP Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_sms("9392818557")
