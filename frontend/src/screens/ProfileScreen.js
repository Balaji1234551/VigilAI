import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Calendar, ShieldAlert, Bell, Shield, Smartphone, Globe, CreditCard, HelpCircle, FileText, LogOut, Home, BarChart2, User, ChevronRight, Lock, Mail, Phone, Save, Edit3, X } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';
import { useGlobalContext } from '../context/GlobalContext';

export default function ProfileScreen({ navigation }) {
  const { dashStats, cameras } = useGlobalContext();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [selectedLang, setSelectedLang] = useState('English');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const { t } = useTranslation(selectedLang);
  const API_URL = 'http://192.168.137.1:8000';

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const fetchUser = async () => {
        try {
          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.displayName) setUserName(userData.displayName);
            if (userData.email) setUserEmail(userData.email);
            if (userData.phone) setUserPhone(userData.phone);
          }
          const storedLang = await AsyncStorage.getItem('userLanguage');
          if (storedLang) {
            setSelectedLang(storedLang);
          }
        } catch (e) {
          console.error('Failed to load user data', e);
        }
      };
      fetchUser();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: userName,
          phone_number: userPhone
        })
      });

      if (response.ok) {
        const data = await response.json();
        await AsyncStorage.setItem('userData', JSON.stringify({
          ...JSON.parse(await AsyncStorage.getItem('userData')),
          displayName: data.full_name,
          phone: data.phone_number
        }));
        Alert.alert('Success', 'Profile updated successfully!');
        setIsEditing(false); // Disable editing on success
      } else {
        const err = await response.json();
        Alert.alert('Error', err.detail || 'Failed to update profile');
      }
    } catch (e) {
      Alert.alert('Error', 'Network request failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    try {
      setPasswordLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      
      const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
      });
      
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', 'Password updated successfully!');
        setPasswordModalVisible(false);
        setOldPassword('');
        setNewPassword('');
      } else {
        Alert.alert('Error', data.detail || 'Failed to update password');
      }
    } catch (e) {
      Alert.alert('Network Error', 'Could not reach the server.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* User Identity Form */}
        <View style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName ? userName.charAt(0).toUpperCase() : 'U'}</Text>
              {isEditing && (
                <TouchableOpacity style={styles.cameraIconBtn} onPress={() => Alert.alert('Notice', 'Photo upload feature is currently in development.')}>
                  <Camera size={14} color="#000" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={[styles.inputContainer, !isEditing && styles.inputDisabled]}>
              <User size={20} color="#64748B" />
              <TextInput 
                style={[styles.input, !isEditing && { color: '#94A3B8' }]}
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your name"
                placeholderTextColor="#64748B"
                editable={isEditing}
              />
            </View>

            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <Mail size={20} color="#64748B" />
              <TextInput 
                style={[styles.input, { color: '#94A3B8' }]}
                value={userEmail}
                editable={false}
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={[styles.inputContainer, !isEditing && styles.inputDisabled]}>
              <Phone size={20} color="#64748B" />
              <TextInput 
                style={[styles.input, !isEditing && { color: '#94A3B8' }]}
                value={userPhone}
                onChangeText={setUserPhone}
                placeholder="Enter your phone number"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                editable={isEditing}
              />
            </View>
          </View>

          {isEditing ? (
            <View style={styles.editActionRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)} disabled={isSaving}>
                <X size={20} color="#FF5252" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtnHalf} onPress={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#000" /> : (
                  <>
                    <Save size={20} color="#000" />
                    <Text style={styles.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
              <Edit3 size={20} color="#FFF" />
              <Text style={styles.editBtnText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Settings Menu */}
        <View style={styles.menuCard}>
          <MenuItem icon={<Lock size={20} color="#94A3B8" />} label="Change Password" onPress={() => setPasswordModalVisible(true)} />
          <MenuItem icon={<ShieldAlert size={20} color="#94A3B8" />} label="Emergency Contacts" onPress={() => navigation.navigate('EmergencyContacts')} />
          <MenuItem icon={<HelpCircle size={20} color="#94A3B8" />} label={t('helpSupport')} onPress={() => navigation.navigate('HelpSupport')} isLast={true} />
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
            } catch (error) {
              console.error("Error during logout:", error);
              navigation.navigate('Welcome');
            }
          }}
        >
          <LogOut size={20} color="#FF5252" />
          <Text style={styles.logoutText}>{t('logOut')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={passwordModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <Text style={styles.inputLabel}>Current Password</Text>
            <TextInput 
              style={styles.modalInput} 
              secureTextEntry 
              placeholder="Enter current password" 
              placeholderTextColor="#64748B"
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            
            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput 
              style={styles.modalInput} 
              secureTextEntry 
              placeholder="Enter new password" 
              placeholderTextColor="#64748B"
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setPasswordModalVisible(false)} disabled={passwordLoading}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? <ActivityIndicator color="#000" /> : <Text style={styles.modalSubmitText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const MenuItem = ({ icon, label, rightText, isLast, onPress }) => (
  <TouchableOpacity style={[styles.menuItem, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
    <View style={styles.menuLeft}>
      {icon}
      <Text style={styles.menuLabel}>{label}</Text>
    </View>
    <View style={styles.menuRight}>
      {rightText && <View style={styles.badge}><Text style={styles.badgeText}>{rightText}</Text></View>}
      <ChevronRight size={18} color="#475569" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 20, width: '100%' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, width: '100%' },
  userCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  cameraIconBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00BFA5', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#161B29' },
  formGroup: { marginTop: 10 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155', paddingHorizontal: 15, height: 50, marginBottom: 20 },
  inputDisabled: { backgroundColor: '#161B29', borderColor: '#1E293B', opacity: 0.8 },
  input: { flex: 1, color: '#FFF', fontSize: 16, marginLeft: 10, height: '100%' },
  
  editBtn: { backgroundColor: '#1E293B', height: 50, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 10, borderWidth: 1, borderColor: '#334155' },
  editBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  
  editActionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  cancelBtn: { flex: 1, backgroundColor: '#FF52521A', height: 50, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FF525233' },
  cancelBtnText: { color: '#FF5252', fontSize: 16, fontWeight: 'bold' },
  saveBtnHalf: { flex: 1, backgroundColor: '#00E5FF', height: 50, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  menuCard: { backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuLabel: { color: '#FFF', fontSize: 14 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: '#00E5FF33', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', height: 55, borderRadius: 15, borderWidth: 1, borderColor: '#FF525233', backgroundColor: '#FF52520A', justifyContent: 'center', alignItems: 'center', marginTop: 25, gap: 10 },
  logoutText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', width: '100%', borderRadius: 15, padding: 20 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  inputLabel: { color: '#94A3B8', fontSize: 13, marginBottom: 8 },
  modalInput: { backgroundColor: '#0F172A', color: '#FFF', borderRadius: 10, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  modalActions: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancel: { flex: 1, padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#FF525233', alignItems: 'center' },
  modalCancelText: { color: '#FF5252', fontWeight: 'bold' },
  modalSubmit: { flex: 1, padding: 15, borderRadius: 10, backgroundColor: '#00E5FF', alignItems: 'center' },
  modalSubmitText: { color: '#000', fontWeight: 'bold' }
});
