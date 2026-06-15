import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Platform, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Camera, Search, Plus, Moon, MoreVertical, Home, Bell, BarChart2, User } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';
import { camerasAPI } from '../services/api';

export default function CameraScreen({ navigation }) {
  const [cameras, setCameras] = React.useState([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedLang, setSelectedLang] = React.useState('English');
  const { t } = useTranslation(selectedLang);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          // Load language
          const storedLang = await AsyncStorage.getItem('userLanguage');
          if (storedLang) {
            setSelectedLang(storedLang);
          }

          // Load custom cameras from backend
          const fetchedCameras = await camerasAPI.getCameras();
          const mappedCameras = fetchedCameras.map(cam => ({
            id: cam.id.toString(),
            title: cam.name || cam.camera_name,
            subtitle: cam.location || 'Unspecified',
            status: cam.status === 'online' ? 'Online' : 'Offline',
            isOnline: cam.status === 'online'
          }));
          setCameras(mappedCameras);
        } catch (error) {
          console.error("Error loading cameras", error);
          setCameras([]);
        }
      };
      loadData();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('cameras')}</Text>
        <TouchableOpacity style={styles.plusIconBtn} onPress={() => navigation.navigate('AddCamera')}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Search cameras..." 
            placeholderTextColor="#64748B" 
            style={styles.searchInput} 
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Camera List */}
        <View style={styles.listContainer}>
          {cameras.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40, padding: 20 }}>
              <Camera size={64} color="#242C3E" style={{ marginBottom: 20 }} />
              <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>No Cameras Added</Text>
              <Text style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', marginVertical: 10 }}>
                You haven't added any cameras yet. Add your first camera to start monitoring.
              </Text>
              <TouchableOpacity 
                style={{ backgroundColor: '#00E5FF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 20 }} 
                onPress={() => navigation.navigate('AddCamera')}
              >
                <Plus size={20} color="#000" style={{ marginRight: 8 }} />
                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>{t('addCamera')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            cameras.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())).map(cam => (
              <CameraCard 
                key={cam.id}
                title={cam.title} 
                subtitle={cam.subtitle} 
                status={cam.status} 
                isOnline={cam.isOnline} 
                onPress={() => navigation.navigate('CameraDetails', { cameraName: cam.title, cameraId: cam.id })} 
                onMenuPress={() => {
                  Alert.alert('Camera Options', `Manage ${cam.title}`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Edit Details', onPress: () => Alert.alert('Notice', 'Edit functionality is locked in this version.') },
                    { text: 'Delete', style: 'destructive', onPress: async () => {
                      try {
                        await camerasAPI.deleteCamera(cam.id);
                        setCameras(prev => prev.filter(c => c.id !== cam.id));
                      } catch (e) {
                        Alert.alert('Error', 'Failed to delete camera.');
                      }
                    }}
                  ]);
                }}
              />
            ))
          )}
        </View>

        {/* Bottom Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddCamera')}>
            <Plus size={20} color="#000" />
            <Text style={styles.addBtnText}>{t('addCamera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.patrolBtn} onPress={() => navigation.navigate('PatrolMode')}>
            <Moon size={20} color="#FFF" />
            <Text style={styles.patrolBtnText}>Patrol Mode</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.tabItem}>
          <Home size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem}>
          <Camera size={24} color="#00E5FF" />
          <Text style={[styles.tabLabel, { color: '#00E5FF' }]}>{t('cameras')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('alerts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Analytics')}>
          <BarChart2 size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('analytics')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CameraCard = ({ title, subtitle, status, isOnline, onPress, onMenuPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.thumbnailPlaceholder}>
      <Camera size={32} color="#242C3E" />
    </View>
    <View style={styles.cardInfo}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <TouchableOpacity onPress={onMenuPress} hitSlop={{top:10, bottom:10, left:10, right:10}}>
          <MoreVertical size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#00C853' : '#FF5252' }]} />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  plusIconBtn: { backgroundColor: '#00E5FF', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  listContainer: { gap: 15, marginBottom: 30 },
  card: { flexDirection: 'row', backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden', height: 120, borderWidth: 1, borderColor: '#242C3E' },
  thumbnailPlaceholder: { width: '35%', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, padding: 15, justifyContent: 'center' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cardSubtitle: { color: '#94A3B8', fontSize: 14, marginVertical: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: '#94A3B8', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 12 },
  addBtn: { flex: 1.2, flexDirection: 'row', backgroundColor: '#00E5FF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', gap: 8 },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
  patrolBtn: { flex: 1, flexDirection: 'row', backgroundColor: '#0A0E17', height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', justifyContent: 'center', alignItems: 'center', gap: 8 },
  patrolBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});