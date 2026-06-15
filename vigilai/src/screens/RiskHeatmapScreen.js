import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, TrendingUp, Calendar, AlertTriangle, Lightbulb, MapPin, Clock, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';

export default function RiskHeatmapScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Risk Heatmap</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Risk Zones Analysis Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <TrendingUp size={18} color="#00E5FF" />
              <Text style={styles.cardTitle}>Risk Zones Analysis</Text>
            </View>
            <Text style={styles.dateLabel}>Last 7 Days</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            AI-powered analysis showing high-risk areas based on incident patterns
          </Text>

          <ZoneBar label="Front Porch" incidents="24" level="HIGH" color="#FF1744" progress={0.9} />
          <ZoneBar label="Main Entrance" incidents="18" level="HIGH" color="#FF1744" progress={0.7} />
          <ZoneBar label="Backyard Gate" incidents="15" level="MEDIUM" color="#FFD600" progress={0.55} />
          <ZoneBar label="Driveway" incidents="12" level="MEDIUM" color="#FFD600" progress={0.45} />
          <ZoneBar label="Living Room" incidents="8" level="LOW" color="#00C853" progress={0.3} />
          <ZoneBar label="Kitchen" incidents="5" level="LOW" color="#00C853" progress={0.15} isLast />
        </View>

        {/* Time-Based Risk Patterns */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Calendar size={18} color="#00E5FF" />
            <Text style={styles.cardTitle}>Time-Based Risk Patterns</Text>
          </View>
          <Text style={styles.cardSubtitle}>Hourly incident distribution - darker = higher risk</Text>

          <View style={styles.timeChart}>
            <TimeBar time="12 AM" alerts="15" color="#00E5FF" width="50%" />
            <TimeBar time="2 AM" alerts="22" color="#FFD600" width="65%" />
            <TimeBar time="4 AM" alerts="18" color="#FFD600" width="55%" />
            <TimeBar time="6 AM" alerts="8" color="#00E5FF" width="30%" />
            <TimeBar time="8 AM" alerts="10" color="#00E5FF" width="35%" />
            <TimeBar time="10 AM" alerts="6" color="#00E5FF" width="20%" />
            <TimeBar time="12 PM" alerts="10" color="#00E5FF" width="35%" />
            <TimeBar time="2 PM" alerts="14" color="#00E5FF" width="48%" />
            <TimeBar time="4 PM" alerts="20" color="#FFD600" width="60%" />
            <TimeBar time="6 PM" alerts="28" color="#FF1744" width="80%" />
            <TimeBar time="8 PM" alerts="35" color="#FF1744" width="95%" />
            <TimeBar time="10 PM" alerts="25" color="#FFD600" width="75%" />
          </View>
        </View>

        {/* AI Recommendations Card */}
        <View style={styles.recommendationCard}>
          <View style={styles.row}>
            <AlertTriangle size={18} color="#00E5FF" />
            <Text style={styles.recommendationTitle}>AI Recommendations</Text>
          </View>
          
          <RecommendationItem 
            icon={<MapPin size={16} color="#00E5FF" />}
            text={<Text><Text style={styles.boldText}>Front Porch</Text> shows highest risk (24 incidents). Consider enabling Patrol Mode during evening hours.</Text>}
          />
          <RecommendationItem 
            icon={<Clock size={16} color="#00E5FF" />}
            text={<Text><Text style={styles.boldText}>6-10 PM</Text> is peak incident time. Increase sensitivity during this window.</Text>}
          />
          <RecommendationItem 
            icon={<Lightbulb size={16} color="#00E5FF" />}
            text={<Text><Text style={styles.boldText}>Living Room</Text> has low risk. Consider adjusting detection thresholds to reduce false positives.</Text>}
            isLast
          />
        </View>

      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#94A3B8" />} label="Home" onPress={() => navigation.navigate('Home')} />
        <TabItem icon={<Camera size={24} color="#94A3B8" />} label="Cameras" onPress={() => navigation.navigate('Cameras')} />
        <TabItem icon={<Bell size={24} color="#94A3B8" />} label="Alerts" onPress={() => navigation.navigate('Alerts')} />
        <TabItem icon={<BarChart2 size={24} color="#00E5FF" />} label="Analytics" active onPress={() => navigation.navigate('Analytics')} />
        <TabItem icon={<User size={24} color="#94A3B8" />} label="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

// Sub-components
const ZoneBar = ({ label, incidents, level, color, progress, isLast }) => (
  <View style={[styles.zoneContainer, isLast && { marginBottom: 0 }]}>
    <View style={styles.rowBetween}>
      <View style={styles.row}>
        <View style={[styles.statusDot, { backgroundColor: color }]} />
        <View>
          <Text style={styles.zoneLabel}>{label}</Text>
          <Text style={styles.incidentCount}>{incidents} incidents</Text>
        </View>
      </View>
      <View style={[styles.levelBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.levelText, { color }]}>{level}</Text>
      </View>
    </View>
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { backgroundColor: color, width: `${progress * 100}%` }]} />
    </View>
  </View>
);

const TimeBar = ({ time, alerts, color, width }) => (
  <View style={styles.timeRow}>
    <Text style={styles.timeText}>{time}</Text>
    <View style={[styles.timeFill, { backgroundColor: color, width }]}>
      <Text style={styles.alertCount}>{alerts} alerts</Text>
    </View>
  </View>
);

const RecommendationItem = ({ icon, text, isLast }) => (
  <View style={[styles.recItem, isLast && { marginBottom: 0 }]}>
    {icon}
    <Text style={styles.recText}>{text}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 12, zIndex: 10 },
  backBtn: { marginRight: 15, paddingVertical: 8 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  card: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 10, marginBottom: 25, lineHeight: 18 },
  dateLabel: { color: '#64748B', fontSize: 11 },
  zoneContainer: { marginBottom: 25 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  zoneLabel: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  incidentCount: { color: '#64748B', fontSize: 11, marginTop: 2 },
  levelBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  levelText: { fontSize: 9, fontWeight: 'bold' },
  progressBg: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, marginTop: 12 },
  progressFill: { height: 6, borderRadius: 3 },
  timeChart: { marginTop: 20, gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  timeText: { color: '#64748B', fontSize: 10, width: 45 },
  timeFill: { height: 32, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 15 },
  alertCount: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  recommendationCard: { backgroundColor: '#00E5FF0A', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#00E5FF33' },
  recommendationTitle: { color: '#00E5FF', fontSize: 16, fontWeight: 'bold' },
  recItem: { flexDirection: 'row', gap: 12, marginTop: 20 },
  recText: { flex: 1, color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  boldText: { color: '#FFF', fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});