import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, TextInput, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Smartphone, Mail, MessageSquare, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');

export default function NotificationSettingsScreen({ navigation }) {
  const [masterToggle, setMasterToggle] = useState(true);
  const [alerts, setAlerts] = useState({
    fall: true,
    weapon: true,
    fight: true,
    loitering: false,
  });
  const [delivery, setDelivery] = useState({
    push: true,
    email: true,
    sms: false,
    quietHours: false,
  });
  const [userEmail, setUserEmail] = useState("alex.johnson@email.com");

  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserEmail(userData.email || "user@email.com");
        }
        
        const storedPrefs = await AsyncStorage.getItem('notificationPrefs');
        if (storedPrefs) {
          const parsed = JSON.parse(storedPrefs);
          if (parsed.alerts) setAlerts(parsed.alerts);
          if (parsed.delivery) setDelivery(parsed.delivery);
        }

        if (token) {
          const response = await fetch(`${API_URL}/api/auth/preferences`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.alerts && !storedPrefs) setAlerts(data.alerts);
            if (data.delivery && !storedPrefs) setDelivery(data.delivery);
          }
        }
      } catch (error) {
        console.error('Failed to fetch preferences', error);
      }
    };
    
    fetchPreferences();
    const unsubscribe = navigation.addListener('focus', fetchPreferences);
    
    return unsubscribe;
  }, [navigation]);

  const savePreferences = async (newAlerts, newDelivery) => {
    try {
      await AsyncStorage.setItem('notificationPrefs', JSON.stringify({ alerts: newAlerts, delivery: newDelivery }));
      
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        await fetch(`${API_URL}/api/auth/preferences`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            alerts: newAlerts,
            delivery: newDelivery
          })
        });
      }
    } catch (error) {
      console.error('Failed to save preferences', error);
    }
  };

  const toggleAlert = (key) => {
    setAlerts(prev => {
      const newAlerts = { ...prev, [key]: !prev[key] };
      savePreferences(newAlerts, delivery);
      return newAlerts;
    });
  };

  const toggleDelivery = (key) => {
    setDelivery(prev => {
      const newDelivery = { ...prev, [key]: !prev[key] };
      savePreferences(alerts, newDelivery);
      return newDelivery;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Master Toggle */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Enable All Notifications</Text>
              <Text style={styles.cardSubtitle}>Receive alerts for all events</Text>
            </View>
            <Switch 
              value={masterToggle} 
              onValueChange={setMasterToggle}
              trackColor={{ false: '#1E293B', true: '#00E5FF' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

        {/* Alert Types Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Alert Types</Text>
          <SettingItem title="Fall Alerts" sub="Critical Priority" val={alerts.fall} onToggle={() => toggleAlert('fall')} />
          <SettingItem title="Weapon Alerts" sub="Critical Priority" val={alerts.weapon} onToggle={() => toggleAlert('weapon')} />
          <SettingItem title="Fight Alerts" sub="High Priority" val={alerts.fight} onToggle={() => toggleAlert('fight')} />
          <SettingItem title="Loitering Alerts" sub="Medium Priority" val={alerts.loitering} onToggle={() => toggleAlert('loitering')} isLast />
        </View>

        {/* Delivery Methods Section */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery Methods</Text>
          
          <DeliveryItem 
            icon={<Smartphone size={20} color="#94A3B8" />} 
            label="Push Notifications" 
            val={delivery.push} 
            onToggle={() => toggleDelivery('push')} 
          />
          
          <View style={styles.emailContainer}>
            <DeliveryItem 
              icon={<Mail size={20} color="#94A3B8" />} 
              label="Email Alerts" 
              val={delivery.email} 
              onToggle={() => toggleDelivery('email')} 
            />
            {delivery.email && (
              <TextInput 
                style={styles.emailInput} 
                value={userEmail} 
                editable={false} 
              />
            )}
          </View>

          <View style={styles.emailContainer}>
            <DeliveryItem 
              icon={<MessageSquare size={20} color="#94A3B8" />} 
              label="SMS Alerts" 
              val={delivery.sms} 
              onToggle={() => toggleDelivery('sms')} 
              isLast={!delivery.sms} 
            />
            {delivery.sms && (
              <View style={styles.smsInputContainer}>
                <Text style={styles.inputLabel}>Secondary Mobile (e.g. Father/Emergency)</Text>
                <View style={styles.smsRow}>
                  <TextInput 
                    style={[styles.emailInput, { flex: 1, marginBottom: 0 }]} 
                    value={delivery.secondarySms || ''} 
                  onChangeText={(text) => {
                    setDelivery({ ...delivery, secondarySms: text });
                  }}
                  placeholder="+1234567890"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                />
                <TouchableOpacity 
                  style={styles.saveBtn}
                  onPress={() => {
                    savePreferences(alerts, delivery);
                    alert("Secondary mobile number saved!");
                  }}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
              </View>
            )}
          </View>
        </View>

        {/* Quiet Hours Card */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Quiet Hours</Text>
              <Text style={styles.cardSubtitle}>Mute non-critical alerts</Text>
            </View>
            <Switch 
              value={delivery.quietHours} 
              onValueChange={() => toggleDelivery('quietHours')}
              trackColor={{ false: '#1E293B', true: '#00E5FF' }}
              thumbColor="#FFF"
            />
          </View>
        </View>

      </ScrollView>

      {/* Navigation Bar */}
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
const SettingItem = ({ title, sub, val, onToggle, isLast }) => (
  <View style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}>
    <View>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingSub}>{sub}</Text>
    </View>
    <Switch value={val} onValueChange={onToggle} trackColor={{ false: '#1E293B', true: '#00E5FF' }} thumbColor="#FFF" />
  </View>
);

const DeliveryItem = ({ icon, label, val, onToggle, isLast }) => (
  <View style={[styles.deliveryRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.deliveryLeft}>
      {icon}
      <Text style={styles.deliveryLabel}>{label}</Text>
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  settingTitle: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  settingSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  deliveryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  deliveryLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  deliveryLabel: { color: '#FFF', fontSize: 16 },
  emailContainer: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  emailInput: { backgroundColor: '#0F172A', color: '#64748B', borderRadius: 10, padding: 12, marginBottom: 15, fontSize: 14, borderWidth: 1, borderColor: '#1E293B' },
  smsInputContainer: { paddingHorizontal: 15, paddingBottom: 15 },
  inputLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 8 },
  smsRow: { flexDirection: 'row', alignItems: 'center' },
  saveBtn: { backgroundColor: '#00E5FF', borderRadius: 10, paddingHorizontal: 15, paddingVertical: 12, justifyContent: 'center', marginLeft: 10 },
  saveBtnText: { color: '#0A0E17', fontWeight: 'bold', fontSize: 14 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
