import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, StatusBar, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '../context/GlobalContext';
import { useTranslation } from '../utils/translations';
import { Film, Upload, Bell, Activity, User, Shield, Target, AlertTriangle, Flame, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { videos, alerts, dashStats, isLoading, refreshGlobalData } = useGlobalContext();
  const [refreshing, setRefreshing] = useState(false);
  
  const API_URL = 'http://192.168.137.1:8000';

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshGlobalData();
    setRefreshing(false);
  };

  const processedCount = dashStats.processed_videos || 0;
  const totalAlerts = dashStats.total_alerts || 0;
  const avgConf = dashStats.avg_confidence || 0;
  
  const todaySummary = dashStats.today_summary || { WEAPON: 0, FIRE: 0, SMOKE: 0, PERSON: 0 };
  const recentVideos = videos.slice(0, 3);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('greeting')}</Text>
          <Text style={styles.subtitle}>Video Detection Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('ProfileTab')}>
          <User size={20} color="#00E5FF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor="#00E5FF" />}
      >
        {/* Main Upload CTA */}
        <TouchableOpacity 
          style={styles.uploadCard}
          onPress={() => navigation.navigate('AddCamera')}
        >
          <View style={styles.uploadIconContainer}>
            <Upload size={32} color="#000" />
          </View>
          <View style={styles.uploadTextContainer}>
            <Text style={styles.uploadTitle}>Upload New Video</Text>
            <Text style={styles.uploadSubtitle}>Run AI detection on a pre-recorded video</Text>
          </View>
        </TouchableOpacity>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatBox icon={<Film size={20} color="#00E5FF" />} value={videos.length.toString()} label="Uploaded Videos" />
          <StatBox icon={<Activity size={20} color="#00C853" />} value={processedCount.toString()} label="Processed" />
          <StatBox icon={<Bell size={20} color="#FF5252" />} value={totalAlerts.toString()} label="Total Alerts" />
          <StatBox icon={<Target size={20} color="#F59E0B" />} value={`${avgConf}%`} label="Avg Confidence" />
        </View>

        {/* Today's Detection Summary */}
        <SectionHeader title="Today's Detection Summary" />
        <View style={styles.summaryCard}>
          <SummaryItem icon={<AlertTriangle size={24} color="#FF5252" />} label="Weapon" count={todaySummary.WEAPON} />
          <SummaryItem icon={<Flame size={24} color="#FF9100" />} label="Fire" count={todaySummary.FIRE} />
          <SummaryItem icon={<Target size={24} color="#94A3B8" />} label="Smoke" count={todaySummary.SMOKE} />
          <SummaryItem icon={<User size={24} color="#00E5FF" />} label="Person" count={todaySummary.PERSON} />
        </View>

        {/* Recent Uploaded Videos Section */}
        <SectionHeader title="Uploaded Videos" action="View All" onPress={() => navigation.navigate('CamerasTab')} />
        {recentVideos.length === 0 ? (
          <Text style={styles.emptyText}>No videos uploaded yet.</Text>
        ) : (
          recentVideos.map(video => {
            const videoAlerts = alerts.filter(a => a.camera_id === video.id);
            const detectedTypes = [...new Set(videoAlerts.map(a => a.anomaly_type))];
            return (
            <VideoItem 
              key={video.id}
              title={video.camera_name}
              status={video.status}
              detections={detectedTypes}
              onPress={() => navigation.navigate('CameraDetails', { cameraId: video.id })}
            />
          )})
        )}

        {/* Recent Alerts Section */}
        <SectionHeader title="Recent Alerts" action="View All Alerts" onPress={() => navigation.navigate('AlertsTab')} />
        {alerts.length === 0 ? (
          <Text style={styles.emptyText}>No active alerts.</Text>
        ) : (
          alerts.slice(0, 5).map(alert => (
            <AlertItem 
              key={alert.id}
              alert={alert}
              baseUrl={API_URL}
              onPress={() => navigation.navigate('AlertDetails', { alert })}
              onDelete={async (id) => {
                try {
                  await api.alertsAPI.deleteAlert(id);
                  refreshGlobalData();
                } catch (e) {
                  // If it's already deleted (404), just refresh the UI
                  if (e.message && (e.message.includes('404') || e.message.includes('Status 404'))) {
                    refreshGlobalData();
                  } else {
                    console.error('Failed to delete alert', e);
                  }
                }
              }}
            />
          ))
        )}
        
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const SectionHeader = ({ title, action, onPress }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {action && (
      <TouchableOpacity onPress={onPress}>
        <Text style={styles.seeAll}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const StatBox = ({ icon, value, label }) => (
  <View style={styles.statBox}>
    <View style={styles.statIcon}>{icon}</View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const SummaryItem = ({ icon, label, count }) => (
  <View style={styles.summaryItem}>
    {icon}
    <Text style={styles.summaryCount}>{count}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const VideoItem = ({ title, status, detections, onPress }) => {
  let statusColor = '#94A3B8';
  if (status === 'completed') statusColor = '#00C853';
  if (status === 'processing') statusColor = '#F59E0B';
  if (status === 'failed') statusColor = '#FF5252';

  let detectionsText = '';
  if (detections && detections.length > 0) {
      let primary = detections.map(d => {
          if (!d) return 'Anomaly';
          let main = d.split(',').pop().trim();
          return main.charAt(0).toUpperCase() + main.slice(1).toLowerCase();
      });
      primary = [...new Set(primary)];
      detectionsText = primary.join(', ') + ' Detected';
  }

  return (
    <TouchableOpacity style={styles.videoItem} onPress={onPress}>
      <View style={styles.videoIconContainer}>
        <Film size={20} color="#00E5FF" />
      </View>
      <View style={styles.videoInfo}>
        <Text style={styles.videoTitle}>{title}</Text>
        {detectionsText ? <Text style={{color: '#FF5252', fontSize: 12, fontWeight: 'bold', marginBottom: 4}}>{detectionsText}</Text> : null}
        <Text style={[styles.videoStatus, { color: statusColor }]}>{status.toUpperCase()}</Text>
      </View>
    </TouchableOpacity>
  );
};

const AlertItem = ({ alert, baseUrl, onPress, onDelete }) => {
  const rawType = alert.anomaly_type || 'UNKNOWN';
  // If multiple detections like "PERSON,WEAPON", grab the most critical one
  const mainType = rawType.split(',').pop().trim();
  const formattedTitle = mainType.charAt(0).toUpperCase() + mainType.slice(1).toLowerCase() + ' Detection';
  
  const isDangerous = ['WEAPON', 'FIRE', 'SMOKE'].includes(mainType.toUpperCase());
  const color = isDangerous ? '#FF5252' : '#F59E0B';
  const confidence = Math.round((alert.confidence || 0) * 100);
  const timeStr = new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const imageUrl = alert.snapshot_path ? (alert.snapshot_path.startsWith('http') ? alert.snapshot_path : `${baseUrl}${alert.snapshot_path}`) : null;

  return (
    <TouchableOpacity style={styles.alertItem} onPress={onPress}>
      <View style={[styles.severityIndicator, { backgroundColor: color }]} />
      
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.alertThumb} resizeMode="cover" />
      ) : (
        <View style={styles.alertThumbPlaceholder}>
          <Shield size={24} color="#94A3B8" />
        </View>
      )}

      <View style={styles.alertContent}>
        <View style={styles.alertHeaderRow}>
          <Text style={styles.alertTitle}>{formattedTitle}</Text>
          <Text style={styles.alertTime}>{timeStr}</Text>
        </View>
        <Text style={styles.alertVideoName} numberOfLines={1}>Video: {alert.camera_name || 'N/A'}</Text>
        <View style={styles.alertFooterRow}>
          <Text style={[styles.alertSeverity, { color }]}>{isDangerous ? 'CRITICAL' : 'WARNING'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={styles.alertConf}>Conf: {confidence}%</Text>
            {onDelete && (
              <TouchableOpacity onPress={() => onDelete(alert.id)} style={{ padding: 4 }}>
                <Trash2 size={16} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  greeting: { color: '#94A3B8', fontSize: 14, marginBottom: 4 },
  subtitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  
  scrollContent: { paddingBottom: 20 },
  
  uploadCard: { flexDirection: 'row', backgroundColor: '#00E5FF', marginHorizontal: 20, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 20 },
  uploadIconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  uploadTextContainer: { flex: 1 },
  uploadTitle: { color: '#000', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  uploadSubtitle: { color: '#000', fontSize: 14, opacity: 0.8 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, marginBottom: 20, justifyContent: 'space-between' },
  statBox: { width: '47.5%', backgroundColor: '#161B29', borderRadius: 16, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#242C3E' },
  statIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statValue: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { color: '#94A3B8', fontSize: 13 },
  
  summaryCard: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#161B29', marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#242C3E' },
  summaryItem: { alignItems: 'center', width: '25%' },
  summaryCount: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  summaryLabel: { color: '#94A3B8', fontSize: 12 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  seeAll: { color: '#00E5FF', fontSize: 14, fontWeight: '500' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginHorizontal: 20, marginBottom: 20 },
  
  videoItem: { flexDirection: 'row', backgroundColor: '#161B29', marginHorizontal: 20, borderRadius: 12, padding: 15, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#242C3E' },
  videoIconContainer: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  videoInfo: { flex: 1 },
  videoTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  videoStatus: { fontSize: 12, fontWeight: 'bold' },

  alertItem: { flexDirection: 'row', backgroundColor: '#161B29', marginHorizontal: 20, borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#242C3E', alignItems: 'center' },
  severityIndicator: { width: 4, height: '100%' },
  alertThumb: { width: 70, height: 70, backgroundColor: '#000' },
  alertThumbPlaceholder: { width: 70, height: 70, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  alertContent: { flex: 1, padding: 12, justifyContent: 'center' },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  alertTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  alertTime: { color: '#94A3B8', fontSize: 12 },
  alertVideoName: { color: '#94A3B8', fontSize: 13, marginBottom: 6 },
  alertFooterRow: { flexDirection: 'row', justifyContent: 'space-between' },
  alertSeverity: { fontSize: 12, fontWeight: 'bold' },
  alertConf: { color: '#00E5FF', fontSize: 12, fontWeight: '500' }
});
