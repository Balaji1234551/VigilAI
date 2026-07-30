import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
// Analytics only works on the web by default in the JS SDK. 
// If you are building for iOS/Android, you may need a different approach for Analytics or wrap it in Platform checks.
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9G3DTpOljI8MkOQC5KRMrAzUmpts0_G0",
  authDomain: "vigilai-4e325.firebaseapp.com",
  projectId: "vigilai-4e325",
  storageBucket: "vigilai-4e325.firebasestorage.app",
  messagingSenderId: "379182387498",
  appId: "1:379182387498:web:6f0f9ca86ee1066ec78e53",
  measurementId: "G-5DYSNPNK9L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with cross-platform persistence checking
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize Analytics conditionally to avoid crashing on mobile (React Native)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch(console.error);

export { app, auth, analytics };
