import smtplib
from dotenv import load_dotenv
import os

load_dotenv(override=True)
EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))

def test_smtp():
    print(f"Testing login for: {EMAIL_ADDRESS}")
    try:
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10)
        server.set_debuglevel(1)  # Print all SMTP communication
        server.starttls()
        server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
        print("LOGIN SUCCESSFUL!")
        
        # Test send
        msg = f"Subject: SMTP Test\n\nThis is a test."
        server.sendmail(EMAIL_ADDRESS, [EMAIL_ADDRESS], msg)
        print("EMAIL SENT SUCCESSFULLY!")
        server.quit()
    except Exception as e:
        print(f"SMTP Error: {e}")

if __name__ == "__main__":
    test_smtp()
