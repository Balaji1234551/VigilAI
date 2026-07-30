# Android App Setup Guide

## 🚀 Quick Start Steps

### Step 1: Install Dependencies
Open a terminal in the `vigilai` folder and run:

```powershell
cd vigilai
npm install
```

This will install all required packages including Expo and React Native.

---

### Step 2: Start the Backend
Make sure your FastAPI backend is running first:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend should be running at `http://localhost:8000`

---

### Step 3: Run the Android App

#### **Option A: Using Expo Go (Easiest)**
```powershell
cd vigilai
npm start
```

Then:
- **For Android Emulator**: Press `a` in the terminal
- **For Physical Device**: 
  1. Install Expo Go from Google Play Store
  2. Scan the QR code shown in terminal with Expo Go
  3. App will launch on your device

**Note**: For Android Emulator, the app automatically uses `10.0.2.2:8000` to connect to your backend

---

#### **Option B: Native Android Build (Requires Android Studio)**
```powershell
cd vigilai
npm run android
```

Requirements:
- Android Studio installed
- Android SDK configured
- ANDROID_HOME environment variable set

---

### Step 4: Verify Backend Connection
When the app starts:
1. You should see the Welcome/Login screen
2. The app automatically checks if backend is running
3. If connection fails, you'll see a warning

---

## 🔧 Configuration

### API Endpoint Setup
The API service in `src/services/api.js` is already configured:

- **For Android Emulator**: Uses `10.0.2.2:8000` (emulator localhost)
- **For Physical Device**: Uses `localhost:8000` (same WiFi network)
- **For Web**: Uses `localhost:8000`

**If you need to change the API URL**, edit `src/services/api.js`:
```javascript
const API_BASE_URL = 'http://10.0.2.2:8000'; // Change this
```

### Important: Android Emulator Networking
- **Android Emulator → Host Machine**: Use `10.0.2.2` instead of `localhost`
- This is automatically configured in the API service
- Make sure your backend is running on `0.0.0.0:8000`

---

## 📱 Testing the App

### On Android Emulator
1. Run backend on host machine
2. `npm start` in `vigilai` folder
3. Press `a` to open Android Emulator
4. App should connect to backend automatically

### On Physical Device
1. Connect device to same WiFi as backend machine
2. `npm start` in `vigilai` folder
3. Scan QR code with Expo Go app
4. Update API URL to your machine's IP if needed:
   ```javascript
   const API_BASE_URL = 'http://YOUR_MACHINE_IP:8000';
   ```

---

## 🐛 Troubleshooting

### "Cannot connect to backend"
- ✅ Check if backend is running: `http://localhost:8000/docs`
- ✅ Verify API_BASE_URL in `src/services/api.js`
- ✅ For Android Emulator, ensure using `10.0.2.2` not `localhost`
- ✅ Check firewall isn't blocking port 8000

### "Metro server not starting"
```powershell
# Clear cache and try again
npx expo start --clear
```

### "Module not found errors"
```powershell
# Reinstall dependencies
rm -r node_modules
npm install
```

### Emulator won't connect
```powershell
# Reset emulator
emulator -list-avds  # List available emulators
emulator -avd <emulator_name> -wipe-data
```

---

## 📋 Available Screens

The app includes these screens (all ready to use):

| Screen | Purpose |
|--------|---------|
| `LoginScreen.js` | User authentication |
| `HomeScreen.js` | Dashboard with stats |
| `AlertsScreen.js` | View all alerts |
| `CameraScreen.js` | Camera list |
| `AddCameraScreen.js` | Add new camera |
| `CameraSettingsScreen.js` | Camera configuration |
| `PrivacyZonesScreen.js` | Manage privacy zones |
| `TrustedPersonsScreen.js` | Manage trusted persons |
| `AnalyticsScreen.js` | View statistics |
| `PatrolModeScreen.js` | Patrol monitoring |

---

## 🎯 Next Steps

1. ✅ Complete Android app setup
2. 📱 Test each screen and backend connections
3. 🔐 Implement authentication with backend
4. 🌐 Move to web app development (when ready)

---

## 📚 Resources

- **Expo Documentation**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev
- **Your Backend API**: http://localhost:8000/docs (Swagger UI)
- **Backend README**: `backend/README.md`

---

**Status**: ✅ Android app ready to run!
