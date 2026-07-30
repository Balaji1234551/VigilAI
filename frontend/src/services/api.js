/**
 * API Service for VigilAI Backend
 * Centralized API calls to FastAPI backend at http://localhost:8000
 */

// Backend API configuration
import { Platform } from 'react-native';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');
const API_VERSION = 'v1';
const API_ENDPOINT = `${API_BASE_URL}/api`;

// Timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Helper function to make API calls with timeout
 */
const fetchWithTimeout = async (url, options = {}, timeout = REQUEST_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    let token = null;
    try {
      token = await AsyncStorage.getItem('userToken');
    } catch (e) {}

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * ALERTS API
 */
export const alertsAPI = {
  // Create a new alert
  createAlert: async (alertData) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts`, {
      method: 'POST',
      body: JSON.stringify(alertData),
    });
    if (!response.ok) throw new Error(`Failed to create alert: ${response.statusText}`);
    return response.json();
  },

  // Get active (unresolved) alerts
  getActiveAlerts: async () => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/list?status=unread`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch active alerts: ${response.statusText}`);
    return response.json();
  },

  // Get alerts for a specific camera
  getCameraAlerts: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/camera/${cameraId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch camera alerts: ${response.statusText}`);
    return response.json();
  },

  // Get alert details with timeline
  getAlertDetails: async (alertId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/${alertId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch alert details: ${response.statusText}`);
    return response.json();
  },

  // Get monthly trends for a camera
  getAlertTrends: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/trends/${cameraId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch alert trends: ${response.statusText}`);
    return response.json();
  },

  // Add detection event to alert
  addDetectionEvent: async (alertId, eventData) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/${alertId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    if (!response.ok) throw new Error(`Failed to add detection event: ${response.statusText}`);
    return response.json();
  },

  // Resolve an alert
  resolveAlert: async (alertId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/${alertId}/resolve`, {
      method: 'PATCH',
    });
    if (!response.ok) throw new Error(`Failed to resolve alert: ${response.statusText}`);
    return response.json();
  },

  // Delete an alert
  deleteAlert: async (alertId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/alerts/${alertId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete alert: ${response.statusText}`);
    return response.json();
  },
};

/**
 * CAMERAS API
 */
export const camerasAPI = {
  // Get all cameras
  getCameras: async () => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/list`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch cameras: ${response.statusText}`);
    return response.json();
  },

  // Add new camera
  addCamera: async (cameraData) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/add`, {
      method: 'POST',
      body: JSON.stringify(cameraData),
    });
    if (!response.ok) throw new Error(`Failed to add camera: ${response.statusText}`);
    return response.json();
  },

  // Get camera status
  getCameraStatus: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/${cameraId}/status`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to get camera status: ${response.statusText}`);
    return response.json();
  },

  // Start camera
  startCamera: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/start?camera_id=${cameraId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Failed to start camera: ${response.statusText}`);
    return response.json();
  },

  // Stop camera
  stopCamera: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/stop?camera_id=${cameraId}`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error(`Failed to stop camera: ${response.statusText}`);
    return response.json();
  },

  // Delete camera
  deleteCamera: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/cameras/${cameraId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete camera: ${response.statusText}`);
    return response.json();
  },
};

/**
 * PRIVACY ZONES API
 */
export const privacyAPI = {
  // Create privacy zone
  createPrivacyZone: async (zoneData) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/zones`, {
      method: 'POST',
      body: JSON.stringify(zoneData),
    });
    if (!response.ok) throw new Error(`Failed to create privacy zone: ${response.statusText}`);
    return response.json();
  },

  // Get privacy zones for camera
  getPrivacyZones: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/zones/${cameraId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch privacy zones: ${response.statusText}`);
    return response.json();
  },

  // Get privacy zone details
  getPrivacyZoneDetails: async (zoneId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/zones/${zoneId}/detail`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch zone details: ${response.statusText}`);
    return response.json();
  },

  // Update privacy zone
  updatePrivacyZone: async (zoneId, zoneData) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/zones/${zoneId}`, {
      method: 'PATCH',
      body: JSON.stringify(zoneData),
    });
    if (!response.ok) throw new Error(`Failed to update privacy zone: ${response.statusText}`);
    return response.json();
  },

  // Delete privacy zone
  deletePrivacyZone: async (zoneId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/zones/${zoneId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete privacy zone: ${response.statusText}`);
    return response.json();
  },

  // Apply zones to image for preview
  applyZonesToImage: async (imageData, zones) => {
    const formData = new FormData();
    formData.append('file', imageData);
    formData.append('zones', JSON.stringify(zones));

    const response = await fetchWithTimeout(`${API_ENDPOINT}/privacy/apply-to-image`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, browser will set it
      },
    });
    if (!response.ok) throw new Error(`Failed to apply zones: ${response.statusText}`);
    return response.blob();
  },
};

/**
 * TRUSTED PERSONS API
 */
export const trustedPersonAPI = {
  // Add trusted person with face image
  addTrustedPerson: async (name, imageData) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', imageData);

    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/add-person`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
      },
    });
    if (!response.ok) throw new Error(`Failed to add trusted person: ${response.statusText}`);
    return response.json();
  },

  // Get all trusted persons
  getTrustedPersons: async () => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/list`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch trusted persons: ${response.statusText}`);
    return response.json();
  },

  // Get trusted person details
  getTrustedPersonDetails: async (personId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/${personId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch person details: ${response.statusText}`);
    return response.json();
  },

  // Check if face is trusted
  checkTrustedFace: async (imageData) => {
    const formData = new FormData();
    formData.append('file', imageData);

    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/check-face`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type for FormData
      },
    });
    if (!response.ok) throw new Error(`Failed to check face: ${response.statusText}`);
    return response.json();
  },

  // Delete trusted person
  deleteTrustedPerson: async (personId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/${personId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete trusted person: ${response.statusText}`);
    return response.json();
  },

  // Search trusted persons by name
  searchTrustedPersons: async (name) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/trusted/search/${name}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to search trusted persons: ${response.statusText}`);
    return response.json();
  },
};

/**
 * STATISTICS API
 */
export const statsAPI = {
  // Get camera statistics
  getCameraStats: async (cameraId) => {
    const response = await fetchWithTimeout(`${API_ENDPOINT}/stats/camera/${cameraId}`, {
      method: 'GET',
    });
    if (!response.ok) throw new Error(`Failed to fetch camera stats: ${response.statusText}`);
    return response.json();
  },
};

/**
 * HEALTH CHECK
 */
export const healthCheck = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
};

export default {
  alertsAPI,
  privacyAPI,
  trustedPersonAPI,
  statsAPI,
  camerasAPI,
  healthCheck,
};
