import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Switch, StatusBar, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2 } from 'lucide-react-native';

export default function CameraSettingsScreen({ route, navigation }) {
  const { cameraName } = route.params || { cameraName: 'Camera Name' };

  const [name, setName] = useState(cameraName);
  const [location, setLocation] = useState('');

  // Toggles state
  const [toggles, setToggles] = useState({
    packageTheft: true,
    unauthorizedAccess: true,
    fallDetection: true,
    fireSmoke: true,
    weaponDetection: true,
    physicalAltercation: false,
    distressGesture: true,
    crowdDensity: false,
    vehicleIntrusion: true,
    vandalism: true,
    trespassing: true,
    suspiciousLoitering: false,
    perimeterBreach: true,
    abandonedObjects: false,
    medicalEmergency: true,
    cameraTamper: true,
    pushNotifications: true,
    emailAlerts: true,
    smsAlerts: false,
    faceBlur: true,
    motionBlur: false,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await fetch(`${API_URL}/api/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setToggles(prev => {
              const newToggles = { ...prev };
              for (const key in newToggles) {
                if (data[`cam_${key}`] !== undefined) {
                  newToggles[key] = data[`cam_${key}`];
                }
              }
              return newToggles;
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      }
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key, value) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await fetch(`${API_URL}/api/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            settings: [{ setting_name: `cam_${key}`, setting_value: String(value) }]
          })
        });
      }
    } catch (error) {
      console.error('Failed to save setting', error);
    }
  };

  const toggleSwitch = (key) => {
    setToggles(prev => {
      const newValue = !prev[key];
      saveSetting(key, newValue);
      return { ...prev, [key]: newValue };
    });
  };

  const [sensitivity, setSensitivity] = useState('High');
  const [confidence, setConfidence] = useState('75%');
  const [loiteringTime, setLoiteringTime] = useState('');

  const SettingToggle = ({ title, subtitle, stateKey }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch 
        value={toggles[stateKey]} 
        onValueChange={() => toggleSwitch(stateKey)}
        trackColor={{ false: '#242C3E', true: '#00E5FF55' }}
        thumbColor={toggles[stateKey] ? '#00E5FF' : '#94A3B8'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Camera Settings</Text>
        <View style={styles.backBtn} /> {/* Placeholder for balance */}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Camera Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Camera Information</Text>
          
          <Text style={styles.inputLabel}>Camera Name</Text>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholderTextColor="#64748B"
          />
          
          <Text style={styles.inputLabel}>Location</Text>
          <TextInput 
            style={styles.input} 
            value={location} 
            onChangeText={setLocation} 
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Detection Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detection Settings</Text>
          <Text style={styles.sectionSubtitle}>Enable AI detection for specific incidents</Text>
          
          <View style={styles.separator} />

          <SettingToggle title="Package Theft" subtitle="Detect package being taken from porch" stateKey="packageTheft" />
          <SettingToggle title="Unauthorized Access" subtitle="Alert on restricted area entry" stateKey="unauthorizedAccess" />
          <SettingToggle title="Fall Detection" subtitle="Detect person falling (elderly care)" stateKey="fallDetection" />
          <SettingToggle title="Fire/Smoke Detection" subtitle="Early fire and smoke detection" stateKey="fireSmoke" />
          <SettingToggle title="Weapon Detection" subtitle="Identify guns, knives, etc." stateKey="weaponDetection" />
          <SettingToggle title="Physical Altercation" subtitle="Detect fights and violence" stateKey="physicalAltercation" />
          <SettingToggle title="Distress Gesture (SOS)" subtitle="Recognize SOS hand signals (completely unique feature)" stateKey="distressGesture" />
          <SettingToggle title="Crowd Density Monitoring" subtitle="Track number of people and overcrowding" stateKey="crowdDensity" />
          <SettingToggle title="Vehicle Intrusion" subtitle="Unauthorized vehicle access" stateKey="vehicleIntrusion" />
          <SettingToggle title="Vandalism" subtitle="Property damage detection" stateKey="vandalism" />
          <SettingToggle title="Trespassing" subtitle="Detect people in off-limits areas" stateKey="trespassing" />
          <SettingToggle title="Suspicious Loitering" subtitle="Person staying too long in area" stateKey="suspiciousLoitering" />
          <SettingToggle title="Perimeter Breach" subtitle="Fence/boundary crossing" stateKey="perimeterBreach" />
          <SettingToggle title="Abandoned Objects" subtitle="Unattended bags or packages" stateKey="abandonedObjects" />
          <SettingToggle title="Medical Emergency" subtitle="Detect medical distress signals" stateKey="medicalEmergency" />
          <SettingToggle title="Camera Tamper Detection" subtitle="Alert when camera is covered or moved" stateKey="cameraTamper" />
        </View>

        {/* Sensitivity Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Sensitivity Settings</Text>
          
          <View style={styles.segmentRow}>
            <Text style={styles.segmentLabel}>Detection Sensitivity</Text>
            <Text style={styles.activeValueText}>{sensitivity}</Text>
          </View>
          <View style={styles.segmentOptions}>
            {['Low', 'Medium', 'High'].map((opt) => (
              <TouchableOpacity key={opt} style={styles.segmentOptBtn} onPress={() => setSensitivity(opt)}>
                <Text style={[styles.segmentOptText, sensitivity === opt && styles.segmentOptTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.separator} />

          <View style={styles.segmentRow}>
            <Text style={styles.segmentLabel}>Confidence Threshold</Text>
            <Text style={styles.activeValueText}>{confidence}</Text>
          </View>
          <View style={styles.segmentOptions}>
            {['50%', '75%', '95%'].map((opt) => (
              <TouchableOpacity key={opt} style={styles.segmentOptBtn} onPress={() => setConfidence(opt)}>
                <Text style={[styles.segmentOptText, confidence === opt && styles.segmentOptTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.separator} />

          <Text style={styles.inputLabel}>Loitering Time Threshold</Text>
          <TextInput 
            style={styles.input} 
            value={loiteringTime} 
            onChangeText={setLoiteringTime} 
            placeholderTextColor="#64748B"
          />
        </View>

        {/* Notification Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <View style={styles.separator} />
          <SettingToggle title="Push Notifications" subtitle="" stateKey="pushNotifications" />
          <SettingToggle title="Email Alerts" subtitle="" stateKey="emailAlerts" />
          <SettingToggle title="SMS Alerts" subtitle="" stateKey="smsAlerts" />
        </View>

        {/* Privacy Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.separator} />
          <SettingToggle title="Face Blur" subtitle="Automatically blur faces" stateKey="faceBlur" />
          <SettingToggle title="Motion Blur" subtitle="Blur moving objects" stateKey="motionBlur" />
        </View>

        {/* Delete Camera */}
        <TouchableOpacity style={styles.deleteBtn} onPress={() => navigation.navigate('Cameras')}>
          <Trash2 size={18} color="#FF1744" />
          <Text style={styles.deleteBtnText}>Delete Camera</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  card: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  sectionSubtitle: { color: '#94A3B8', fontSize: 12, marginBottom: 15 },
  separator: { height: 1, backgroundColor: '#1E293B', marginVertical: 15 },
  inputLabel: { color: '#FFF', fontSize: 13, marginBottom: 8, marginTop: 10 },
  input: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', borderRadius: 10, color: '#FFF', paddingHorizontal: 15, height: 45 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  toggleInfo: { flex: 1, paddingRight: 10 },
  toggleTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  toggleSubtitle: { color: '#94A3B8', fontSize: 11, marginTop: 4 },
  segmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  segmentLabel: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  activeValueText: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold' },
  segmentOptions: { flexDirection: 'row', justifyContent: 'space-between' },
  segmentOptBtn: { flex: 1, alignItems: 'center' },
  segmentOptText: { color: '#64748B', fontSize: 13 },
  segmentOptTextActive: { color: '#FFF', fontWeight: 'bold' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF17441A', borderWidth: 1, borderColor: '#FF1744', borderRadius: 12, height: 50, marginTop: 10, marginBottom: 20, gap: 10 },
  deleteBtnText: { color: '#FF1744', fontWeight: 'bold', fontSize: 16 }
});
