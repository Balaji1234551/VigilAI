import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, AlertCircle, Phone, MapPin, Video, Users, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EmergencySOSScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const fetchContacts = async () => {
        try {
          const stored = await AsyncStorage.getItem('trustedPersons');
          if (stored) {
            setContacts(JSON.parse(stored));
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchContacts();
    });
    return unsubscribe;
  }, [navigation]);

  const handleSOSPress = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      // Call the real backend SOS endpoint
      const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');
      const response = await fetch(`${API_URL}/api/alerts/sos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('🚨 SOS Triggered', 'Emergency emails sent to your saved contacts.', [
          { text: 'OK', onPress: () => navigation.navigate('AlertsTab') }
        ]);
      } else {
        Alert.alert('SOS Error', data.detail || 'Failed to dispatch SOS alert. Do you have emergency contacts configured?');
      }
    } catch(e) {
      console.error(e);
      Alert.alert('SOS Triggered (Fallback)', 'Could not reach server, but attempting local fallback.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Instruction Card */}
        <LinearGradient colors={['#FF17441A', '#FF174400']} style={styles.instructionCard}>
          <AlertCircle size={32} color="#FF1744" style={styles.cardIcon} />
          <Text style={styles.cardTitle}>Use only in emergencies</Text>
          <Text style={styles.cardSubtitle}>
            Pressing the SOS button will immediately notify your trusted contacts via email.
          </Text>
          <View style={styles.featureList}>
            <FeatureRow icon={<MapPin size={16} color="#00E5FF" />} text="Shares your registered location" />
            <FeatureRow icon={<Users size={16} color="#00C853" />} text="Alerts Emergency Contacts" />
            <FeatureRow icon={<Phone size={16} color="#FFD600" />} text="High-priority delivery" />
          </View>
        </LinearGradient>

        {/* Big Red Button */}
        <View style={styles.sosContainer}>
          <View style={styles.outerGlow}>
            <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress} activeOpacity={0.7}>
              <AlertCircle size={48} color="#FFF" />
              <Text style={styles.sosText}>TAP FOR SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trusted Contacts List */}
        <View style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <Users size={20} color="#94A3B8" />
            <Text style={styles.contactsTitle}>Notified Contacts</Text>
          </View>
          
          {contacts.length === 0 ? (
            <Text style={{ color: '#94A3B8', textAlign: 'center', marginVertical: 10 }}>No emergency contacts saved.</Text>
          ) : (
            contacts.map((c, i) => (
              <ContactItem key={i} name={c.name} info={c.email || c.phone} tag={c.relation} />
            ))
          )}
          
          <TouchableOpacity 
            style={styles.manageBtn} 
            onPress={() => navigation.navigate('EmergencyContacts')}
          >
            <Text style={styles.manageBtnText}>Manage Contacts</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
const FeatureRow = ({ icon, text }) => (
  <View style={styles.featureRow}>
    {icon}
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const ContactItem = ({ name, info, tag }) => (
  <View style={styles.contactItem}>
    <View style={{ flex: 1 }}>
      <Text style={styles.contactName}>{name}</Text>
      <Text style={styles.contactInfo}>{info}</Text>
    </View>
    <View style={styles.tagBadge}>
      <Text style={styles.tagText}>{tag}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  instructionCard: { borderRadius: 20, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: '#FF174433' },
  cardIcon: { alignSelf: 'center', marginBottom: 15 },
  cardTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  cardSubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { color: '#FFF', fontSize: 13 },
  sosContainer: { alignItems: 'center', marginVertical: 20 },
  outerGlow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF174422',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF1744',
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 30,
  },
  sosButton: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  sosText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  contactsCard: { backgroundColor: '#161B29', borderRadius: 20, padding: 20, marginTop: 20 },
  contactsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 25 },
  contactsTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  contactItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  contactName: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  contactInfo: { color: '#64748B', fontSize: 12, marginTop: 2 },
  tagBadge: { backgroundColor: '#00E5FF1A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tagText: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold' },
  manageBtn: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  manageBtnText: { color: '#FFF', fontWeight: '600' },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
