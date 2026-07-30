import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { camerasAPI, alertsAPI } from '../services/api';

const GlobalContext = createContext();

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};

export const GlobalProvider = ({ children }) => {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [dashStats, setDashStats] = useState({
    activeCameras: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    systemStatus: 'Optimal'
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef(null);
  const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');

  const fetchGlobalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      try {
        const camData = await camerasAPI.getCameras();
        setCameras(camData || []);
      } catch (e) {
        console.error("GlobalContext: Failed to fetch cameras", e);
      }
      
      try {
        const alertData = await alertsAPI.getActiveAlerts();
        setAlerts(alertData || []);
      } catch (e) {
        console.error("GlobalContext: Failed to fetch alerts", e);
      }
      
      if (token) {
        try {
          const statsRes = await fetch(`${API_URL}/api/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setDashStats(statsData);
          }
        } catch (e) {
          console.error("GlobalContext: Failed to fetch dash stats", e);
        }
      }
    } catch (e) {
      console.error("GlobalContext: Initialization failed", e);
    } finally {
      setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchGlobalData();

    const wsHost = API_URL.replace('http://', '').replace('https://', '').split('/')[0];
    const finalWsUrl = "ws://" + wsHost + "/api/ws/alerts";

    wsRef.current = new WebSocket(finalWsUrl);

    wsRef.current.onopen = () => {
      console.log('GlobalContext: WebSocket connected for real-time updates');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'NEW_ALERT') {
          const incomingAlert = message.alert || message;
          setAlerts(prev => [incomingAlert, ...prev]);
          setLatestAlert(incomingAlert);
          setDashStats(prev => ({
            ...prev,
            alerts_today: (prev.alerts_today || 0) + 1,
            totalAlerts: (prev.totalAlerts || 0) + 1,
            criticalAlerts: message.color === '#EF4444' ? (prev.criticalAlerts || 0) + 1 : prev.criticalAlerts
          }));
        } else if (message.type === 'CAMERA_STATUS_CHANGED') {
          setCameras(prev => {
            const updated = prev.map(c => c.id === message.camera_id ? { ...c, status: message.status } : c);
            const activeCount = updated.filter(c => c.status === 'online').length;
            setDashStats(statsPrev => ({
              ...statsPrev,
              active_cameras: activeCount
            }));
            return updated;
          });
        }
      } catch (e) {
        console.error('GlobalContext: WebSocket message error', e);
      }
    };

    wsRef.current.onclose = () => {
      console.log('GlobalContext: WebSocket disconnected');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchGlobalData, API_URL]);

  const addCamera = async (cameraData) => {
    try {
      const newCamera = await camerasAPI.addCamera(cameraData);
      setCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (e) {
      throw e;
    }
  };

  const removeCamera = async (cameraId) => {
    try {
      await camerasAPI.deleteCamera(cameraId);
      setCameras(prev => prev.filter(c => c.id.toString() !== cameraId.toString()));
    } catch (e) {
      throw e;
    }
  };

  const refreshGlobalData = () => {
    fetchGlobalData();
  };

  const value = {
    cameras,
    alerts,
    dashStats,
    latestAlert,
    isLoading,
    addCamera,
    removeCamera,
    refreshGlobalData
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

