import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Cpu, QrCode, ChevronDown, Home, Camera, Bell, BarChart2, User, Check } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGlobalContext } from '../context/GlobalContext';

export default function AddCameraScreen({ navigation }) {
  const { addCamera } = useGlobalContext();
  const [setupMode, setSetupMode] = useState('manual');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');
  
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
  const [showTestStream, setShowTestStream] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const locations = ['Front Door', 'Living Room', 'Backyard', 'Kitchen', 'Garage', 'Office', 'Hallway'];
  const cameraTypes = ['IP Camera (Network)', 'USB Webcam', 'Android IP Webcam', 'RTSP / CCTV Stream'];

  const getFormattedUrl = () => {
    let finalUrl = ipAddress || '';
    let backendCameraType = 'rtsp';
    const typeStr = cameraType.toLowerCase();
    
    // Auto-detect IP Webcam if the port is 8080 (very common for Android IP Webcam)
    if (typeStr.includes('android') || finalUrl.includes(':8080')) {
      backendCameraType = 'ip_webcam';
    } else if (typeStr.includes('usb')) {
      backendCameraType = 'usb';
    } else {
      backendCameraType = 'rtsp';
    }

    // Auto-inject username and password into RTSP URL
    if (backendCameraType === 'rtsp' && finalUrl.startsWith('rtsp://') && username && password) {
      if (!finalUrl.includes('@')) {
        finalUrl = finalUrl.replace('rtsp://', `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@`);
      }
    }
    
    // IP Webcam specific auto-formatting
    if (backendCameraType === 'ip_webcam') {
       // Android IP Webcam apps use self-signed certs which crash WebView with SSL errors, force HTTP
       if (finalUrl.startsWith('https://')) {
          finalUrl = finalUrl.replace('https://', 'http://');
       }
       // Add http:// if completely missing
       if (!finalUrl.startsWith('http')) {
          finalUrl = 'http://' + finalUrl;
       }
       // If user forgot /video, auto-append it
       if (!finalUrl.endsWith('/video')) {
          finalUrl = finalUrl.endsWith('/') ? finalUrl + 'video' : finalUrl + '/video';
       }
    }

    return { finalUrl, backendCameraType };
  };

  const handleTestConnection = () => {
    if (!ipAddress) {
      Alert.alert('Error', 'Please enter an IP Address or Stream URL to test.');
      return;
    }
    const { finalUrl } = getFormattedUrl();
    setTestUrl(finalUrl);
    setShowTestStream(true);
  };

  const handleSave = async () => {
    if (!cameraName) {
      Alert.alert('Error', 'Please enter a camera name');
      return;
    }
    
    const { finalUrl, backendCameraType } = getFormattedUrl();
    
    try {
      await addCamera({
        // vigilai-backend schema
        name: cameraName,
        type: backendCameraType,
        url: finalUrl,
        // backend schema
        camera_name: cameraName,
        camera_type: backendCameraType,
        stream_url: finalUrl,
        
        location: location === 'Select location' ? 'Unspecified' : location,
        settings: {
          username: username,
          password: password
        }
      });
      
      if (Platform.OS === 'web') {
        window.alert('Camera added successfully!');
        navigation.navigate('MainTabs');
      } else {
        Alert.alert('Success', 'Camera added successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('MainTabs') }
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save camera: ' + e.message);
    }
  };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    try {
      if (data.startsWith('{')) {
        const parsed = JSON.parse(data);
        if (parsed.ip) setIpAddress(parsed.ip);
        if (parsed.url) setIpAddress(parsed.url);
        if (parsed.username) setUsername(parsed.username);
        if (parsed.password) setPassword(parsed.password);
      } else if (data.startsWith('rtsp://')) {
        const match = data.match(/rtsp:\/\/(.*?):(.*?)@(.*)/);
        if (match) {
          setUsername(decodeURIComponent(match[1]));
          setPassword(decodeURIComponent(match[2]));
          setIpAddress('rtsp://' + match[3]);
        } else {
          setIpAddress(data);
        }
      } else {
        setIpAddress(data);
      }
      Alert.alert('Scanned!', 'QR Code successfully scanned.', [
        { text: 'OK', onPress: () => setSetupMode('manual') }
      ]);
    } catch (e) {
      setIpAddress(data);
      Alert.alert('Scanned!', 'QR Code scanned.', [
        { text: 'OK', onPress: () => setSetupMode('manual') }
      ]);
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
            onPress={async () => {
              setSetupMode('qr');
              if (!permission?.granted) {
                await requestPermission();
              }
              setScanned(false);
            }}
          >
            <QrCode size={20} color={setupMode === 'qr' ? '#000' : '#FFF'} />
            <Text style={[styles.toggleText, setupMode === 'qr' && styles.activeToggleText]}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {setupMode === 'manual' ? (
          <>
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
              <TouchableOpacity style={styles.testBtn} onPress={handleTestConnection}>
                <Text style={styles.testBtnText}>Test Connection</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.addBtn} onPress={handleSave}>
                <Text style={styles.addBtnText}>Save Camera</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.scannerContainer}>
            {!permission ? (
              <Text style={styles.permissionText}>Requesting camera permission...</Text>
            ) : !permission.granted ? (
              <View style={styles.permissionBox}>
                <Text style={styles.permissionText}>We need your permission to use the camera</Text>
                <TouchableOpacity style={styles.addBtn} onPress={requestPermission}>
                  <Text style={styles.addBtnText}>Grant Permission</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraWrapper}>
                <CameraView 
                  style={styles.camera} 
                  facing="back"
                  onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
                <View style={styles.scannerOverlay}>
                  <View style={styles.scannerTarget} />
                  <Text style={styles.scannerInstruction}>Point at a QR Code</Text>
                </View>
              </View>
            )}
          </View>
        )}

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

      {/* Test Stream Modal */}
      <Modal visible={showTestStream} transparent={true} animationType="slide">
        <View style={styles.testStreamOverlay}>
          <View style={styles.testStreamContainer}>
            <Text style={styles.modalTitle}>Live Stream Preview</Text>
            <Text style={{ color: '#94A3B8', marginBottom: 15 }}>{testUrl}</Text>
            
            <View style={styles.testStreamVideoBox}>
              {Platform.OS === 'web' ? (
                <img 
                  src={`${API_URL}/api/cameras/test-stream?url=${encodeURIComponent(testUrl)}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                  alt="Live Test" 
                  onError={(e) => { e.target.onerror = null; e.target.src = ''; alert('Failed to connect to stream through backend.'); }} 
                />
              ) : (
                <WebView 
                  source={{ uri: `${API_URL}/api/cameras/test-stream?url=${encodeURIComponent(testUrl)}` }} 
                  style={{ width: '100%', height: '100%', backgroundColor: '#0F172A' }}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                />
              )}
            </View>

            <TouchableOpacity style={styles.addBtn} onPress={() => setShowTestStream(false)}>
              <Text style={styles.addBtnText}>Close Preview</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, width: '100%' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, width: '100%' },
  
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
  modalCloseText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 },
  
  testStreamOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  testStreamContainer: { width: '100%', backgroundColor: '#161B29', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#00E5FF' },
  testStreamVideoBox: { width: '100%', height: 300, backgroundColor: '#0F172A', borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  
  scannerContainer: { height: 400, width: '100%', borderRadius: 15, backgroundColor: '#161B29', borderWidth: 1, borderColor: '#1E293B' },
  permissionBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 15 },
  permissionText: { color: '#FFF', textAlign: 'center', fontSize: 16 },
  cameraWrapper: { flex: 1 },
  camera: { flex: 1 },
  scannerOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scannerTarget: { width: 220, height: 220, borderWidth: 2, borderColor: '#00E5FF', borderRadius: 20, backgroundColor: 'transparent' },
  scannerInstruction: { color: '#FFF', marginTop: 20, fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 }
});
