# 🆓 The 100% Free Cloud Stack for VigilAI

Your final-year project is now fully configured and seeded to run with a **100% free-forever serverless PostgreSQL database** on Neon.tech and is ready to deploy to the cloud!

This guide outlines your database credentials, the architectural enhancements made, and the exact steps to launch and demo the system.

---

## 🔑 Your Seeding Credentials (Neon PostgreSQL)

We successfully initialized the database tables in your cloud database and seeded them with high-fidelity, realistic demonstration data. You can log in immediately using:

*   **Administrator Email:** `admin@vigilai.com`
*   **Administrator Password:** `admin123`
*   **Database URL Configured:** `postgresql://neondb_owner:***@ep-morning-star-apj1q5gv.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require`

### 📊 Seeding Summary (What was created on the Cloud DB):
1.  **Users:** Premium administrator account for `Dr. Sarah Connor` (for authentication and profile screens).
2.  **Cameras:** 3 preconfigured surveillance feeds:
    *   *Main Entrance Gate* (Online, RTSP)
    *   *Lobby Reception Desk* (Online, IP Webcam)
    *   *Loading Dock West* (Offline, RTSP)
3.  **Emergency Contacts:** 2 active contacts:
    *   *John Diggle* (Partner, Primary SOS)
    *   *Central Security Dispatch* (Police, Backup SOS)
4.  **Detections & Alerts:** Realistic incidents for testing charts and notifications:
    *   `WEAPON` detected at Main Entrance Gate (High Severity, Unread)
    *   `FALL` detected in Lobby Area (Medium Severity, Resolved)
    *   `FIGHT` detected at Main Entrance Gate (High Severity, Read)
    *   `LOITERING` warning in Lobby Area (Low Severity, Resolved)
5.  **Recordings:** Realistic video files tracked under recording schedules.

---

## 🛠️ Enhancements & Fixes Implemented

To ensure a seamless transition from your local SQLite database to the remote cloud database, we made the following system upgrades:

1.  **PostgreSQL URL Normalization (`vigilai-backend/config.py`):**
    *   Cloud database providers (like Neon or Supabase) often generate connection URLs beginning with `postgres://`.
    *   SQLAlchemy 2.x strictly requires URLs to begin with `postgresql://`.
    *   We added automatic URL scheme normalization so that any `postgres://` string is automatically patched to `postgresql://` on startup, preventing runtime crashes.
2.  **Bcrypt Compatibility Patch (`passlib` + `bcrypt`):**
    *   Fixed a known compatibility bug between `passlib 1.7.4` and `bcrypt 5.0.0` inside Python 3.13 where a version-checking routine in passlib fails and incorrectly raises a `ValueError: password cannot be longer than 72 bytes`.
    *   Downgraded `bcrypt` to the highly stable `4.3.0` inside your virtual environment, ensuring secure hashing and authentication work perfectly.
3.  **Database Seeder (`vigilai-backend/seed_db.py`):**
    *   Created a customized seeder script that connects to your remote PostgreSQL server, verifies connection health, auto-creates all required database tables, and populates them.

---

## 🚀 Step 3: Run the System Locally (Connected to Cloud DB)

To test the system immediately on your local machine using the Neon cloud database:

### 1. Start the FastAPI Backend
Open a terminal in your project directory and run:
```powershell
cd vigilai-backend
..\.venv\Scripts\activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Your FastAPI backend is now running locally on Port 8000, reading and writing live data directly to your Neon cloud PostgreSQL database!*

### 2. Start the Expo Mobile App
Open a second terminal:
```powershell
cd vigilai
npx expo start -c
```
*Press `a` to run on an Android Emulator, `i` for iOS, or scan the QR code using your physical device running the Expo Go app!*

---

## ☁️ Step 4: Deploy your Backend to Hugging Face Spaces (100% Free)

If you want to host your backend server in the cloud for free (so it runs 24/7 without needing your laptop to be open):

1.  **Sign up** for a free account at [Hugging Face](https://huggingface.co/).
2.  Create a new **Space**:
    *   **Space Name:** `vigilai-backend`
    *   **SDK:** **Docker** (Select the *Blank* template)
    *   **Hardware:** **CPU Basic (2 vCPU, 16 GB RAM)** — *This tier is 100% free forever!*
3.  **Add Secrets:** Go to Space **Settings** -> **Variables and Secrets**, and add your environment variables from `.env`:
    *   `DATABASE_URL` = (Your Neon connection URL)
    *   `JWT_SECRET_KEY` = `vigilai_secure_cryptographic_secret_key_2026_token`
4.  **Push Code:** Push your `vigilai-backend` files (including the `Dockerfile`) directly to your Space's Git repository.
5.  Hugging Face will automatically build your Docker container and give you a live public HTTPS URL (e.g., `https://username-vigilai-backend.hf.space`).
6.  Simply paste that public HTTPS URL as `API_BASE_URL` inside **`vigilai/src/services/api.js`**, compile your standalone APK, and your entire system is running in the cloud with **zero hosting costs**!
