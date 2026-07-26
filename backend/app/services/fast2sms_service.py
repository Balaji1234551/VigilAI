import requests
import logging
from app.config import FAST2SMS_API_KEY
from typing import List

logger = logging.getLogger("VigilAI.Fast2SMS")

class Fast2SMSService:
    """Service to send SMS using the Fast2SMS API."""
    
    def __init__(self):
        self.api_key = FAST2SMS_API_KEY
        self.url = "https://www.fast2sms.com/dev/bulkV2"
        
        if not self.api_key:
            logger.warning("Fast2SMS API Key is missing! SMS will not be sent.")

    def send_sms(self, phone_numbers: List[str], message: str) -> bool:
        """Sends an SMS to multiple numbers and logs the exact API response."""
        if not self.api_key:
            logger.error("Failed to send SMS: Fast2SMS API key is not configured.")
            return False
            
        if not phone_numbers:
            logger.warning("No phone numbers provided for Fast2SMS.")
            return False

        # Filter out empty strings or None
        valid_numbers = [num for num in phone_numbers if num]
        if not valid_numbers:
            logger.warning("All provided phone numbers were empty.")
            return False

        numbers_str = ",".join(valid_numbers)
        logger.info(f"Sending SMS via Fast2SMS to: {numbers_str}")
        
        payload = {
            "route": "q",
            "message": message,
            "numbers": numbers_str,
        }
        
        headers = {
            "authorization": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(self.url, json=payload, headers=headers, timeout=10)
            
            # Log exact response
            if response.status_code == 200:
                resp_json = response.json()
                if resp_json.get("return") == True:
                    logger.info(f"SMS Success to {numbers_str}. Response: {resp_json}")
                    return True
                else:
                    logger.error(f"SMS Failed for {numbers_str}. Fast2SMS API Response: {resp_json}")
                    return False
            else:
                logger.error(f"SMS Failed for {numbers_str}. HTTP Status: {response.status_code}, Body: {response.text}")
                return False
                
        except requests.exceptions.Timeout:
            logger.error(f"Fast2SMS request timed out for numbers: {numbers_str}")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error during Fast2SMS request: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected Exception during Fast2SMS request: {e}")
            return False
