import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { camerasAPI, alertsAPI } from '../services/api';

const GlobalContext = createContext();

export const useGlobalContext = () => {
  return useContext(GlobalContext);
};

export const GlobalProvider = ({ children }) => {
  const [videos, setVideos] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [latestAlert, setLatestAlert] = useState(null);
  const [dashStats, setDashStats] = useState({
    activeCameras: 0,
    totalAlerts: 0,
    criticalAlerts: 0,
    systemStatus: 'Optimal',
    totalVideosProcessed: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const API_URL = 'http://192.168.137.1:8000';

  const fetchGlobalData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setIsLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      try {
        const vidData = await camerasAPI.getCameras();
        setVideos(vidData || []);
        
        // Calculate total processed for dashboard
        const processed = (vidData || []).filter(v => v.status === 'completed').length;
        setDashStats(prev => ({ ...prev, totalVideosProcessed: processed }));
      } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("GlobalContext: Failed to fetch videos", e);
        }
      }
      
      try {
        const alertData = await alertsAPI.getActiveAlerts();
        setAlerts(alertData || []);
        if (alertData && alertData.length > 0) {
            setLatestAlert(alertData[0]);
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("GlobalContext: Failed to fetch alerts", e);
        }
      }
      
      if (token) {
        try {
          const statsRes = await fetch(`${API_URL}/api/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            setDashStats(prev => ({ ...prev, ...statsData }));
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
    fetchGlobalData(false);
    
    // Poll every 5 seconds for status updates since we removed WebSockets
    const interval = setInterval(() => {
        fetchGlobalData(true);
    }, 5000);
    
    // Instantly refresh when the user switches back to the app/web tab
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchGlobalData(true);
      }
    });
    
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [fetchGlobalData]);

  const addVideo = async (videoData) => {
    try {
      const newVideo = await camerasAPI.addCamera(videoData);
      setVideos(prev => [...prev, newVideo]);
      return newVideo;
    } catch (e) {
      throw e;
    }
  };

  const removeVideo = async (videoId) => {
    try {
      await camerasAPI.deleteCamera(videoId);
      setVideos(prev => prev.filter(c => c.id.toString() !== videoId.toString()));
    } catch (e) {
      throw e;
    }
  };

  const refreshGlobalData = () => {
    fetchGlobalData();
  };

  const value = {
    videos,
    alerts,
    dashStats,
    latestAlert,
    isLoading,
    addVideo,
    removeVideo,
    refreshGlobalData
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};
