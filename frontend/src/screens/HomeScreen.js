import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Bell, TrendingUp, Shield, ChevronRight, Home, BarChart2, User, Plus, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';
import { useGlobalContext } from '../context/GlobalContext';

import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { camerasAPI } from '../services/api';

export default function HomeScreen({ navigation }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [userName, setUserName] = useState('User');
  const [greetingKey, setGreetingKey] = useState('goodMorning');
  const [dateTimeStr, setDateTimeStr] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const { dashStats, alerts, cameras, latestAlert } = useGlobalContext();
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  
  const onlineCameras = (cameras || []).filter(c => c.status === 'online');
  const activeCount = onlineCameras.length;
  
  const primaryCamera = cameras 
    ? (cameras.find(c => c.id === selectedCameraId) || onlineCameras[0] || cameras[0] || null)
    : null;

  const homeAlerts = React.useMemo(() => {
    return (alerts || []).slice(0, 3).map(alert => ({
      id: alert.id,
      title: alert.anomaly_type || alert.title,
      loc: `${alert.camera_name || 'Camera'} • ${new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      conf: `${Math.round((alert.confidence || 0) * 100)}%`,
      color: alert.color || (alert.confidence > 0.8 ? '#FF5252' : '#FFD600'),
    }));
  }, [alerts]);
  
  // Real-time Popup State
  const [popupAlert, setPopupAlert] = useState(null);
  const popupAnim = React.useRef(new Animated.Value(-100)).current;

  const { t } = useTranslation(selectedLang);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');

  const [cameraMode, setCameraMode] = useState('ip'); // 'ip' or 'quick'
  const [quickTestCameraId, setQuickTestCameraId] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const cameraRef = React.useRef(null);

  const startCamera = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (cameraMode === 'quick') {
        // Start Quick Test Mode (Backend Default Webcam 0)
        const response = await fetch(`${API_URL}/api/cameras/start`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setQuickTestCameraId(data.camera_id);
          setCameraActive(true);
        } else {
          alert('Failed to start Quick Test camera.');
        }
      } else {
        // Start IP Camera Mode
        if (!primaryCamera) {
          alert('No IP Camera selected. Add one in the Cameras page or switch to Quick Test mode.');
          return;
        }
        await camerasAPI.startCamera(primaryCamera.id);
        setCameraActive(true);
      }
    } catch (e) {
      console.error("Failed to start camera:", e);
      alert('Network error while starting camera.');
    }
  };

  const stopCamera = async () => {
    try {
      if (cameraMode === 'quick' && quickTestCameraId) {
        await camerasAPI.stopCamera(quickTestCameraId);
      } else if (primaryCamera) {
        await camerasAPI.stopCamera(primaryCamera.id);
      }
    } catch (e) {
      console.error("Failed to stop backend camera:", e);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    // 1. Fetch User Name and Language Preference whenever the screen gains focus
    const unsubscribe = navigation.addListener('focus', () => {
      const loadLocalData = async () => {
        try {
          const storedLang = await AsyncStorage.getItem('userLanguage');
          if (storedLang) {
            setSelectedLang(storedLang);
          }
          
          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.displayName) {
              setUserName(userData.displayName.split(' ')[0]);
            } else if (userData.email) {
              setUserName(userData.email.split('@')[0]);
            }
          }
        } catch (e) {
          console.error('Failed to load local settings', e);
        }
      };
      loadLocalData();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // 2. Update Greeting Key and Date/Time
    const updateTime = () => {
      const now = new Date();
      
      const hour = now.getHours();
      if (hour < 12) setGreetingKey('goodMorning');
      else if (hour < 17) setGreetingKey('goodAfternoon');
      else if (hour < 20) setGreetingKey('goodEvening');
      else setGreetingKey('goodNight');

      const options = { weekday: 'long', month: 'long', day: 'numeric' };
      const dateStr = now.toLocaleDateString(undefined, options);
      
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      const minutes = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
      const timeStr = `${hours}:${minutes} ${ampm}`;

      setDateTimeStr(`${dateStr} • ${timeStr}`);
    };

    updateTime();
    const timer = setInterval(updateTime, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (latestAlert) {
      // Determine Category & Color
      let categoryColor = '#FFD600'; // Suspicious Activity
      if (['weapon', 'fight'].includes(latestAlert.anomaly_type?.toLowerCase() || '')) categoryColor = '#FF5252'; // Critical
      else if (['fall', 'fire'].includes(latestAlert.anomaly_type?.toLowerCase() || '')) categoryColor = '#FF3D00'; // Emergency
      
      // Display Popup Notification
      setPopupAlert({
          title: (latestAlert.anomaly_type || 'Alert').toUpperCase(),
          desc: `${latestAlert.camera_name || 'Camera'} • Conf: ${Math.round((latestAlert.confidence || 0) * 100)}%`,
          color: categoryColor
      });
      
      // Slide down
      Animated.timing(popupAnim, {
          toValue: 20,
          duration: 300,
          useNativeDriver: true
      }).start();
      
      // Hide after 4 seconds
      setTimeout(() => {
          Animated.timing(popupAnim, {
              toValue: -150,
              duration: 300,
              useNativeDriver: true
          }).start(() => setPopupAlert(null));
      }, 4000);
    }
  }, [latestAlert, popupAnim]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Real-time Popup Overlay */}
      {popupAlert && (
          <Animated.View style={[styles.popupContainer, { transform: [{ translateY: popupAnim }], borderLeftColor: popupAlert.color }]}>
              <View style={[styles.popupIconContainer, { backgroundColor: popupAlert.color + '20' }]}>
                  <AlertTriangle size={24} color={popupAlert.color} />
              </View>
              <View style={styles.popupText}>
                  <Text style={[styles.popupTitle, { color: popupAlert.color }]}>VigilAI ALERT: {popupAlert.title}</Text>
                  <Text style={styles.popupDesc}>{popupAlert.desc}</Text>
              </View>
          </Animated.View>
      )}
    
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t(greetingKey)}, {userName}</Text>
            <Text style={styles.date}>{dateTimeStr}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('ProfileTab')}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* System Status Card */}
        {(() => {
          let statusText = 'Offline';
          let statusColor = '#FF5252';
          
          if (activeCount > 0) {
            statusText = 'Waiting for Camera';
            statusColor = '#FFD600';
            
            if (cameraActive) {
              statusText = 'Monitoring';
              statusColor = '#00C853';
            }
            if (popupAlert) {
              statusText = 'Threat Detected';
              statusColor = '#FF5252';
            }
          }
          
          return (
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
              <Text style={styles.uptime}>{activeCount > 0 ? 'uptime: 99.8%' : 'All cameras are offline'}</Text>
              <View style={styles.checkIcon}>
                <Shield size={20} color={statusColor} />
              </View>
            </View>
          );
        })()}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox 
            icon={<Camera size={20} color={activeCount > 0 ? "#00E5FF" : "#94A3B8"} />} 
            value={activeCount.toString()} 
            label="Active Cameras" 
          />
          <StatBox 
            icon={<Bell size={20} color={dashStats.alerts_today > 0 ? "#FF5252" : "#94A3B8"} />} 
            value={dashStats.alerts_today?.toString() || "0"} 
            label="Detection Count" 
          />
          <StatBox 
            icon={<TrendingUp size={20} color={latestAlert ? "#00C853" : "#94A3B8"} />} 
            value={latestAlert ? `${Math.round((latestAlert.confidence || 0) * 100)}%` : "No Detection Yet"} 
            label={latestAlert ? (latestAlert.anomaly_type || 'Alert').toUpperCase() : "Confidence"} 
          />
        </View>

        {/* Recent Alerts Section */}
        <SectionHeader title={t('recentAlerts')} action={t('viewAlerts')} onPress={() => navigation.navigate('AlertsTab')} />
        {homeAlerts.length === 0 ? (
          <Text style={{ color: '#94A3B8', textAlign: 'center', marginVertical: 15 }}>No active alerts.</Text>
        ) : (
          homeAlerts.map(alert => (
            <AlertItem 
              key={alert.id}
              color={alert.color} 
              title={alert.title} 
              loc={alert.loc} 
              onPress={() => navigation.navigate('AlertDetails', { alert: { title: alert.title, camera: `Camera ${alert.camera_id}`, time: alert.loc, conf: alert.conf, color: alert.color }})} 
            />
          ))
        )}

        {/* Camera Mode Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, cameraMode === 'quick' && styles.toggleBtnActive]}
            onPress={() => setCameraMode('quick')}
          >
            <Text style={[styles.toggleText, cameraMode === 'quick' && styles.toggleTextActive]}>Device Camera (Quick Test)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, cameraMode === 'ip' && styles.toggleBtnActive]}
            onPress={() => setCameraMode('ip')}
          >
            <Text style={[styles.toggleText, cameraMode === 'ip' && styles.toggleTextActive]}>IP Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Live Feed Preview */}
        <SectionHeader 
          title={t('liveFeedPreview')} 
          action={cameraActive ? "Stop Camera" : "Start Camera"}
          onPress={cameraActive ? stopCamera : startCamera}
        />
        
        {/* Camera Selector UI - Only show in IP mode */}
        {(cameraMode === 'ip' && cameras && cameras.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
            {cameras.map(cam => {
              const isSelected = primaryCamera && primaryCamera.id === cam.id;
              const isOnline = cam.status === 'online';
              return (
                <TouchableOpacity 
                  key={cam.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 10,
                    backgroundColor: isSelected ? '#00E5FF' : '#1E293B',
                    borderWidth: 1,
                    borderColor: isSelected ? '#00E5FF' : '#334155',
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: isOnline ? 1 : 0.6
                  }}
                  onPress={() => setSelectedCameraId(cam.id)}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isOnline ? '#00C853' : '#FF5252', marginRight: 8 }} />
                  <Text style={{ color: isSelected ? '#000' : '#FFF', fontWeight: 'bold' }}>{cam.camera_name}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#00E5FF', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={startCamera}>
            <Text style={{ fontWeight: 'bold', color: '#000' }}>Start Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={stopCamera}>
            <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Stop Camera</Text>
          </TouchableOpacity>
        </View>

        <LiveCameraFeed 
          cameraActive={cameraActive}
          primaryCamera={primaryCamera}
          cameraRef={cameraRef}
          API_URL={API_URL}
        />


        {/* Quick Actions */}
        <View style={styles.actionGrid}>
          <ActionButton onPress={() => navigation.navigate('EmergencySOS')} color="#FF5252" icon={<Shield size={20} color="#FF5252" />} label={t('emergencySos')} />
          <ActionButton onPress={() => navigation.navigate('AddCamera')} color="#00BFA5" icon={<Plus size={20} color="#00BFA5" />} label={t('addCamera')} />
          <ActionButton onPress={() => navigation.navigate('AlertsTab')} color="#94A3B8" icon={<Bell size={20} color="#FFF" />} label={t('viewAlerts')} />
        </View>

      </ScrollView>


    </SafeAreaView>
  );
}

// Sub-components to keep code clean

const LiveCameraFeed = React.memo(({ cameraActive, primaryCamera, cameraMode, quickTestCameraId, API_URL }) => {
  if (!cameraActive) {
    return (
      <View style={[styles.liveCard, { justifyContent: 'center', alignItems: 'center', height: 400 }]}>
        <Camera size={40} color="#94A3B8" style={{ marginBottom: 15 }} />
        <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Camera Off</Text>
        <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 5 }}>Click Start Camera</Text>
      </View>
    );
  }
  
  if (cameraMode === 'quick') {
    if (!quickTestCameraId) return null;
    return (
      <View style={styles.liveCard}>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>TEST LIVE</Text></View>
        <View style={{ height: 400, overflow: 'hidden' }}>
          {Platform.OS === 'web' ? (
            <img
              src={`${API_URL}/api/cameras/${quickTestCameraId}/stream`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              alt="Live Feed"
            />
          ) : (
            <WebView 
              source={{ uri: `${API_URL}/api/cameras/${quickTestCameraId}/stream` }} 
              style={{ width: '100%', height: '100%', backgroundColor: '#0F172A' }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
            />
          )}
        </View>
        <View style={styles.liveFooter}>
          <Text style={styles.cameraName}>Device Camera (Quick Test)</Text>
          <Text style={styles.cameraStatus}>Active</Text>
        </View>
      </View>
    );
  }
  
  if (primaryCamera) {
    if (primaryCamera.status === 'offline') {
      return (
        <View style={[styles.liveCard, { justifyContent: 'center', alignItems: 'center', height: 400 }]}>
          <AlertTriangle size={40} color="#FF5252" style={{ marginBottom: 15 }} />
          <Text style={{ color: '#FF5252', fontSize: 16, fontWeight: 'bold', textAlign: 'center', paddingHorizontal: 20 }}>
            {primaryCamera.camera_name ? primaryCamera.camera_name.toUpperCase() : 'CAMERA'} IS OFFLINE
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 10, textAlign: 'center' }}>
            Please check your IP Webcam app and ensure it is running.
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.liveCard}>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
        
        <View style={{ height: 400, overflow: 'hidden' }}>
          {Platform.OS === 'web' ? (
            <img
              src={`${API_URL}/api/cameras/${primaryCamera.id}/stream`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
              alt="Live Feed"
            />
          ) : (
            <WebView 
              source={{ uri: `${API_URL}/api/cameras/${primaryCamera.id}/stream` }} 
              style={{ width: '100%', height: '100%', backgroundColor: '#0F172A' }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scrollEnabled={false}
            />
          )}
        </View>

        <View style={styles.liveFooter}>
          <Text style={styles.cameraName}>{primaryCamera.camera_name}</Text>
          <Text style={styles.cameraStatus}>Active</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.liveCard, { justifyContent: 'center', alignItems: 'center', height: 400 }]}>
      <Camera size={40} color="#94A3B8" style={{ marginBottom: 15 }} />
      <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>No Camera Configured</Text>
      <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 5, textAlign: 'center', paddingHorizontal: 20 }}>
        Please select a camera mode above and add an IP camera if needed.
      </Text>
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.cameraActive === nextProps.cameraActive &&
    prevProps.primaryCamera?.id === nextProps.primaryCamera?.id &&
    prevProps.primaryCamera?.status === nextProps.primaryCamera?.status
  );
});

const StatBox = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    {icon}
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SectionHeader = ({ title, action, onPress }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.sectionAction}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const AlertItem = ({ color, title, loc, onPress }) => (
  <TouchableOpacity style={styles.alertItem} onPress={onPress}>
    <View style={[styles.alertDot, { backgroundColor: color }]} />
    <View style={{ flex: 1 }}>
      <Text style={styles.alertTitle}>{title}</Text>
      <Text style={styles.alertLoc}>{loc}</Text>
    </View>
    <ChevronRight size={18} color="#94A3B8" />
  </TouchableOpacity>
);

const ActionButton = ({ onPress, color, icon, label }) => (
  <TouchableOpacity onPress={onPress} style={[styles.actionBtn, { borderColor: color + '40' }]}> 
    {icon}
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    {icon}
    <Text style={[styles.tabLabel, active && { color: '#00E5FF' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  scrollContent: { padding: 20, paddingBottom: 100, flexGrow: 1, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  greeting: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  date: { color: '#94A3B8', fontSize: 14 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#00BFA5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontWeight: 'bold', color: '#FFF' },
  statusCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 25, position: 'relative' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00C853', marginRight: 8 },
  statusText: { color: '#FFF', fontWeight: '600' },
  uptime: { color: '#94A3B8', fontSize: 12 },
  checkIcon: { position: 'absolute', right: 20, top: 25 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 30 },
  statBox: { flex: 1, backgroundColor: '#161B29', borderRadius: 15, padding: 15, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginVertical: 5 },
  statLabel: { color: '#94A3B8', fontSize: 10, textAlign: 'center' },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#161B29', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: '#0F172A' },
  toggleText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  toggleTextActive: { color: '#00E5FF' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  sectionAction: { color: '#00E5FF', fontSize: 14 },
  alertItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, padding: 15, marginBottom: 10 },
  alertDot: { width: 10, height: 10, borderRadius: 5, marginRight: 15 },
  alertTitle: { color: '#FFF', fontWeight: '600' },
  alertLoc: { color: '#94A3B8', fontSize: 12 },
  liveCard: { backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden', marginBottom: 25 },
  videoPlaceholder: { height: 180, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  liveBadge: { position: 'absolute', top: 15, left: 15, zIndex: 10, backgroundColor: '#FF5252', flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, alignItems: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 5 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  liveFooter: { padding: 15 },
  cameraName: { color: '#FFF', fontWeight: 'bold' },
  cameraStatus: { color: '#94A3B8', fontSize: 12 },
  actionGrid: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 80, borderRadius: 15, borderWidth: 1, backgroundColor: '#161B29', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionLabel: { fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 30, 
    paddingVertical: 15, 
    borderTopWidth: 1, 
    borderColor: '#1E293B', 
    backgroundColor: '#0F172A' 
  },
  popupContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    backgroundColor: '#161B29',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3E',
    borderLeftWidth: 4,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 20
  },
  popupIconContainer: {
      width: 40, height: 40, borderRadius: 20,
      justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  popupText: { flex: 1 },
  popupTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  popupDesc: { fontSize: 13, color: '#94A3B8' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
