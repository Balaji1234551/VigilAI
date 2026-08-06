import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Linking, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Clock, CheckCircle, AlertCircle, Download, RotateCcw, Video as VideoIcon, FileText, Image as ImageIcon } from 'lucide-react-native';
import { useGlobalContext } from '../context/GlobalContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Video } from 'expo-av';

let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

export default function VideoDetailsScreen({ route, navigation }) {
  const { cameraId } = route.params;
  const { videos, removeVideo, alerts, refreshGlobalData } = useGlobalContext();
  const [video, setVideo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("Starting...");
  const [errorMsg, setErrorMsg] = useState("");
  
  const API_URL = 'http://192.168.137.1:8000';

  const processedVideoUrl = video ? `${API_URL}/static/processed/${video.id}_processed.mp4` : null;
  const WebPlayer = React.useMemo(() => {
    if (Platform.OS !== 'web' || !processedVideoUrl) return null;
    return React.createElement('video', {
      src: processedVideoUrl,
      controls: true,
      autoPlay: true,
      playsInline: true,
      style: { width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }
    });
  }, [processedVideoUrl]);

  useEffect(() => {
    if (videos && videos.length > 0) {
        const found = videos.find(v => v?.id?.toString() === cameraId?.toString());
        if (found) {
            setVideo(prev => JSON.stringify(prev) !== JSON.stringify(found) ? found : prev);
        }
    }
  }, [videos, cameraId]);

  useEffect(() => {
    let interval;
    if (video && video.status === 'processing') {
      interval = setInterval(async () => {
        try {
           const token = await AsyncStorage.getItem('userToken');
           const res = await fetch(`${API_URL}/api/cameras/${video.id}/progress`, {
             headers: { 'Authorization': `Bearer ${token}` }
           });
           if (res.ok) {
             const data = await res.json();
             setProgress(data.progress);
             if (data.stage) setStage(data.stage);
             if (data.error) setErrorMsg(data.error);
             
             if (data.status !== 'processing') {
                refreshGlobalData();
             }
           }
        } catch(e) {}
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [video]);

  const handleRetry = async () => {
     try {
         const token = await AsyncStorage.getItem('userToken');
         const res = await fetch(`${API_URL}/api/cameras/${video.id}/retry`, {
             method: 'POST',
             headers: { 'Authorization': `Bearer ${token}` }
         });
         if (res.ok) {
             refreshGlobalData();
             setProgress(0);
             setStage("Starting...");
             setErrorMsg("");
         }
     } catch (e) {
         if (Platform.OS === 'web') alert('Error: Failed to retry processing');
         else Alert.alert('Error', 'Failed to retry processing');
     }
  };

  if (!video) {
    return (
      <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft color="#FFF" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00E5FF" />
          <Text style={{color: '#94A3B8', marginTop: 10}}>Loading video details...</Text>
        </View>
      </View>
    );
  }

  const handleDelete = () => {
    if (Platform.OS === 'web') {
        if (window.confirm("Are you sure you want to delete this video?")) {
            removeVideo(video.id).then(() => navigation.goBack());
        }
    } else {
        Alert.alert("Delete Video", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
                await removeVideo(video.id);
                navigation.goBack();
            }}
        ]);
    }
  };

  const videoAlerts = (alerts || []).filter(a => a?.camera_id === video.id);

  let statusColor = '#94A3B8';
  let statusText = 'Pending Processing';
  
  if (video.status === 'processing') {
    statusColor = '#F59E0B';
    statusText = 'AI Analyzing...';
  } else if (video.status === 'completed') {
    statusColor = '#00C853';
    statusText = 'Detection Complete';
  } else if (video.status === 'failed') {
    statusColor = '#FF5252';
    statusText = 'Processing Failed';
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
        <style>
          body { margin: 0; background-color: #000; display: flex; justify-content: center; align-items: center; height: 100vh; }
          video { width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video controls autoplay playsinline>
          <source src="${processedVideoUrl}" type="video/mp4">
        </video>
      </body>
    </html>
  `;

  const renderScreenshots = () => {
      const screenshots = videoAlerts.filter(a => a.snapshot_path);
      if (screenshots.length === 0) return null;
      
      return (
          <View style={{marginVertical: 20}}>
            <Text style={styles.sectionTitle}>Detection Screenshots</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 15, paddingHorizontal: 20}}>
               {screenshots.map((alert, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.screenshotBox} 
                    onPress={() => navigation.navigate('AlertDetails', { alert })}
                  >
                     <Image source={{uri: `${API_URL}${alert.snapshot_path}`}} style={styles.screenshotImg} resizeMode="cover" />
                     <View style={styles.screenshotLabel}>
                        <Text style={{color: '#FFF', fontSize: 10, fontWeight: 'bold'}}>{alert.anomaly_type}</Text>
                     </View>
                  </TouchableOpacity>
               ))}
            </ScrollView>
          </View>
      );
  };

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{video.camera_name || 'Video Details'}</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
          <Trash2 color="#FF5252" size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* Video Player or Progress UI */}
        <View style={styles.playerContainer}>
          {video.status === 'completed' && Platform.OS !== 'web' ? (
            <Video
                source={{ uri: processedVideoUrl }}
                style={{ flex: 1, backgroundColor: '#000' }}
                useNativeControls
                resizeMode="contain"
                isLooping
            />
          ) : video.status === 'completed' && Platform.OS === 'web' ? (
            WebPlayer
          ) : (
            <View style={styles.playerPlaceholder}>
               {video.status === 'processing' ? (
                 <View style={{alignItems: 'center', width: '80%'}}>
                   <ActivityIndicator size="large" color="#F59E0B" />
                   <Text style={[styles.placeholderText, { color: '#F59E0B' }]}>{stage} {progress > 0 ? progress : 0}%</Text>
                   <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progress > 0 ? progress : 0}%` }]} />
                   </View>
                   <Text style={{color: '#94A3B8', marginTop: 15, textAlign: 'center'}}>Analyzing video with YOLOv8 & MediaPipe</Text>
                 </View>
               ) : video.status === 'failed' ? (
                 <View style={{alignItems: 'center'}}>
                   <AlertCircle size={48} color={statusColor} />
                   <Text style={[styles.placeholderText, { color: statusColor, marginTop: 10, fontSize: 18 }]}>Processing Failed</Text>
                   {errorMsg ? <Text style={{color: '#FF5252', marginTop: 10, textAlign: 'center', marginHorizontal: 20}}>{errorMsg}</Text> : null}
                   <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                      <RotateCcw color="#FFF" size={16} />
                      <Text style={{color: '#FFF', fontWeight: 'bold', marginLeft: 8}}>Retry Processing</Text>
                   </TouchableOpacity>
                 </View>
               ) : (
                 <View style={{alignItems: 'center'}}>
                   <Clock size={40} color={statusColor} />
                   <Text style={[styles.placeholderText, { color: statusColor, marginTop: 10 }]}>{statusText}</Text>
                 </View>
               )}
            </View>
          )}
        </View>

        {/* Downloads */}
        {video.status === 'completed' && (
          <View style={styles.downloadsContainer}>

            <TouchableOpacity style={styles.downloadBtnPrimary} onPress={async () => {
              const token = await AsyncStorage.getItem('userToken');
              Linking.openURL(`${API_URL}/api/cameras/${video.id}/report?token=${token}`);
            }}>
              <FileText color="#000" size={20} />
              <Text style={styles.downloadBtnPrimaryText}>Detection Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Detailed Summary */}
        {video.status === 'completed' && (
        <View style={styles.summaryContainer}>
            <Text style={styles.sectionTitle}>Detection Summary</Text>
            <View style={styles.detailsBox}>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Processing Status</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <CheckCircle size={14} color={statusColor} style={{marginRight: 5}} />
                    <Text style={[styles.value, {color: statusColor}]}>{statusText}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>AI Models Used</Text>
                <Text style={styles.value}>YOLOv8 + MediaPipe</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Processing Time</Text>
                <Text style={styles.value}>{video.processing_duration ? video.processing_duration.toFixed(1) + ' sec' : 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.label}>Frames Analyzed</Text>
                <Text style={styles.value}>{video.total_frames || 0} frames</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Detected Objects</Text>
            <View style={styles.detailsBox}>
              {video.object_counts && Object.keys(video.object_counts).length > 0 ? (
                  Object.keys(video.object_counts).map((key, i) => (
                      <View style={styles.detailRow} key={i}>
                         <Text style={styles.label}>{key}</Text>
                         <Text style={styles.value}>{video.object_counts[key]} detections</Text>
                      </View>
                  ))
              ) : (
                  <Text style={{color: '#94A3B8', textAlign: 'center', paddingVertical: 10}}>No objects tracked.</Text>
              )}
              {video.avg_confidence > 0 && (
                 <View style={[styles.detailRow, { borderBottomWidth: 0, marginTop: 10 }]}>
                    <Text style={styles.label}>Average Confidence</Text>
                    <Text style={{color: '#00E5FF', fontWeight: 'bold'}}>{Math.round(video.avg_confidence * 100)}%</Text>
                 </View>
              )}
            </View>
        </View>
        )}

        {/* Screenshots Gallery */}
        {video.status === 'completed' && renderScreenshots()}

        {/* Timeline */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detection Timeline</Text>
        </View>
        
        {videoAlerts.length === 0 ? (
          <Text style={styles.emptyText}>
            {video.status === 'completed' ? 'No anomalies detected in this video.' : 'Waiting for processing to finish...'}
          </Text>
        ) : (
          <View style={styles.timeline}>
            {videoAlerts.map((alert, index) => (
              <View key={alert.id || index} style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: alert.color || '#FF5252' }]} />
                <View style={styles.timelineContent}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                     <Text style={styles.timelineTitle}>{alert.anomaly_type}</Text>
                     {alert.snapshot_path && <ImageIcon size={16} color="#94A3B8" />}
                  </View>
                  <Text style={styles.timelineTime}>
                    {alert.alert_message && alert.alert_message.includes(':') 
                      ? `Time in Video: ${alert.alert_message}` 
                      : (alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'N/A')}
                  </Text>
                  <Text style={styles.timelineConf}>Confidence: {Math.round((alert.confidence || 0) * 100)}%</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', flex: 1, textAlign: 'center', paddingHorizontal: 10 },
  deleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 50 },
  
  playerContainer: { width: '100%', height: Platform.OS === 'web' ? 450 : undefined, aspectRatio: Platform.OS === 'web' ? undefined : 16/9, backgroundColor: '#000', marginBottom: 20 },
  playerPlaceholder: { flex: 1, height: Platform.OS === 'web' ? 450 : undefined, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#111827' },
  placeholderText: { color: '#FFF', fontSize: 16, marginTop: 15, fontWeight: 'bold' },
  
  progressBarBg: { width: '100%', height: 10, backgroundColor: '#1E293B', borderRadius: 5, marginTop: 20, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#F59E0B' },
  retryBtn: { flexDirection: 'row', backgroundColor: '#FF5252', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  
  downloadsContainer: { flexDirection: 'row', gap: 15, paddingHorizontal: 20, marginBottom: 25 },
  downloadBtnPrimary: { flex: 1, flexDirection: 'row', backgroundColor: '#00E5FF', borderRadius: 12, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' },
  downloadBtnPrimaryText: { color: '#000', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  downloadBtnSecondary: { flex: 1, flexDirection: 'row', backgroundColor: '#161B29', borderWidth: 1, borderColor: '#00E5FF', borderRadius: 12, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' },
  downloadBtnSecondaryText: { color: '#00E5FF', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },

  summaryContainer: { paddingHorizontal: 0 },
  detailsBox: { backgroundColor: '#161B29', marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#242C3E' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#242C3E' },
  label: { color: '#94A3B8', fontSize: 14 },
  value: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  
  sectionHeader: { marginHorizontal: 20, marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginLeft: 20 },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginHorizontal: 20, marginTop: 10 },
  
  timeline: { marginHorizontal: 20, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: '#242C3E' },
  timelineItem: { flexDirection: 'row', marginBottom: 20, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, position: 'absolute', left: -17, top: 4, borderWidth: 2, borderColor: '#0A0E17' },
  timelineContent: { flex: 1, backgroundColor: '#161B29', borderRadius: 12, padding: 15, marginLeft: 15, borderWidth: 1, borderColor: '#242C3E' },
  timelineTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timelineTime: { color: '#94A3B8', fontSize: 13, marginBottom: 2 },
  timelineConf: { color: '#00E5FF', fontSize: 13, fontWeight: '500' },

  screenshotBox: { width: 160, height: 100, borderRadius: 12, overflow: 'hidden', marginRight: 15, borderWidth: 1, borderColor: '#242C3E', backgroundColor: '#000', position: 'relative' },
  screenshotImg: { width: '100%', height: '100%' },
  screenshotLabel: { position: 'absolute', bottom: 5, left: 5, backgroundColor: 'rgba(255,82,82,0.9)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }
});
