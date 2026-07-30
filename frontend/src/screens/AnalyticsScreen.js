import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Map, Download, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import { useGlobalContext } from '../context/GlobalContext';

export default function AnalyticsScreen({ navigation }) {
  const { dashStats, alerts } = useGlobalContext();

  const analyticsData = React.useMemo(() => {
    const totalAlerts = dashStats?.totalAlerts || alerts?.length || 0;
    
    // Group by anomaly type
    const distributionMap = {};
    (alerts || []).forEach(a => {
      const type = a.anomaly_type || 'Unknown';
      distributionMap[type] = (distributionMap[type] || 0) + 1;
    });
    
    const distribution = Object.keys(distributionMap)
      .map(key => ({ label: key, count: distributionMap[key] }))
      .sort((a, b) => b.count - a.count);

    // Group by camera name
    const locationMap = {};
    (alerts || []).forEach(a => {
      const cam = a.camera_name || `Camera ${a.camera_id}`;
      if (!locationMap[cam]) locationMap[cam] = { count: 0, type: a.anomaly_type || 'Unknown' };
      locationMap[cam].count++;
    });

    const locations = Object.keys(locationMap)
      .map(key => ({ name: key, count: locationMap[key].count, type: locationMap[key].type }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Fake last 7 days chart data based on alerts total (for visual purposes until we have historical data API)
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const barData = days.map(() => Math.floor(Math.random() * (totalAlerts || 10)));

    return {
      totalAlerts,
      distribution,
      locations,
      days,
      barData
    };
  }, [alerts, dashStats]);
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
          <HeaderStatBox value={analyticsData.totalAlerts.toString()} label="Total Alerts" color="#00E5FF" />
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
            {analyticsData.days.map((day, idx) => (
              <View key={day} style={styles.barWrapper}>
                <Text style={styles.barVal}>{analyticsData.barData[idx]}</Text>
                <View style={[styles.bar, { height: Math.max(10, analyticsData.barData[idx] * 5) }]} />
                <Text style={styles.dayLabel}>{day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Anomaly Distribution Section */}
        <View style={styles.distributionCard}>
          <Text style={styles.cardTitle}>Anomaly Distribution</Text>
          {analyticsData.distribution.length === 0 && <Text style={{color: '#94A3B8'}}>No data available.</Text>}
          {analyticsData.distribution.map((item, idx) => {
            const pct = analyticsData.totalAlerts > 0 ? Math.round((item.count / analyticsData.totalAlerts) * 100) : 0;
            const colors = ['#FF1744', '#FFC400', '#00E5FF', '#FF5722', '#94A3B8'];
            return (
              <DistItem 
                key={item.label}
                label={item.label.charAt(0).toUpperCase() + item.label.slice(1)} 
                val={`${item.count} (${pct}%)`} 
                color={colors[idx % colors.length]} 
                progress={pct / 100} 
              />
            );
          })}
        </View>

        {/* Top Alert Locations Section */}
        <View style={styles.locationCard}>
          <Text style={styles.cardTitle}>Top Alert Locations</Text>
          {analyticsData.locations.length === 0 && <Text style={{color: '#94A3B8'}}>No data available.</Text>}
          {analyticsData.locations.map((loc, idx) => (
             <LocationItem 
               key={loc.name}
               rank={(idx + 1).toString()} 
               name={loc.name} 
               type={(loc.type || '').charAt(0).toUpperCase() + (loc.type || '').slice(1)} 
               count={loc.count.toString()} 
               color={idx === 0 ? '#FF1744' : idx === 1 ? '#FFC400' : '#00BFA5'} 
             />
          ))}
        </View>

      </ScrollView>


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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, width: '100%' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 8, borderRadius: 10, gap: 8 },
  dateText: { color: '#FFF', fontSize: 12 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, width: '100%' },
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
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
