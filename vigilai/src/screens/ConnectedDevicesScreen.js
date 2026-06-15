import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Monitor, Tablet, Trash2, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

export default function ConnectedDevicesScreen({ navigation }) {
  const actualDeviceName = Platform.OS === 'web' ? 'Web Browser' : (Device.deviceName || Device.modelName || 'My Device');
  const actualDeviceType = Platform.OS === 'web' ? 'Desktop' : (Device.deviceType === 2 ? 'Tablet' : 'Mobile');

  const [devices, setDevices] = useState([
    { id: 1, type: actualDeviceType, name: actualDeviceName, location: 'Current Location', status: 'Active now', isActive: true, isThisDevice: true },
    { id: 2, type: 'Desktop', name: 'MacBook Pro', location: 'New York, USA', status: '2 hours ago', isActive: false, isThisDevice: false },
    { id: 3, type: 'Tablet', name: 'iPad Air', location: 'New York, USA', status: 'Yesterday', isActive: false, isThisDevice: false },
  ]);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const stored = await AsyncStorage.getItem('connectedDevices');
        if (stored) {
          let parsed = JSON.parse(stored);
          // Always ensure the current device reflects the real physical device properties
          parsed = parsed.map(d => 
            d.isThisDevice 
              ? { ...d, name: actualDeviceName, type: actualDeviceType } 
              : d
          );
          setDevices(parsed);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadDevices();
  }, [actualDeviceName, actualDeviceType]);

  const saveDevices = async (newDevices) => {
    setDevices(newDevices);
    try {
      await AsyncStorage.setItem('connectedDevices', JSON.stringify(newDevices));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRemoveDevice = (id, name) => {
    Alert.alert(
      'Remove Device',
      `Are you sure you want to sign out the "${name}"? You will need to log back in on that device to access VigilAI.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => {
            saveDevices(devices.filter(d => d.id !== id));
            Alert.alert('Device Removed', `${name} has been successfully signed out.`);
          }
        }
      ]
    );
  };

  const handleSignOutAll = () => {
    const otherDevices = devices.filter(d => !d.isThisDevice);
    if (otherDevices.length === 0) {
      Alert.alert('No Other Devices', 'You have no other connected devices to sign out.');
      return;
    }

    Alert.alert(
      'Sign Out All Other Devices',
      'This will instantly log out all other devices connected to your account. Your current session will remain active. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out All', 
          style: 'destructive', 
          onPress: () => {
            saveDevices(devices.filter(d => d.isThisDevice));
            Alert.alert('Success', 'All other devices have been forcefully disconnected.');
          }
        }
      ]
    );
  };

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'Desktop': return <Monitor size={24} color="#00E5FF" />;
      case 'Tablet': return <Tablet size={24} color="#00E5FF" />;
      case 'Mobile': default: return <Smartphone size={24} color="#00E5FF" />;
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
        <Text style={styles.headerTitle}>Connected Devices</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            These devices are currently logged into your account. Remove any devices you don't recognize.
          </Text>
        </View>

        {/* Device List */}
        {devices.map(device => (
          <DeviceCard 
            key={device.id}
            icon={getDeviceIcon(device.type)}
            name={device.name} 
            type={device.type} 
            location={device.location} 
            status={device.status} 
            isActive={device.isActive} 
            isThisDevice={device.isThisDevice}
            onRemove={() => handleRemoveDevice(device.id, device.name)}
          />
        ))}

        {/* Security Tip Card */}
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>Security Tip</Text>
          <Text style={styles.tipText}>
            If you see a device you don't recognize, remove it immediately and change your password.
          </Text>
        </View>

        {/* Sign Out All Button */}
        <TouchableOpacity style={styles.signOutAllBtn} onPress={handleSignOutAll}>
          <Text style={styles.signOutAllText}>Sign Out All Other Devices</Text>
        </TouchableOpacity>

      </ScrollView>

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
const DeviceCard = ({ icon, name, type, location, status, isActive, isThisDevice, onRemove }) => (
  <View style={styles.deviceCard}>
    <View style={styles.deviceIconBg}>
      {icon}
    </View>
    <View style={styles.deviceInfo}>
      <View style={styles.deviceHeader}>
        <Text style={styles.deviceName}>{name}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? '#00C853' : '#94A3B8' }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </View>
      <Text style={styles.deviceSub}>{type}</Text>
      <Text style={styles.deviceSub}>{location}</Text>
      
      {isThisDevice ? (
        <Text style={styles.thisDeviceText}>This device</Text>
      ) : (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Trash2 size={16} color="#FF1744" />
          <Text style={styles.removeText}>Remove Device</Text>
        </TouchableOpacity>
      )}
    </View>
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
  infoBox: { backgroundColor: '#161B29', padding: 20, borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  infoText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  deviceCard: { flexDirection: 'row', backgroundColor: '#161B29', borderRadius: 15, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#1E293B' },
  deviceIconBg: { width: 45, height: 45, borderRadius: 12, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  deviceInfo: { flex: 1 },
  deviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deviceName: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#94A3B8', fontSize: 11 },
  deviceSub: { color: '#64748B', fontSize: 13, marginTop: 2 },
  thisDeviceText: { color: '#00E5FF', fontSize: 13, fontWeight: '600', marginTop: 12 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  removeText: { color: '#FF1744', fontSize: 13, fontWeight: '600' },
  tipCard: { backgroundColor: '#FF17440A', padding: 20, borderRadius: 15, borderLeftWidth: 4, borderLeftColor: '#FF1744', marginTop: 10, marginBottom: 20 },
  tipTitle: { color: '#FF1744', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  tipText: { color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  signOutAllBtn: { height: 55, borderRadius: 15, borderWidth: 1, borderColor: '#FF174433', justifyContent: 'center', alignItems: 'center' },
  signOutAllText: { color: '#FF1744', fontWeight: 'bold', fontSize: 16 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});