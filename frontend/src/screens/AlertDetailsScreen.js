import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Play, Phone, Share2, CheckCircle, Home, Camera, Bell, BarChart2, User, Info } from 'lucide-react-native';

export default function AlertDetailsScreen({ route, navigation }) {
  const { alert } = route.params || { 
    alert: { 
      title: 'PACKAGE THEFT DETECTED', 
      camera: 'Front Porch', 
      time: 'Today, 2:30 PM', 
      conf: '94%', 
      model: 'YOLOv8 Object Detection',
      severity: 'Critical',
      status: 'Under Review',
      color: '#FF1744'
    } 
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );
}

// Sub-components
const DetailItem = ({ label, value, valueColor = '#FFF' }) => (
  <View style={styles.detailBox}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, { color: valueColor }]}>{value}</Text>
  </View>
);

const TimelineStep = ({ time, desc, isHighlight, highlightColor, isLast }) => (
  <View style={styles.timelineRow}>
    <View style={styles.timelineLeft}>
      <View style={[styles.dot, isHighlight && { backgroundColor: highlightColor }]} />
      {!isLast && <View style={styles.line} />}
    </View>
    <View style={styles.timelineRight}>
      <Text style={styles.timelineTime}>{time}</Text>
      <Text style={[styles.timelineDesc, isHighlight && { fontWeight: 'bold', color: '#FFF' }]}>{desc}</Text>
    </View>
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    {icon}
    <Text style={[styles.tabLabel, active && { color: '#00E5FF' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  banner: { height: 50, borderRadius: 10, borderWidth: 1, backgroundColor: '#161B29', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  bannerText: { fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },
  videoCard: { height: 180, backgroundColor: '#161B29', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  clipBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: '#000000AA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  clipText: { color: '#FFF', fontSize: 10 },
  playBtn: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#00E5FF22', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#00E5FF44' },
  card: { backgroundColor: '#161B29', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  cardHeader: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailBox: { width: '50%', marginBottom: 20 },
  detailLabel: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: 'bold' },
  timelineContainer: { marginLeft: 10 },
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { alignItems: 'center', marginRight: 15 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#475569' },
  line: { width: 2, flex: 1, backgroundColor: '#1E293B' },
  timelineTime: { color: '#64748B', fontSize: 12 },
  timelineDesc: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  callBtn: { height: 55, backgroundColor: '#FF1744', borderRadius: 15, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginBottom: 15 },
  callBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
  secondaryBtn: { flex: 1, height: 55, borderRadius: 15, backgroundColor: '#161B29', borderWidth: 1, borderColor: '#1E293B', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  secondaryBtnText: { color: '#FFF', fontWeight: 'bold' },
  resolveBtn: { flex: 1, height: 55, borderRadius: 15, backgroundColor: '#00E5FF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  resolveBtnText: { color: '#000', fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
