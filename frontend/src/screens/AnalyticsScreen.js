import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, TrendingUp, Bell, Target, UploadCloud, Video, CheckCircle, BarChart2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get("window").width;

export default function AnalyticsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);

  const API_URL = 'http://192.168.137.1:8000';

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const res = await fetch(`${API_URL}/api/analytics/dashboard`, { headers });
      if (res.ok) {
        setDashboard(await res.json());
      }
    } catch (e) {
      console.error("Failed to fetch dashboard analytics:", e);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchDashboard();
    });
    return unsubscribe;
  }, [navigation, fetchDashboard]);

  const chartConfig = {
    backgroundGradientFrom: "#161B29",
    backgroundGradientTo: "#161B29",
    color: (opacity = 1) => `rgba(0, 229, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1
  };

  const pieColors = ['#FF1744', '#FFC400', '#00E5FF', '#FF5722', '#94A3B8', '#00C853'];

  const objCounts = dashboard?.object_counts || {};
  const pieData = Object.keys(objCounts).filter(k => k !== 'PERSON' && objCounts[k] > 0).map((key, index) => ({
    name: key,
    population: objCounts[key],
    color: pieColors[index % pieColors.length],
    legendFontColor: "#94A3B8",
    legendFontSize: 12
  }));

  const trendLabels = dashboard?.trends ? Object.keys(dashboard.trends) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const trendValues = dashboard?.trends ? Object.values(dashboard.trends) : [0, 0, 0, 0, 0, 0, 0];
  
  // Hack to prevent react-native-chart-kit from bugging out if all values are perfectly 0
  const maxTrend = Math.max(...trendValues, 0);
  if (maxTrend === 0 && trendValues.length > 0) {
      trendValues[0] = 0.01; // tiny invisible float to force Y-axis generation
  }

  const trendData = {
    labels: trendLabels,
    datasets: [{
      data: trendValues
    }]
  };

  const confData = {
    labels: ['Min', 'Avg', 'Max'],
    datasets: [{
      data: [
        (dashboard?.min_confidence || 0) * 100,
        (dashboard?.avg_confidence || 0) * 100,
        (dashboard?.max_confidence || 0) * 100
      ]
    }]
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#00E5FF" style={{ marginTop: 50 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <HeaderStatBox value={dashboard?.total_uploaded || 0} label="Total Uploaded" color="#00E5FF" Icon={UploadCloud} />
              <HeaderStatBox value={dashboard?.total_processed || 0} label="Total Processed" color="#00C853" Icon={CheckCircle} />
              <HeaderStatBox value={dashboard?.total_alerts || 0} label="Total Alerts" color="#FF5252" Icon={Bell} />
            </View>
            <View style={styles.statsRow}>
              <HeaderStatBox value={dashboard?.most_frequent_object || 'None'} label="Most Frequent" color="#FFC400" Icon={Target} />
              <HeaderStatBox value={`${((dashboard?.avg_confidence || 0) * 100).toFixed(1)}%`} label="Avg Confidence" color="#9C27B0" Icon={BarChart2} />
              <HeaderStatBox value={dashboard?.trends?.daily || 0} label="Alerts Today" color="#FF1744" Icon={TrendingUp} />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Total Object Counts</Text>
              <View style={styles.countsContainer}>
                {Object.keys(objCounts).map(obj => (
                  <View key={obj} style={styles.countRow}>
                    <Text style={styles.countLabel}>{obj}</Text>
                    <Text style={styles.countValue}>{objCounts[obj]}</Text>
                  </View>
                ))}
                {Object.keys(objCounts).length === 0 && (
                  <Text style={{color: '#94A3B8'}}>No objects detected yet.</Text>
                )}
              </View>
            </View>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>Alert Trends</Text>
                <TrendingUp size={18} color="#00C853" />
              </View>
              <BarChart
                data={trendData}
                width={screenWidth - 80}
                height={220}
                yAxisLabel=""
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(0, 200, 83, ${opacity})` }}
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>Confidence Spread (%)</Text>
                <BarChart2 size={18} color="#9C27B0" />
              </View>
              <LineChart
                data={confData}
                width={screenWidth - 80}
                height={220}
                chartConfig={{ ...chartConfig, color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})` }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Critical Threat Distribution</Text>
              {pieData.length === 0 ? (
                <Text style={{color: '#94A3B8', marginTop: 10}}>No critical threats available.</Text>
              ) : (
                <PieChart
                  data={pieData}
                  width={screenWidth - 80}
                  height={220}
                  chartConfig={chartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"15"}
                  center={[10, 0]}
                  absolute
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const HeaderStatBox = ({ value, label, color, Icon }) => (
  <View style={styles.statBox}>
    {Icon && <Icon size={20} color={color} style={{marginBottom: 5}} />}
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#161B29', borderRadius: 15, padding: 15, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#1E293B' },
  statValue: { fontSize: 16, fontWeight: 'bold', marginBottom: 2, textAlign: 'center' },
  statLabel: { color: '#94A3B8', fontSize: 10, textAlign: 'center' },
  chartCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  countsContainer: { marginTop: 10 },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  countLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  countValue: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold' }
});
