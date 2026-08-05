import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, MoreVertical, PlayCircle, Clock, AlertCircle, CheckCircle } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';
import { useGlobalContext } from '../context/GlobalContext';

export default function VideoDetectionScreen({ navigation }) {
  const { videos, alerts, removeVideo, isLoading } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0E17" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Video Detection</Text>
        <TouchableOpacity style={styles.plusIconBtn} onPress={() => navigation.navigate('AddCamera')}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Video List */}
        <View style={styles.listContainer}>
          {isLoading && videos.length === 0 ? (
            <ActivityIndicator size="large" color="#00E5FF" style={{marginTop: 50}} />
          ) : (
            videos.filter(v => v.camera_name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 30}}>No videos found.</Text>
            ) : (
              videos.filter(v => v.camera_name.toLowerCase().includes(searchQuery.toLowerCase())).map(video => {
                const videoAlerts = alerts.filter(a => a.camera_id === video.id);
                const detectedTypes = [...new Set(videoAlerts.map(a => a.anomaly_type))];
                return (
                <VideoCard 
                  key={video.id}
                  id={video.id}
                  title={video.camera_name} 
                  status={video.status} 
                  location={video.location}
                  date={new Date(video.created_at).toLocaleDateString()}
                  detections={detectedTypes}
                  onPress={() => navigation.navigate('CameraDetails', { cameraId: video.id })}
                />
              )})
            )
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const VideoCard = ({ id, title, status, location, date, detections, onPress }) => {
  let StatusIcon = Clock;
  let statusColor = '#94A3B8';
  let statusText = 'Pending';

  if (status === 'processing') {
    StatusIcon = ActivityIndicator;
    statusColor = '#F59E0B';
    statusText = 'Processing...';
  } else if (status === 'completed') {
    StatusIcon = CheckCircle;
    statusColor = '#00C853';
    statusText = 'Analysis Complete';
    
    if (detections && detections.length > 0) {
      statusText = `Detected: ${detections.join(', ')}`;
      if (detections.some(d => ['WEAPON', 'FIRE', 'SMOKE'].includes(d.toUpperCase()))) {
         statusColor = '#FF5252';
         StatusIcon = AlertCircle;
      }
    } else {
      statusText = 'No anomalies detected';
    }
  } else if (status === 'failed') {
    StatusIcon = AlertCircle;
    statusColor = '#FF5252';
    statusText = 'Processing Failed';
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.thumbnailPlaceholder}>
        <PlayCircle size={32} color="#242C3E" />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
          <TouchableOpacity hitSlop={{top:10, bottom:10, left:10, right:10}}>
            <MoreVertical size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardSubtitle}>{location} • {date}</Text>
        
        <View style={styles.statusRow}>
          {status === 'processing' ? (
            <ActivityIndicator size="small" color={statusColor} style={{ marginRight: 6 }} />
          ) : (
            <StatusIcon size={14} color={statusColor} style={{ marginRight: 6 }} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, width: '100%' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  plusIconBtn: { backgroundColor: '#00E5FF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, width: '100%' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  listContainer: { gap: 15, marginBottom: 30 },
  
  card: { flexDirection: 'row', backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden', height: 110, borderWidth: 1, borderColor: '#242C3E' },
  thumbnailPlaceholder: { width: '30%', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, padding: 15, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  cardSubtitle: { color: '#94A3B8', fontSize: 13, marginVertical: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statusText: { fontSize: 13, fontWeight: '500' }
});
