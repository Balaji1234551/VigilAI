import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, TextInput, StatusBar, Platform, Alert, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, Lock, Fingerprint, Download, Trash2, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.241.125.80:8000';

export default function PrivacySecurityScreen({ navigation }) {
  const [privacy, setPrivacy] = useState({
    faceBlurring: true,
    motionBlur: false,
    audioRecording: true,
  });
  const [data, setData] = useState({
    edgeProcessing: true,
    cloudBackup: false,
  });
  const [security, setSecurity] = useState({
    twoFactor: false,
    biometric: true,
  });
  const [autoDeleteDays, setAutoDeleteDays] = useState('30');

  // Password Reset State
  const [isPasswordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordStep, setPasswordStep] = useState(1);
  const [actualCode, setActualCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem('privacySecuritySettings');
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          if (parsed.privacy) setPrivacy(parsed.privacy);
          if (parsed.data) setData(parsed.data);
          if (parsed.security) setSecurity(parsed.security);
          if (parsed.autoDeleteDays) setAutoDeleteDays(parsed.autoDeleteDays);
        }

        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          const response = await fetch(`${API_URL}/api/settings`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setPrivacy(prev => ({
              ...prev,
              faceBlurring: data.faceBlurring !== undefined ? data.faceBlurring : prev.faceBlurring,
              motionBlur: data.motionBlur !== undefined ? data.motionBlur : prev.motionBlur,
              audioRecording: data.audioRecording !== undefined ? data.audioRecording : prev.audioRecording,
            }));
            setData(prev => ({
              ...prev,
              edgeProcessing: data.edgeProcessing !== undefined ? data.edgeProcessing : prev.edgeProcessing,
            }));
            setSecurity(prev => ({
              ...prev,
              twoFactor: data.twoFactor !== undefined ? data.twoFactor : prev.twoFactor,
              biometric: data.biometric !== undefined ? data.biometric : prev.biometric,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch settings', error);
      }
    };
    fetchSettings();
  }, []);

  const saveSetting = async (key, value, category) => {
    try {
      const currentStored = await AsyncStorage.getItem('privacySecuritySettings');
      let currentObj = currentStored ? JSON.parse(currentStored) : { privacy, data, security, autoDeleteDays };
      
      if (category) {
        currentObj[category] = { ...currentObj[category], [key]: value };
      } else if (key === 'autoDeleteDays') {
        currentObj.autoDeleteDays = value;
      }
      
      await AsyncStorage.setItem('privacySecuritySettings', JSON.stringify(currentObj));

      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await fetch(`${API_URL}/api/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            settings: [{ setting_name: key, setting_value: String(value) }]
          })
        });
      }
    } catch (error) {
      console.error('Failed to save setting', error);
    }
  };

  const toggle = (set, key, category) => {
    set(prev => {
      const newValue = !prev[key];
      saveSetting(key, newValue, category);
      return { ...prev, [key]: newValue };
    });
  };

  const handleAutoDeleteChange = (text) => {
    setAutoDeleteDays(text);
    saveSetting('autoDeleteDays', text, null);
  };

  const handleChangePasswordPress = () => {
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setActualCode(generatedCode);
    setPasswordStep(1);
    setVerifyCode('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordModalVisible(true);

    // Simulate sending email by popping a notification after 1 second
    setTimeout(() => {
      Alert.alert(
        "📬 Simulated Email Received", 
        `To: kurubabalaji04@gmail.com\n\nYour VigilAI password reset code is: ${generatedCode}\n\nDo not share this code with anyone.`
      );
    }, 1000);
  };

  const handleVerifyCode = () => {
    if (verifyCode.trim() === actualCode) { 
      setPasswordStep(2);
    } else {
      Alert.alert('Invalid Code', 'The code you entered is incorrect. Please enter the exact 6-digit code sent to your email.');
    }
  };

  const handleUpdatePassword = () => {
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'The new passwords do not match.');
      return;
    }
    setPasswordModalVisible(false);
    Alert.alert('Success', 'Your password has been successfully updated and secured.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Privacy Mode Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Privacy Mode</Text>
          
          <ToggleRow 
            title="Face Blurring" 
            sub="Automatically blur faces in recordings" 
            val={privacy.faceBlurring} 
            onToggle={() => toggle(setPrivacy, 'faceBlurring', 'privacy')} 
          />
          
          {privacy.faceBlurring && (
            <View style={styles.previewBox}>
              <Eye size={20} color="#94A3B8" />
              <Text style={styles.previewText}>Preview: Faces will appear blurred</Text>
            </View>
          )}

          <ToggleRow 
            title="Motion Blur" 
            sub="Blur moving objects" 
            val={privacy.motionBlur} 
            onToggle={() => toggle(setPrivacy, 'motionBlur', 'privacy')} 
          />
          <ToggleRow 
            title="Audio Recording" 
            sub="Record audio with video" 
            val={privacy.audioRecording} 
            onToggle={() => toggle(setPrivacy, 'audioRecording', 'privacy')} 
            isLast 
          />
        </View>

        {/* Data Storage Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data Storage</Text>
          <ToggleRow 
            title="Edge Processing" 
            sub="Process data locally on device" 
            val={data.edgeProcessing} 
            onToggle={() => toggle(setData, 'edgeProcessing', 'data')} 
          />
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Auto-delete alerts after (days)</Text>
            <TextInput 
              style={styles.input} 
              value={autoDeleteDays}
              onChangeText={handleAutoDeleteChange}
              placeholder="30" 
              placeholderTextColor="#475569" 
              keyboardType="numeric"
            />
          </View>

          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Text style={styles.toggleTitle}>Cloud Backup</Text>
              <View style={styles.premiumBadge}><Text style={styles.premiumText}>Premium</Text></View>
            </View>
            <Switch value={data.cloudBackup} disabled trackColor={{ false: '#1E293B' }} />
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Security</Text>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleChangePasswordPress}
          >
            <View style={styles.row}>
              <Lock size={20} color="#94A3B8" />
              <Text style={styles.menuText}>Change Password</Text>
            </View>
          </TouchableOpacity>

          <ToggleRow 
            title="Two-Factor Authentication" 
            val={security.twoFactor} 
            onToggle={() => toggle(setSecurity, 'twoFactor', 'security')} 
          />
          
          <View style={[styles.rowBetween, { paddingVertical: 15 }]}>
            <View style={styles.row}>
              <Fingerprint size={20} color="#94A3B8" />
              <Text style={[styles.toggleTitle, { marginLeft: 15 }]}>Biometric Login</Text>
            </View>
            <Switch 
              value={security.biometric} 
              onValueChange={() => toggle(setSecurity, 'biometric', 'security')}
              trackColor={{ false: '#1E293B', true: '#00E5FF' }}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('TrustedPersons')}
          >
            <Text style={styles.outlineText}>Trusted Persons</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.outlineBtn}
            onPress={() => navigation.navigate('PrivacyZones')}
          >
            <Text style={styles.outlineText}>Privacy Zones</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.exportBtn}
          onPress={() => Alert.alert("Export Data", "Your data export is being generated. You will receive a secure download link via email shortly.")}
        >
          <Download size={20} color="#FFF" />
          <Text style={styles.exportText}>Export My Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.deleteBtn}
          onPress={() => {
            Alert.alert(
              "Delete Account", 
              "Are you absolutely sure? This will permanently erase all video logs, alerts, and settings. This cannot be undone.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => {
                  AsyncStorage.clear();
                  navigation.replace('Login');
                }}
              ]
            );
          }}
        >
          <Trash2 size={20} color="#FF1744" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>

            {passwordStep === 1 ? (
              <>
                <Text style={styles.modalSubtitle}>
                  For your security, we've sent a verification code to your registered email address.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter Verification Code"
                  placeholderTextColor="#64748B"
                  value={verifyCode}
                  onChangeText={setVerifyCode}
                  keyboardType="number-pad"
                />
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPasswordModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleVerifyCode}>
                    <Text style={styles.modalSaveText}>Verify Code</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Your code was verified. Please enter your new password below.
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm New Password"
                  placeholderTextColor="#64748B"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <View style={styles.modalButtonRow}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setPasswordModalVisible(false)}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleUpdatePassword}>
                    <Text style={styles.modalSaveText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#94A3B8" />} label="Home" onPress={() => navigation.navigate('Home')} />
        <TabItem icon={<Camera size={24} color="#94A3B8" />} label="Cameras" onPress={() => navigation.navigate('Cameras')} />
        <TabItem icon={<Bell size={24} color="#94A3B8" />} label="Alerts" onPress={() => navigation.navigate('Alerts')} />
        <TabItem icon={<BarChart2 size={24} color="#94A3B8" />} label="Analytics" onPress={() => navigation.navigate('Analytics')} />
        <TabItem icon={<User size={24} color="#00E5FF" />} label="Profile" active onPress={() => navigation.navigate('Profile')} />
      </View>
    </SafeAreaView>
  );
}

// Sub-components
const ToggleRow = ({ title, sub, val, onToggle, isLast }) => (
  <View style={[styles.toggleRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={{ flex: 1 }}>
      <Text style={styles.toggleTitle}>{title}</Text>
      {sub && <Text style={styles.toggleSub}>{sub}</Text>}
    </View>
    <Switch value={val} onValueChange={onToggle} trackColor={{ false: '#1E293B', true: '#00E5FF' }} thumbColor="#FFF" />
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
  card: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  toggleTitle: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  toggleSub: { color: '#64748B', fontSize: 12, marginTop: 4 },
  previewBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 15, borderRadius: 12, marginVertical: 10, gap: 12 },
  previewText: { color: '#94A3B8', fontSize: 13 },
  inputGroup: { marginVertical: 15 },
  label: { color: '#FFF', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#0F172A', borderRadius: 10, height: 50, paddingHorizontal: 15, color: '#FFF', borderWidth: 1, borderColor: '#1E293B' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  premiumBadge: { backgroundColor: '#00E5FF33', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5, marginLeft: 10 },
  premiumText: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold' },
  menuItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  menuText: { color: '#FFF', fontSize: 16, marginLeft: 15 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  outlineBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#00BFA533', justifyContent: 'center', alignItems: 'center' },
  outlineText: { color: '#00BFA5', fontWeight: 'bold' },
  exportBtn: { height: 55, borderRadius: 15, backgroundColor: '#161B29', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1E293B', marginBottom: 15 },
  exportText: { color: '#FFF', fontWeight: 'bold' },
  deleteBtn: { height: 55, borderRadius: 15, backgroundColor: '#FF17440A', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FF174433' },
  deleteText: { color: '#FF1744', fontWeight: 'bold' },
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