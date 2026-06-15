import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, TrendingDown, TrendingUp, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';

export default function AlertCalendarScreen({ navigation }) {
  // Mock data for the heatmap grid (7 rows for days, 13 columns for weeks)
  const heatmapData = [
    ['#00C853', '#FF1744', '#0F172A', '#0F172A', '#FF1744', '#FF1744', '#FF1744', '#FFC400', '#FF1744', '#0F172A', '#0F172A', '#FF1744'],
    ['#00C853', '#FF1744', '#FF1744', '#00C853', '#00C853', '#FF1744', '#00C853', '#00C853', '#0F172A', '#FF1744', '#0F172A', '#FF1744'],
    ['#FFC400', '#FF1744', '#FFC400', '#0F172A', '#FF1744', '#00C853', '#FF1744', '#FF1744', '#0F172A', '#00C853', '#FF1744', '#FF1744'],
    ['#00C853', '#0F172A', '#00C853', '#FF1744', '#0F172A', '#FF1744', '#00C853', '#FF1744', '#FF1744', '#FF1744', '#0F172A', '#FFC400'],
    ['#FFC400', '#0F172A', '#FF1744', '#00C853', '#0F172A', '#FF1744', '#00C853', '#FF1744', '#FF1744', '#FF1744', '#FF1744', '#FFC400'],
    ['#0F172A', '#FF1744', '#0F172A', '#00C853', '#00C853', '#FF1744', '#0F172A', '#FF1744', '#00C853', '#FFC400', '#FF1744', '#FF1744'],
    ['#00C853', '#FF1744', '#0F172A', '#FFC400', '#FFC400', '#FF1744', '#00C853', '#00C853', '#00C853', '#FFC400', '#FF1744', '#0F172A'],
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alert Calendar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Activity Heatmap Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.row}>
              <Calendar size={18} color="#00E5FF" />
              <Text style={styles.cardTitle}>Activity Heatmap</Text>
            </View>
            <View style={styles.row}>
              <ChevronLeft size={18} color="#64748B" />
              <Text style={styles.dateRange}>Last 3 Months</Text>
              <ChevronRight size={18} color="#64748B" />
            </View>
          </View>

          <View style={styles.heatmapGrid}>
            <View style={styles.dayLabels}>
              <Text style={styles.dayLabel}>Sun</Text>
              <Text style={styles.dayLabel}>Tue</Text>
              <Text style={styles.dayLabel}>Thu</Text>
              <Text style={styles.dayLabel}>Sat</Text>
            </View>
            <View style={styles.gridContainer}>
              {heatmapData.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((color, colIndex) => (
                    <View key={colIndex} style={[styles.gridSquare, { backgroundColor: color }]} />
                  ))}
                </View>
              ))}
            </View>
          </View>

          <View style={styles.legend}>
            <Text style={styles.legendText}>Less</Text>
            <View style={styles.legendDots}>
               <View style={[styles.legendDot, { backgroundColor: '#00C853' }]} />
               <View style={[styles.legendDot, { backgroundColor: '#FFC400' }]} />
               <View style={[styles.legendDot, { backgroundColor: '#FF1744' }]} />
               <View style={[styles.legendDot, { backgroundColor: '#FF1744' }]} />
            </View>
            <Text style={styles.legendText}>More</Text>
          </View>
        </View>

        {/* Monthly Trends */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <TrendRow month="Jan 2026" alerts="45" percent="-12%" isDown />
          <TrendRow month="Feb 2026" alerts="52" percent="+15%" />
          <TrendRow month="Mar 2026" alerts="38" percent="-27%" isDown isLast />
        </View>

        {/* Busiest Days */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Busiest Days (Last 90 Days)</Text>
          <BusiestDay date="Mar 15, 2026" type="Package Theft" count="18" />
          <BusiestDay date="Mar 8, 2026" type="Unauthorized Access" count="15" />
          <BusiestDay date="Feb 28, 2026" type="Loitering" count="14" />
          <BusiestDay date="Feb 22, 2026" type="Vehicle Intrusion" count="12" />
          <BusiestDay date="Feb 14, 2026" type="Package Theft" count="11" isLast />
        </View>

        {/* AI Insight Card */}
        <View style={styles.insightCard}>
          <Text style={styles.insightTitle}>Insight</Text>
          <Text style={styles.insightText}>
            Your alerts have <Text style={styles.boldInsight}>decreased 27%</Text> this month compared to February. Weekends show <Text style={styles.boldInsight}>40% more activity</Text> than weekdays, suggesting you may want to enable Patrol Mode on Friday-Sunday nights.
          </Text>
        </View>

      </ScrollView>

      {/* Navigation */}
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
const TrendRow = ({ month, alerts, percent, isDown, isLast }) => (
  <View style={[styles.trendRow, isLast && { borderBottomWidth: 0 }]}>
    <View>
      <Text style={styles.trendMonth}>{month}</Text>
      <View style={styles.row}>
        <Text style={styles.trendAlerts}>{alerts}</Text>
        <Text style={styles.trendLabel}>Total Alerts</Text>
      </View>
    </View>
    <View style={styles.percentContainer}>
      {isDown ? <TrendingDown size={14} color="#00C853" /> : <TrendingUp size={14} color="#FF1744" />}
      <Text style={[styles.percentText, { color: isDown ? '#00C853' : '#FF1744' }]}>{percent}</Text>
    </View>
  </View>
);

const BusiestDay = ({ date, type, count, isLast }) => (
  <View style={[styles.busiestRow, isLast && { marginBottom: 0 }]}>
    <View>
      <Text style={styles.busiestDate}>{date}</Text>
      <Text style={styles.busiestType}>Most common: {type}</Text>
    </View>
    <View style={styles.countContainer}>
      <Text style={styles.countLarge}>{count}</Text>
      <Text style={styles.countLabel}>alerts</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 12, zIndex: 10 },
  backBtn: { marginRight: 15, paddingVertical: 8 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  card: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  dateRange: { color: '#64748B', fontSize: 12 },
  heatmapGrid: { flexDirection: 'row', gap: 10 },
  dayLabels: { justifyContent: 'space-between', paddingVertical: 5 },
  dayLabel: { color: '#64748B', fontSize: 10 },
  gridContainer: { flex: 1, gap: 4 },
  gridRow: { flexDirection: 'row', gap: 4 },
  gridSquare: { width: 14, height: 14, borderRadius: 7 },
  legend: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  legendDots: { flexDirection: 'row', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#64748B', fontSize: 10 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  trendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  trendMonth: { color: '#64748B', fontSize: 13, marginBottom: 4 },
  trendAlerts: { color: '#00E5FF', fontSize: 20, fontWeight: 'bold', marginRight: 8 },
  trendLabel: { color: '#64748B', fontSize: 11 },
  percentContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  percentText: { fontSize: 13, fontWeight: 'bold' },
  busiestRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  busiestDate: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginBottom: 4 },
  busiestType: { color: '#64748B', fontSize: 12 },
  countContainer: { alignItems: 'center' },
  countLarge: { color: '#FF1744', fontSize: 18, fontWeight: 'bold' },
  countLabel: { color: '#64748B', fontSize: 10 },
  insightCard: { backgroundColor: '#00E5FF0D', borderRadius: 15, padding: 25, borderWidth: 1, borderColor: '#00E5FF33' },
  insightTitle: { color: '#00C853', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  insightText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  boldInsight: { color: '#FFF', fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
