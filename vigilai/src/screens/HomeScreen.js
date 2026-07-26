import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Platform, StatusBar, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Bell, TrendingUp, Shield, ChevronRight, Home, BarChart2, User, Plus, AlertTriangle } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';

import { WebView } from 'react-native-webview';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';

export default function HomeScreen({ navigation }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [userName, setUserName] = useState('User');
  const [greetingKey, setGreetingKey] = useState('goodMorning');
  const [dateTimeStr, setDateTimeStr] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const [homeAlerts, setHomeAlerts] = useState([]);
  const [dashStats, setDashStats] = useState({ active_cameras: 0, alerts_today: 0, avg_confidence: null, system_status: 'System Idle' });
  
  // Real-time Popup State
  const [popupAlert, setPopupAlert] = useState(null);
  const popupAnim = React.useRef(new Animated.Value(-100)).current;

  const { t } = useTranslation(selectedLang);

  const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');

  const [cameraActive, setCameraActive] = useState(false);
  const cameraRef = React.useRef(null);
  const isRecording = React.useRef(false);

  useEffect(() => {
    let active = true;

    const recordChunk = async () => {
      if (!active || !cameraRef.current || isRecording.current) return;
      
      isRecording.current = true;
      try {
        // Record a 3-second chunk of real video
        const video = await cameraRef.current.recordAsync({ maxDuration: 3 });
        if (video && video.uri && active) {
          const token = await AsyncStorage.getItem('userToken');
          
          let formData = new FormData();
          formData.append('file', {
            uri: video.uri,
            name: 'chunk.mp4',
            type: 'video/mp4'
          });

          fetch(`${API_URL}/api/detections/mobile-video`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          }).catch(e => console.log("Mobile video upload error:", e));
        }
      } catch(e) {
        console.log("Failed to record video chunk:", e);
      } finally {
        isRecording.current = false;
        // Instantly start the next chunk recording
        if (active) {
            setTimeout(recordChunk, 100);
        }
      }
    };

    if (cameraActive) {
      setTimeout(recordChunk, 1000); // Give camera 1s to initialize
    }

    return () => {
      active = false;
      if (isRecording.current && cameraRef.current) {
         cameraRef.current.stopRecording();
      }
    };
  }, [cameraActive, API_URL]);


  const startCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        alert('Camera permission is required to use this feature.');
        return;
      }
    }
    if (!micPermission?.granted) {
      const result = await requestMicPermission();
      if (!result.granted) {
        alert('Microphone permission is required for video streaming.');
        return;
      }
    }
    setCameraActive(true);
  };

  const stopCamera = () => {
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
    // 3. Fetch Initial Alerts
    const fetchInitialAlerts = async () => {
      try {
        const { alertsAPI } = require('../services/api');
        const data = await alertsAPI.getActiveAlerts();
        const recent = data.slice(0, 3).map(alert => ({
          id: alert.id,
          title: alert.anomaly_type,
          loc: `Camera ${alert.camera_id} • ${new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          conf: `${Math.round(alert.confidence * 100)}%`,
          color: alert.confidence > 0.8 ? '#FF5252' : '#FFD600',
        }));
        setHomeAlerts(recent);
      } catch (e) {
        console.error('Failed to fetch initial alerts', e);
      }
    };
    fetchInitialAlerts();

    // Fetch Dashboard Stats dynamically
    const fetchStats = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const res = await fetch(`${API_URL}/api/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDashStats(data);
          }
        }
      } catch (e) {
        console.error('Failed to fetch dashboard stats', e);
      }
    };
    fetchStats();
    const statsInterval = setInterval(fetchStats, 5000);

    // 4. Establish WebSocket for Real-Time Updates
    const wsUrl = Platform.OS === 'web' 
        ? 'ws://127.0.0.1:8000/api/ws/alerts' 
        : 'ws://10.202.212.80:8000/api/ws/alerts'; // Fallback Android IP if needed
        
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('Connected to VigilAI Real-Time WebSocket');
    
    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'NEW_ALERT') {
                const newAlert = message.alert;
                
                // Determine Category & Color
                let categoryColor = '#FFD600'; // Suspicious Activity
                if (['weapon', 'fight'].includes(newAlert.anomaly_type.toLowerCase())) categoryColor = '#FF5252'; // Critical
                else if (['fall', 'fire'].includes(newAlert.anomaly_type.toLowerCase())) categoryColor = '#FF3D00'; // Emergency
                
                // Display Popup Notification
                setPopupAlert({
                    title: newAlert.anomaly_type.toUpperCase(),
                    desc: `${newAlert.camera_name} • Conf: ${Math.round(newAlert.confidence * 100)}%`,
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
                
                // Prepend to Dashboard list dynamically
                setHomeAlerts(prev => {
                    const formatted = {
                        id: newAlert.id,
                        title: newAlert.anomaly_type,
                        loc: `${newAlert.camera_name} • ${new Date(newAlert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                        conf: `${Math.round(newAlert.confidence * 100)}%`,
                        color: categoryColor,
                    };
                    return [formatted, ...prev].slice(0, 3);
                });
            }
        } catch(e) {
            console.error('WS Parse Error', e);
        }
    };

    return () => {
      ws.close();
      clearInterval(statsInterval);
    };
  }, []);

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
    
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t(greetingKey)}, {userName}</Text>
            <Text style={styles.date}>{dateTimeStr}</Text>
          </View>
          <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* System Status Card */}
        {(() => {
          const activeCount = dashStats.active_cameras + (cameraActive ? 1 : 0);
          return (
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <View style={[styles.dot, activeCount === 0 && { backgroundColor: '#FF5252' }]} />
                <Text style={styles.statusText}>{activeCount > 0 ? t('allSystemsActive') : 'System Idle'}</Text>
              </View>
              <Text style={styles.uptime}>{activeCount > 0 ? 'uptime: 99.8%' : 'Waiting for Camera'}</Text>
              <View style={styles.checkIcon}>
                {activeCount > 0 ? <Shield size={20} color="#00C853" /> : <AlertTriangle size={20} color="#FF5252" />}
              </View>
            </View>
          );
        })()}

        {/* Stats Grid */}
        {(() => {
          const activeCount = dashStats.active_cameras + (cameraActive ? 1 : 0);
          return (
            <View style={styles.statsGrid}>
              <StatBox 
                icon={<Camera size={20} color={activeCount > 0 ? "#00E5FF" : "#94A3B8"} />} 
                value={activeCount > 0 ? activeCount : "0"} 
                label={activeCount > 0 ? t('activeCameras') : "No Active Cameras"} 
              />
              <StatBox 
                icon={<Bell size={20} color={activeCount > 0 ? "#FF5252" : "#94A3B8"} />} 
                value={activeCount > 0 ? dashStats.alerts_today : "0"} 
                label={activeCount > 0 ? t('alertsToday') : "No Detection Data"} 
              />
              <StatBox 
                icon={<TrendingUp size={20} color={activeCount > 0 && dashStats.avg_confidence !== null ? "#00C853" : "#94A3B8"} />} 
                value={activeCount > 0 && dashStats.avg_confidence !== null ? `${dashStats.avg_confidence}%` : "--"} 
                label={activeCount > 0 && dashStats.avg_confidence !== null ? t('avgConfidence') : "Confidence Unavailable"} 
              />
            </View>
          );
        })()}

        {/* Recent Alerts Section */}
        <SectionHeader title={t('recentAlerts')} action={t('viewAlerts')} onPress={() => navigation.navigate('Alerts')} />
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

        {/* Live Feed Preview */}
        <SectionHeader 
          title={t('liveFeedPreview')} 
          action={cameraActive ? "Stop Camera" : "Start Camera"}
          onPress={cameraActive ? stopCamera : startCamera}
        />
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 10 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#00E5FF', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={startCamera}>
            <Text style={{ fontWeight: 'bold', color: '#000' }}>Start Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#FF5252', padding: 12, borderRadius: 8, alignItems: 'center' }} onPress={stopCamera}>
            <Text style={{ fontWeight: 'bold', color: '#FFF' }}>Stop Camera</Text>
          </TouchableOpacity>
        </View>

        {!cameraActive ? (
          <View style={[styles.liveCard, { justifyContent: 'center', alignItems: 'center', height: 400 }]}>
            <Camera size={40} color="#94A3B8" style={{ marginBottom: 15 }} />
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: 'bold' }}>Camera Off</Text>
            <Text style={{ color: '#94A3B8', fontSize: 14, marginTop: 5 }}>Click Start Camera</Text>
          </View>
        ) : dashStats.active_cameras === 0 && false ? (
          <View style={[styles.liveCard, { justifyContent: 'center', alignItems: 'center', height: 400 }]}>
            <AlertTriangle size={40} color="#FF5252" style={{ marginBottom: 15 }} />
            <Text style={{ color: '#FF5252', fontSize: 16, fontWeight: 'bold' }}>CAMERA OFFLINE — RECONNECTING...</Text>
          </View>
        ) : (
          <View style={styles.liveCard}>
            <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
            
            {Platform.OS === 'web' ? (
              <img
                src={`${API_URL}/api/cameras/1/stream`}
                style={{ width: '100%', height: 400, objectFit: 'cover', pointerEvents: 'none' }}
                alt="Live Feed"
              />
            ) : (
              <View style={{ height: 400, overflow: 'hidden' }} pointerEvents="none">
                <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" mode="video" mute={true} />
              </View>
            )}

            <View style={styles.liveFooter}>
              <Text style={styles.cameraName}>Local Device Camera</Text>
              <Text style={styles.cameraStatus}>Active</Text>
            </View>
          </View>
        )}


        {/* Quick Actions */}
        <View style={styles.actionGrid}>
          <ActionButton onPress={() => navigation.navigate('EmergencySOS')} color="#FF5252" icon={<Shield size={20} color="#FF5252" />} label={t('emergencySos')} />
          <ActionButton onPress={() => navigation.navigate('AddCamera')} color="#00BFA5" icon={<Plus size={20} color="#00BFA5" />} label={t('addCamera')} />
          <ActionButton onPress={() => navigation.navigate('Alerts')} color="#94A3B8" icon={<Bell size={20} color="#FFF" />} label={t('viewAlerts')} />
        </View>

      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#00E5FF" />} label={t('home')} active />
        <TouchableOpacity onPress={() => navigation.navigate('Cameras')} style={styles.tabItem}>
          <Camera size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('cameras')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')} style={styles.tabItem}>
          <Bell size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('alerts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Analytics')} style={styles.tabItem}>
          <BarChart2 size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('analytics')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.tabItem}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Sub-components to keep code clean
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
  scrollContent: { padding: 20, paddingBottom: 100, flexGrow: 1 },
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
