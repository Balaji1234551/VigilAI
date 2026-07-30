import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Settings, Download, Mic, Maximize, User, Home, Camera, Bell, BarChart2, ChevronRight } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useGlobalContext } from '../context/GlobalContext';

export default function CameraDetailsScreen({ route, navigation }) {
  const { cameraName, cameraId = 1 } = route.params || { cameraName: 'Camera Details', cameraId: 1 };
  const [aiDetectionEnabled, setAiDetectionEnabled] = useState(true);
  const { alerts } = useGlobalContext();

  const cameraAlerts = React.useMemo(() => {
    return (alerts || [])
      .filter(a => String(a.camera_id) === String(cameraId))
      .map(alert => ({
        id: alert.id,
        title: alert.anomaly_type,
        time: new Date(alert.timestamp).toLocaleTimeString(),
        conf: `${Math.round((alert.confidence || 0) * 100)}%`,
        color: alert.confidence > 0.8 ? '#FF5252' : '#00E5FF',
      }));
  }, [alerts, cameraId]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
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
  liveCard: { backgroundColor: '#161B29', borderRadius: 20, borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
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
