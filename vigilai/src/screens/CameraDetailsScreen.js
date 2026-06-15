import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Download, Mic, Maximize, User, Home, Camera, Bell, BarChart2, ChevronRight } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { alertsAPI } from '../services/api';

export default function CameraDetailsScreen({ route, navigation }) {
  const { cameraName, cameraId = 1 } = route.params || { cameraName: 'Camera Details', cameraId: 1 };
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);
  const [cameraAlerts, setCameraAlerts] = useState([]);

  useEffect(() => {
    // Fetch initial alerts
    fetchCameraAlerts();

    // Poll every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchCameraAlerts();
    }, 3000);

    return () => clearInterval(interval);
  }, [cameraId]);

  const fetchCameraAlerts = async () => {
    try {
      const data = await alertsAPI.getCameraAlerts(cameraId);
      
      // Map backend alerts to the UI format
      const formattedAlerts = data.map((alert) => ({
        id: alert.id,
        title: alert.anomaly_type,
        time: new Date(alert.timestamp).toLocaleTimeString(),
        conf: `${Math.round(alert.confidence * 100)}%`,
        color: alert.confidence > 0.8 ? '#FF5252' : '#00E5FF',
      }));
      setCameraAlerts(formattedAlerts);
    } catch (error) {
      console.error('Failed to fetch real-time alerts:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{cameraName}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CameraSettings', { cameraName })} style={styles.settingsBtn}>
          <Settings color="#FFF" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Live Feed Card */}
        <View style={styles.liveCard}>
          {/* Top section: Video Feed */}
          <View style={styles.videoContainer}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
            
            {Platform.OS === 'web' ? (
              <img
                src={`http://localhost:8000/api/cameras/${cameraId}/stream`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                alt="Live Feed"
              />
            ) : (
              <WebView
                style={{ width: '100%', height: '100%', backgroundColor: '#0F172A' }}
                source={{ html: `
                  <html>
                    <body style="margin:0;padding:0;background-color:#0F172A;display:flex;justify-content:center;align-items:center;height:100vh;overflow:hidden;">
                      <img src="${Platform.OS === 'android' ? 'http://10.241.125.80:8000' : 'http://localhost:8000'}/api/cameras/${cameraId}/stream" style="width:100%;height:100%;object-fit:cover;" />
                    </body>
                  </html>
                `}}
                scrollEnabled={false}
              />
            )}
          </View>
          
          {/* Bottom section: Video Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity><Download size={20} color="#94A3B8" /></TouchableOpacity>
            
            {/* Record Button (Cyan Circle) */}
            <TouchableOpacity style={styles.recordOuter}>
              <View style={styles.recordInner} />
            </TouchableOpacity>
            
            <TouchableOpacity><Mic size={20} color="#94A3B8" /></TouchableOpacity>
            <TouchableOpacity><Maximize size={20} color="#94A3B8" /></TouchableOpacity>
          </View>
        </View>

        {/* AI Detection Toggle */}
        <View style={styles.toggleCard}>
          <View>
            <Text style={styles.toggleTitle}>AI Detection</Text>
            <Text style={styles.toggleSubtitle}>Real-time anomaly detection</Text>
          </View>
          <Switch 
            value={aiDetectionEnabled} 
            onValueChange={setAiDetectionEnabled}
            trackColor={{ false: '#242C3E', true: '#00E5FF55' }}
            thumbColor={aiDetectionEnabled ? '#00E5FF' : '#94A3B8'}
          />
        </View>

        {/* Recent Alerts List */}
        <Text style={styles.sectionTitle}>Real-time Alerts</Text>
        <View style={styles.alertList}>
          {cameraAlerts.length === 0 ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginTop: 10 }}>No recent alerts detected.</Text>
          ) : (
            cameraAlerts.map((alert) => (
              <TouchableOpacity key={alert.id} style={styles.alertItem}>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertTitle}>{alert.title}</Text>
                  <Text style={styles.alertTime}>{alert.time}</Text>
                </View>
                <Text style={[styles.alertConf, { color: alert.color }]}>{alert.conf}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.tabItem}>
          <Home size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Cameras')} style={styles.tabItem}>
          <Camera size={24} color="#00E5FF" />
          <Text style={[styles.tabLabel, { color: '#00E5FF' }]}>Cameras</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Analytics')}>
          <BarChart2 size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  settingsBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 20 },
  liveCard: { backgroundColor: '#161B29', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
  videoContainer: { height: 350, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  liveBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: '#FF1744', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15, zIndex: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF', marginRight: 5 },
  liveText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  detectionOverlay: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  boundingBox: { width: 100, height: 160, borderWidth: 1, borderColor: '#00C853', borderStyle: 'dashed', position: 'absolute' },
  detectionLabel: { position: 'absolute', top: -15, right: -60, color: '#00C853', fontSize: 10, fontWeight: 'bold' },
  silhouettePlaceholder: { opacity: 0.5 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 20, backgroundColor: '#161B29' },
  recordOuter: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  recordInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0A0E17' },
  toggleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#1E293B' },
  toggleTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  toggleSubtitle: { color: '#94A3B8', fontSize: 12 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  alertList: { gap: 12 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#1E293B' },
  alertInfo: { flex: 1 },
  alertTitle: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  alertTime: { color: '#94A3B8', fontSize: 12 },
  alertConf: { fontWeight: 'bold', fontSize: 14 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
