const fs = require('fs');

const addCameraContent = `import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Cpu, QrCode, ChevronDown, Home, Camera, Bell, BarChart2, User, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const locations = ['Front Door', 'Living Room', 'Backyard', 'Kitchen', 'Garage', 'Office', 'Hallway'];

  const handleSave = async () => {
    if (!cameraName) {
      Alert.alert('Error', 'Please enter a camera name');
      return;
    }
    
    try {
      const newCamera = {
        id: Date.now().toString(),
        title: cameraName,
        subtitle: location === 'Select location' ? 'Unspecified' : location,
        status: 'Online',
        isOnline: true
      };

      const existingCamerasStr = await AsyncStorage.getItem('userCameras');
      const existingCameras = existingCamerasStr ? JSON.parse(existingCamerasStr) : [];
      
      const updatedCameras = [...existingCameras, newCamera];
      await AsyncStorage.setItem('userCameras', JSON.stringify(updatedCameras));
      
      Alert.alert('Success', 'Camera added successfully!', [
        { text: 'OK', onPress: () => navigation.navigate('Cameras') }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save camera');
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
            <TouchableOpacity style={styles.dropdown}>
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
`;

fs.writeFileSync('src/screens/AddCameraScreen.js', addCameraContent, 'utf8');

const cameraScreenPath = 'src/screens/CameraScreen.js';
let camContent = fs.readFileSync(cameraScreenPath, 'utf8');

const camImportTarget = "import { SafeAreaView } from 'react-native-safe-area-context';";
const camImportReplacement = "import { SafeAreaView } from 'react-native-safe-area-context';\nimport AsyncStorage from '@react-native-async-storage/async-storage';\nimport { useFocusEffect } from '@react-navigation/native';";

const camTargetRegex = new RegExp(camImportTarget.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
camContent = camContent.replace(camTargetRegex, camImportReplacement);

const listTarget = `export default function CameraScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cameras</Text>
        <TouchableOpacity style={styles.plusIconBtn} onPress={() => navigation.navigate('AddCamera')}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>`;

const listReplacement = `export default function CameraScreen({ navigation }) {
  const [cameras, setCameras] = React.useState([
    { id: '1', title: "Main Entrance", subtitle: "Front Door", status: "Online", isOnline: true },
    { id: '2', title: "Living Room", subtitle: "First Floor", status: "Online", isOnline: true },
    { id: '3', title: "Backyard", subtitle: "Outdoor", status: "Offline", isOnline: false }
  ]);

  useFocusEffect(
    React.useCallback(() => {
      const loadCameras = async () => {
        try {
          const savedCamerasStr = await AsyncStorage.getItem('userCameras');
          if (savedCamerasStr) {
            const savedCameras = JSON.parse(savedCamerasStr);
            // Combine default and saved cameras
            const defaultCameras = [
              { id: '1', title: "Main Entrance", subtitle: "Front Door", status: "Online", isOnline: true },
              { id: '2', title: "Living Room", subtitle: "First Floor", status: "Online", isOnline: true },
              { id: '3', title: "Backyard", subtitle: "Outdoor", status: "Offline", isOnline: false }
            ];
            setCameras([...defaultCameras, ...savedCameras]);
          }
        } catch (error) {
          console.error("Error loading cameras", error);
        }
      };
      loadCameras();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cameras</Text>
        <TouchableOpacity style={styles.plusIconBtn} onPress={() => navigation.navigate('AddCamera')}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>`;

// The code currently has:
//         <TouchableOpacity style={styles.plusIconBtn}>
// So let's replace that specific chunk accurately
const listTargetFallback = `export default function CameraScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cameras</Text>
        <TouchableOpacity style={styles.plusIconBtn}>
          <Plus size={24} color="#000" />
        </TouchableOpacity>
      </View>`;

if(camContent.includes("plusIconBtn} onPress")) {
  camContent = camContent.replace(new RegExp(listTarget.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n')), listReplacement);
} else {
  camContent = camContent.replace(new RegExp(listTargetFallback.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n')), listReplacement);
}

const renderListTarget = `        {/* Camera List */}
        <View style={styles.listContainer}>
          <CameraCard title="Main Entrance" subtitle="Front Door" status="Online" isOnline={true} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Main Entrance' })} />
          <CameraCard title="Living Room" subtitle="First Floor" status="Online" isOnline={true} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Living Room' })} />
          <CameraCard title="Backyard" subtitle="Outdoor" status="Offline" isOnline={false} onPress={() => navigation.navigate('CameraDetails', { cameraName: 'Backyard' })} />
        </View>`;

const renderListReplacement = `        {/* Camera List */}
        <View style={styles.listContainer}>
          {cameras.map(cam => (
            <CameraCard 
              key={cam.id}
              title={cam.title} 
              subtitle={cam.subtitle} 
              status={cam.status} 
              isOnline={cam.isOnline} 
              onPress={() => navigation.navigate('CameraDetails', { cameraName: cam.title })} 
            />
          ))}
        </View>`;

const listRenderRegex = new RegExp(renderListTarget.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
camContent = camContent.replace(listRenderRegex, renderListReplacement);

fs.writeFileSync(cameraScreenPath, camContent, 'utf8');

console.log('Update Complete');
