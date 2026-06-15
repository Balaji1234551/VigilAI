import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Map, Download, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';

export default function AnalyticsScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.dateSelector}>
          <Calendar size={16} color="#94A3B8" />
          <Text style={styles.dateText}>Last 7 days</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Top Stats Row */}
        <View style={styles.statsRow}>
          <HeaderStatBox value="82" label="Total Alerts" color="#00E5FF" />
          <HeaderStatBox value="1.8s" label="Avg Response" color="#00E5FF" />
          <HeaderStatBox value="96%" label="Prevention Rate" color="#FFD600" />
        </View>

        {/* Alerts by Day Chart Area */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.cardTitle}>Alerts by Day</Text>
            <TrendingUp size={18} color="#00C853" />
          </View>
          <View style={styles.barChartContainer}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <View key={day} style={styles.barWrapper}>
                <Text style={styles.barVal}>{[5, 8, 3, 12, 7, 4, 9][idx]}</Text>
                <View style={[styles.bar, { height: [30, 50, 20, 70, 45, 25, 60][idx] }]} />
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Anomaly Distribution Section */}
        <View style={styles.distributionCard}>
          <Text style={styles.cardTitle}>Anomaly Distribution</Text>
          <DistItem label="Package Theft" val="18 (22%)" color="#FF1744" progress={0.7} />
          <DistItem label="Unauthorized Access" val="15 (18%)" color="#FFC400" progress={0.6} />
          <DistItem label="Falls" val="12 (15%)" color="#00E5FF" progress={0.5} />
          <DistItem label="Fire/Smoke" val="10 (12%)" color="#FF5722" progress={0.4} />
          <DistItem label="Vandalism" val="8 (10%)" color="#94A3B8" progress={0.3} />
          <DistItem label="Weapons" val="7 (9%)" color="#FF1744" progress={0.25} />
          <DistItem label="Vehicle Intrusion" val="6 (7%)" color="#00C853" progress={0.2} />
          <DistItem label="Medical Emergency" val="6 (7%)" color="#FFC400" progress={0.2} />
        </View>

        {/* Top Alert Locations Section */}
        <View style={styles.locationCard}>
          <Text style={styles.cardTitle}>Top Alert Locations</Text>
          <LocationItem rank="1" name="Front Porch" type="Package Theft" count="24" color="#FF1744" />
          <LocationItem rank="2" name="Main Entrance" type="Unauthorized Access" count="18" color="#FFC400" />
          <LocationItem rank="3" name="Backyard Gate" type="Perimeter Breach" count="15" color="#00BFA5" />
          <LocationItem rank="4" name="Driveway" type="Vehicle Intrusion" count="12" color="#00BFA5" />
          <LocationItem rank="5" name="Living Room" type="Fall Detection" count="8" color="#00BFA5" />
        </View>

        {/* Action Buttons */}
        <View style={styles.footerBtns}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('RiskHeatmap')}>
            <Map size={18} color="#00BFA5" />
            <Text style={[styles.btnText, { color: '#00BFA5' }]}>Risk Heatmap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => navigation.navigate('AlertCalendar')}>
            <Calendar size={18} color="#00BFA5" />
            <Text style={[styles.btnText, { color: '#00BFA5' }]}>Alert Calendar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.exportBtn}>
          <Download size={18} color="#94A3B8" />
          <Text style={styles.exportText}>Export Report (PDF/CSV)</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#94A3B8" />} label="Home" onPress={() => navigation.navigate('Home')} />
        <TabItem icon={<Camera size={24} color="#94A3B8" />} label="Cameras" onPress={() => navigation.navigate('Cameras')} />
        <TabItem icon={<Bell size={24} color="#94A3B8" />} label="Alerts" onPress={() => navigation.navigate('Alerts')} />
        <TabItem icon={<BarChart2 size={24} color="#00E5FF" />} label="Analytics" active />
        <TabItem icon={<User size={24} color="#94A3B8" />} label="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

// Helper Components
const HeaderStatBox = ({ value, label, color }) => (
  <View style={styles.headerStat}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const DistItem = ({ label, val, color, progress }) => (
  <View style={styles.distItem}>
    <View style={styles.distRow}>
      <Text style={styles.distLabel}>{label}</Text>
      <Text style={styles.distVal}>{val}</Text>
    </View>
    <View style={styles.progressBarBg}>
      <View style={[styles.progressBarFill, { backgroundColor: color, width: `${progress * 100}%` }]} />
    </View>
  </View>
);

const LocationItem = ({ rank, name, type, count, color }) => (
  <View style={styles.locItem}>
    <View style={[styles.rankCircle, { backgroundColor: color + '33' }]}><Text style={{ color, fontWeight: 'bold' }}>{rank}</Text></View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={styles.locName}>{name}</Text>
      <Text style={styles.locType}>{type}</Text>
    </View>
    <View style={styles.countRow}>
       <Bell size={12} color="#94A3B8" />
       <Text style={styles.locCount}>{count}</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 8, borderRadius: 10, gap: 8 },
  dateText: { color: '#FFF', fontSize: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  headerStat: { flex: 1, backgroundColor: '#161B29', borderRadius: 15, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  statValue: { fontSize: 20, fontWeight: 'bold' },
  statLabel: { color: '#94A3B8', fontSize: 9, textAlign: 'center', marginTop: 4 },
  chartCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  barWrapper: { alignItems: 'center', gap: 5 },
  barVal: { color: '#94A3B8', fontSize: 10 },
  bar: { width: 30, backgroundColor: '#00E5FF33', borderTopLeftRadius: 15, borderTopRightRadius: 15, borderBottomLeftRadius: 15, borderBottomRightRadius: 15, borderLeftWidth: 15, borderRightWidth: 15, borderColor: '#00E5FF' },
  dayLabel: { color: '#64748B', fontSize: 10 },
  distributionCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  distItem: { marginBottom: 15 },
  distRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  distLabel: { color: '#FFF', fontSize: 13 },
  distVal: { color: '#94A3B8', fontSize: 12 },
  progressBarBg: { height: 6, backgroundColor: '#0F172A', borderRadius: 3 },
  progressBarFill: { height: 6, borderRadius: 3 },
  locationCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  locItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  rankCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  locName: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  locType: { color: '#64748B', fontSize: 11 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  locCount: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  footerBtns: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  outlineBtn: { flex: 1, flexDirection: 'row', height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#00BFA5', justifyContent: 'center', alignItems: 'center', gap: 8 },
  btnText: { fontWeight: 'bold', fontSize: 14 },
  exportBtn: { height: 50, borderRadius: 12, backgroundColor: '#161B29', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1E293B' },
  exportText: { color: '#94A3B8', fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});