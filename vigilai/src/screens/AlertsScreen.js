import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bell, Search, Filter, ChevronRight, Home, Camera, BarChart2, User } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';

export default function AlertsScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const { t } = useTranslation(selectedLang);
  
  const filters = ['All', 'Unread', 'Critical', 'Theft', 'Intrusion', 'Fire', 'Medical', 'Falls', 'Weapons'];

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const loadLang = async () => {
        try {
          const storedLang = await AsyncStorage.getItem('userLanguage');
          if (storedLang) {
            setSelectedLang(storedLang);
          }
        } catch (e) {
          console.error('Failed to load language', e);
        }
      };
      loadLang();
    });
    return unsubscribe;
  }, [navigation]);

  // Alert templates matching the exact user requirements
  const alertDataTemplates = [
    { id: 1, color: '#FF1744', titleKey: 'packageTheft', defaultTitle: 'Package Theft Detected', loc: 'Front Porch • 2 min ago', conf: '94%', isUnread: true, category: 'Theft' },
    { id: 2, color: '#FF1744', titleKey: 'unauthorizedAccess', defaultTitle: 'Unauthorized Access', loc: 'Backyard Gate • 8 min ago', conf: '91%', isUnread: true, category: 'Intrusion' },
    { id: 3, color: '#FFC400', titleKey: 'fallDetected', defaultTitle: 'Fall Detected', loc: 'Living Room • 15 min ago', conf: '92%', isUnread: true, category: 'Falls' },
    { id: 4, color: '#FF1744', titleKey: null, defaultTitle: 'Smoke/Fire Detected', loc: 'Kitchen • 1 hour ago', conf: '88%', isUnread: false, category: 'Fire' },
    { id: 5, color: '#FFC400', titleKey: null, defaultTitle: 'Vehicle Intrusion', loc: 'Driveway • 2 hours ago', conf: '86%', isUnread: false, category: 'Intrusion' },
    { id: 6, color: '#FF1744', titleKey: null, defaultTitle: 'Weapon Detected', loc: 'Main Entrance • 3 hours ago', conf: '89%', isUnread: false, category: 'Weapons' },
    { id: 7, color: '#FFC400', titleKey: null, defaultTitle: 'Physical Altercation', loc: 'Parking Lot • 4 hours ago', conf: '76%', isUnread: false, category: 'Intrusion' },
    { id: 8, color: '#00E5FF', titleKey: null, defaultTitle: 'Vandalism Detected', loc: 'Side Wall • 5 hours ago', conf: '82%', isUnread: false, category: 'Theft' },
    { id: 9, color: '#FFC400', titleKey: null, defaultTitle: 'Trespassing Alert', loc: 'Restricted Area • 6 hours ago', conf: '90%', isUnread: false, category: 'Intrusion' },
    { id: 10, color: '#00E5FF', titleKey: null, defaultTitle: 'Suspicious Loitering', loc: 'Main Entrance • 7 hours ago', conf: '85%', isUnread: false, category: 'Intrusion' },
    { id: 11, color: '#FFC400', titleKey: null, defaultTitle: 'Perimeter Breach', loc: 'Fence Line • 8 hours ago', conf: '93%', isUnread: false, category: 'Intrusion' },
    { id: 12, color: '#00E5FF', titleKey: null, defaultTitle: 'Abandoned Object', loc: 'Terminal 3 • 9 hours ago', conf: '87%', isUnread: false, category: 'Theft' },
    { id: 13, color: '#FF1744', titleKey: null, defaultTitle: 'Medical Emergency', loc: 'Hallway B • 10 hours ago', conf: '95%', isUnread: false, category: 'Medical' },
  ];

  // Store alerts list in state to track dynamic isUnread value on tap
  const [alerts, setAlerts] = useState(alertDataTemplates);

  const handleMarkAsRead = (id) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === id ? { ...alert, isUnread: false } : alert
      )
    );
  };

  // Dynamic filter and search query processing
  const filteredAlerts = alerts.filter(alert => {
    const displayTitle = alert.titleKey ? t(alert.titleKey) : alert.defaultTitle;
    
    // 1. Search Query Filter
    const matchesSearch = 
      displayTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.loc.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    // 2. Category Filter
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Unread') return alert.isUnread;
    if (activeFilter === 'Critical') return alert.color === '#FF1744';
    
    return alert.category === activeFilter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('alerts')}</Text>
        <TouchableOpacity><Filter size={24} color="#FFF" /></TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Search alerts..." 
            placeholderTextColor="#64748B" 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Horizontal scroll view for filters row */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterScroll}
          style={styles.filterScrollView}
        >
          {filters.map((f) => (
            <TouchableOpacity 
              key={f} 
              style={[styles.filterPill, activeFilter === f && styles.activePill]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.activeFilterText]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.alertList}>
          {filteredAlerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={48} color="#475569" style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No alerts found for "{activeFilter}"</Text>
            </View>
          ) : (
            filteredAlerts.map((alert) => {
              const displayTitle = alert.titleKey ? t(alert.titleKey) : alert.defaultTitle;
              return (
                <AlertCard 
                  key={alert.id} 
                  {...alert} 
                  title={displayTitle} 
                  navigation={navigation} 
                  onPress={() => handleMarkAsRead(alert.id)}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Navigation Bar */}
      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#94A3B8" />} label={t('home')} onPress={() => navigation.navigate('Home')} />
        <TabItem icon={<Camera size={24} color="#94A3B8" />} label={t('cameras')} onPress={() => navigation.navigate('Cameras')} />
        <TabItem icon={<Bell size={24} color="#00E5FF" />} label={t('alerts')} active />
        <TabItem icon={<BarChart2 size={24} color="#94A3B8" />} label={t('analytics')} onPress={() => navigation.navigate('Analytics')} />
        <TabItem icon={<User size={24} color="#94A3B8" />} label={t('profile')} onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

const AlertCard = ({ color, title, loc, conf, isUnread, navigation, onPress }) => (
  <TouchableOpacity
    style={styles.alertCard}
    onPress={() => {
      if (onPress) onPress();
      navigation.navigate('AlertDetails', {
        alert: {
          title: title.toUpperCase(),
          camera: loc.split(' • ')[0],
          time: loc.split(' • ')[1],
          conf,
          model: 'YOLOv8 Object Detection',
          severity: color === '#FF1744' ? 'Critical' : color === '#FFC400' ? 'Warning' : 'Info',
          status: 'Under Review',
          color,
        },
      });
    }}
  >
    <View style={[styles.alertIcon, { backgroundColor: color }]} />
    <View style={styles.alertInfo}>
      <View style={styles.alertHeader}>
        <Text style={styles.alertTitle}>{title}</Text>
        {isUnread && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.alertLoc}>{loc}</Text>
      <Text style={[styles.confText, { color: color }]}>Confidence: {conf}</Text>
    </View>
    <ChevronRight size={18} color="#475569" />
  </TouchableOpacity>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 50, marginBottom: 20 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF' },
  filterScrollView: { marginBottom: 25 },
  filterScroll: { gap: 8, paddingLeft: 4, paddingRight: 20 },
  filterPill: { 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 22, 
    backgroundColor: '#0F172A', 
    borderWidth: 1, 
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center'
  },
  activePill: { 
    backgroundColor: '#00E5FF', 
    borderColor: '#00E5FF' 
  },
  filterText: { 
    color: '#FFF', 
    fontWeight: '700',
    fontSize: 13
  },
  activeFilterText: { 
    color: '#0A0E17',
    fontWeight: 'bold'
  },
  alertList: { gap: 12 },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#1E293B' },
  alertIcon: { width: 45, height: 45, borderRadius: 12, marginRight: 15 },
  alertInfo: { flex: 1 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertTitle: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#00E5FF' },
  alertLoc: { color: '#94A3B8', fontSize: 12, marginVertical: 4 },
  confText: { fontSize: 11, fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { marginBottom: 15, opacity: 0.5 },
  emptyText: { color: '#64748B', fontSize: 15, fontWeight: '500' }
});