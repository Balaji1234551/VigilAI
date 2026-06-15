import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Cpu, QrCode, ChevronDown, Home, Camera, Bell, BarChart2, User, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { camerasAPI } from '../services/api';

export default function AddCameraScreen({ navigation }) {
  const [setupMode, setSetupMode] = useState('manual');
  
  // Form State
  const [cameraName, setCameraName] = useState('');
  const [location, setLocation] = useState('Select location');
  const [cameraType, setCameraType] = useState('IP Camera (Network)');
  const [ipAddress, setIpAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Dropdown State
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const locations = ['Front Door', 'Living Room', 'Backyard', 'Kitchen', 'Garage', 'Office', 'Hallway'];
  const cameraTypes = ['IP Camera (Network)', 'USB Webcam', 'Android IP Webcam', 'RTSP / CCTV Stream'];

  const handleSave = async () => {
    if (!cameraName) {
      Alert.alert('Error', 'Please enter a camera name');
      return;
    }
    
    let backendCameraType = 'rtsp';
    const typeStr = cameraType.toLowerCase();
    if (typeStr.includes('usb')) backendCameraType = 'usb';
    else if (typeStr.includes('android')) backendCameraType = 'ip_webcam';
    else backendCameraType = 'rtsp'; // fallback
    
    try {
      await camerasAPI.addCamera({
        // vigilai-backend schema
        name: cameraName,
        type: backendCameraType,
        url: ipAddress || '0',
        // backend schema
        camera_name: cameraName,
        camera_type: backendCameraType,
        stream_url: ipAddress || '0',
        
        location: location === 'Select location' ? 'Unspecified' : location,
        settings: {
          username: username,
          password: password
        }
      });
      
      Alert.alert('Success', 'Camera added successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Cameras') }
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save camera: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Camera</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Toggle Switch */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, setupMode === 'manual' && styles.activeToggle]} 
            onPress={() => setSetupMode('manual')}
          >
            <Cpu size={20} color={setupMode === 'manual' ? '#000' : '#FFF'} />
            <Text style={[styles.toggleText, setupMode === 'manual' && styles.activeToggleText]}>Manual Setup</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.toggleBtn, setupMode === 'qr' && styles.activeToggle]} 
            onPress={() => setSetupMode('qr')}
          >
            <QrCode size={20} color={setupMode === 'qr' ? '#000' : '#FFF'} />
            <Text style={[styles.toggleText, setupMode === 'qr' && styles.activeToggleText]}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <InputLabel label="Camera Name" placeholder="e.g., Living Room Camera" value={cameraName} onChangeText={setCameraName} />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowLocationPicker(true)}>
              <Text style={[styles.dropdownText, location === 'Select location' && {color: '#64748B'}]}>{location}</Text>
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Camera Type</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypePicker(true)}>
              <Text style={styles.dropdownText}>{cameraType}</Text>
              <ChevronDown size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <InputLabel label="IP Address / RTSP URL" placeholder="rtsp://192.168.1.100:554/stream" value={ipAddress} onChangeText={setIpAddress} />

          {/* Credential Row */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <InputLabel label="Username" placeholder="admin" value={username} onChangeText={setUsername} />
            </View>
            <View style={{ flex: 1 }}>
              <InputLabel label="Password" placeholder="••••••••" isPassword value={password} onChangeText={setPassword} />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.testBtn}>
            <Text style={styles.testBtnText}>Test Connection</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={handleSave}>
            <Text style={styles.addBtnText}>Save Camera</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Location</Text>
            <ScrollView>
              {locations.map((loc) => (
                <TouchableOpacity 
                  key={loc} 
                  style={styles.modalOption} 
                  onPress={() => { setLocation(loc); setShowLocationPicker(false); }}
                >
                  <Text style={styles.modalOptionText}>{loc}</Text>
                  {location === loc && <Check size={20} color="#00E5FF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowLocationPicker(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Type Picker Modal */}
      <Modal visible={showTypePicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Camera Type</Text>
            <ScrollView>
              {cameraTypes.map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={styles.modalOption} 
                  onPress={() => { setCameraType(type); setShowTypePicker(false); }}
                >
                  <Text style={styles.modalOptionText}>{type}</Text>
                  {cameraType === type && <Check size={20} color="#00E5FF" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTypePicker(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const InputLabel = ({ label, placeholder, isPassword, value, onChangeText }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput 
      style={styles.input} 
      placeholder={placeholder} 
      placeholderTextColor="#475569" 
      secureTextEntry={isPassword}
      value={value}
      onChangeText={onChangeText}
    />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  
  toggleContainer: { flexDirection: 'row', backgroundColor: '#161B29', borderRadius: 12, padding: 6, marginBottom: 25 },
  toggleBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  activeToggle: { backgroundColor: '#00E5FF' },
  toggleText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  activeToggleText: { color: '#000' },

  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  input: { backgroundColor: '#161B29', borderRadius: 12, height: 55, paddingHorizontal: 15, color: '#FFF', borderWidth: 1, borderColor: '#1E293B' },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, height: 55, paddingHorizontal: 15, borderWidth: 1, borderColor: '#1E293B' },
  dropdownText: { color: '#FFF' },
  row: { flexDirection: 'row', gap: 15 },

  buttonContainer: { marginTop: 35, gap: 15 },
  testBtn: { height: 55, borderRadius: 12, borderWidth: 1, borderColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  testBtnText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 16 },
  addBtn: { height: 55, backgroundColor: '#00E5FF', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#161B29', borderRadius: 15, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  modalOptionText: { color: '#FFF', fontSize: 16 },
  modalCloseBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 15, backgroundColor: '#0F172A', borderRadius: 10 },
  modalCloseText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 }
});
