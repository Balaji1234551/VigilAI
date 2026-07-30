import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, EyeOff, Trash2, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrivacyZonesScreen({ navigation }) {
  const [zones, setZones] = useState([
    { id: 1, title: 'TV Screen Area', loc: 'Living Room', val: true },
    { id: 2, title: 'Bed Area', loc: 'Bedroom', val: true }
  ]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLoc, setNewLoc] = useState('');

  useEffect(() => {
    const loadZones = async () => {
      try {
        const stored = await AsyncStorage.getItem('privacyZones');
        if (stored) {
          setZones(JSON.parse(stored));
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadZones();
  }, []);

  const saveZones = async (newZones) => {
    setZones(newZones);
    try {
      await AsyncStorage.setItem('privacyZones', JSON.stringify(newZones));
    } catch (e) {
      console.error(e);
    }
  };

  const toggleZone = (id) => {
    const newZones = zones.map(z => z.id === id ? { ...z, val: !z.val } : z);
    saveZones(newZones);
  };

  const deleteZone = (id, title) => {
    Alert.alert(
      'Delete Privacy Zone',
      `Are you sure you want to delete the "${title}" zone? This area will no longer be blacked out in your recordings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            saveZones(zones.filter(z => z.id !== id));
          }
        }
      ]
    );
  };

  const handleAddZone = () => {
    if (!newTitle.trim() || !newLoc.trim()) {
      Alert.alert('Missing Details', 'Please enter a name and location for the privacy zone.');
      return;
    }

    // Simulate the drawing process success
    const newZone = {
      id: Date.now(),
      title: newTitle.trim(),
      loc: newLoc.trim(),
      val: true
    };

    saveZones([...zones, newZone]);
    setModalVisible(false);
    setNewTitle('');
    setNewLoc('');
    
    Alert.alert('Zone Activated', 'Your new privacy zone has been successfully mapped. This area will now be permanently blacked out from AI detection and recording.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );
}

// Sub-components
const ZoneItem = ({ title, loc, val, onToggle, onDelete, isLast }) => (
  <View style={[styles.zoneItem, isLast && { marginBottom: 0 }]}> 
    <View style={styles.rowBetween}>
      <View>
        <Text style={styles.zoneTitle}>{title}</Text>
        <Text style={styles.zoneLoc}>{loc}</Text>
      </View>
      <View style={styles.row}>
        <Switch 
          value={val} 
          onValueChange={onToggle}
          trackColor={{ false: '#1E293B', true: '#00E5FF' }}
          thumbColor="#FFF"
        />
        <TouchableOpacity style={styles.deleteIcon} onPress={onDelete}>
          <Trash2 size={18} color="#FF1744" />
        </TouchableOpacity>
      </View>
    </View>
    <View style={styles.previewContainer}>
      <View style={styles.previewOverlay}>
        <EyeOff size={28} color="#00E5FF" />
      </View>
      <View style={styles.previewBadge}><Text style={styles.previewText}>Preview</Text></View>
    </View>
  </View>
);

const StepItem = ({ number, text }) => (
  <View style={styles.stepRow}>
    <Text style={styles.stepNumber}>{number}.</Text>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const NoteItem = ({ text }) => (
  <View style={styles.noteRow}>
    <View style={styles.bullet} />
    <Text style={styles.noteText}>{text}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  infoText: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 15 },
  usageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  usageText: { color: '#64748B', fontSize: 11, flex: 1 },
  listCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  squareIcon: { width: 14, height: 14, borderWidth: 2, borderColor: '#00E5FF', borderRadius: 2 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', backgroundColor: '#00E5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 6 },
  addBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  zoneItem: { marginBottom: 30 },
  zoneTitle: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  zoneLoc: { color: '#64748B', fontSize: 12, marginTop: 2 },
  deleteIcon: { marginLeft: 10, padding: 5 },
  previewContainer: { height: 110, backgroundColor: '#0F172A', borderRadius: 15, marginTop: 15, justifyContent: 'center', alignItems: 'center', position: 'relative', },
  previewOverlay: { width: 80, height: 65, borderWidth: 2, borderColor: '#00E5FF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  previewBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#161B29CC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  previewText: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold' },
  howCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  howTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  stepRow: { flexDirection: 'row', marginBottom: 15 },
  stepNumber: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold', marginRight: 15 },
  stepText: { flex: 1, color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  notesCard: { backgroundColor: '#FFD6000D', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#FFD60033' },
  notesTitle: { color: '#FFD600', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  noteRow: { flexDirection: 'row', marginBottom: 12 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFD600', marginTop: 8, marginRight: 12 },
  noteText: { flex: 1, color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  boldNote: { color: '#FFF', fontWeight: 'bold' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  
  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 14, 23, 0.9)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161B29', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalSubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalInput: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', borderRadius: 12, height: 55, paddingHorizontal: 15, color: '#FFF', fontSize: 16, marginBottom: 15 },
  modalButtonRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 16 },
  modalSaveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  modalSaveText: { color: '#0A0E17', fontWeight: 'bold', fontSize: 16 }
});
