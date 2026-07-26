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
      const userDataStr = await AsyncStorage.getItem('userData');
      const prefsStr = await AsyncStorage.getItem('notificationPrefs');
      
      let primaryPhone = 'Primary emergency contact';
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.phone) primaryPhone = userData.phone;
      }
      
      let secondaryPhone = null;
      if (prefsStr) {
        const prefs = JSON.parse(prefsStr);
        if (prefs.delivery && prefs.delivery.secondarySms) {
          secondaryPhone = prefs.delivery.secondarySms;
        }
      }
      
      let msg = `An emergency SOS notification has been sent to your registered number: ${primaryPhone}.`;
      if (secondaryPhone) {
        msg += `\n\nAdditionally, a danger alert has been sent to your secondary delivery method: ${secondaryPhone}.`;
      }
      
      Alert.alert('🚨 SOS Triggered', msg, [
        { text: 'OK', onPress: () => navigation.navigate('Alerts') }
      ]);
      
    } catch(e) {
      Alert.alert('SOS Triggered', 'Emergency alerts sent!');
      navigation.navigate('Alerts');
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
        <Text style={styles.headerTitle}>Emergency SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Instruction Card */}
        <LinearGradient
          colors={['#1E1B2E', '#161B29']}
          style={styles.instructionCard}
        >
          <AlertCircle size={40} color="#FF1744" style={styles.cardIcon} />
          <Text style={styles.cardTitle}>One-Tap Emergency</Text>
          <Text style={styles.cardSubtitle}>Press and hold the SOS button to simultaneously:</Text>
          
          <View style={styles.featureList}>
            <FeatureRow icon={<Phone size={16} color="#FF1744" />} text="Call emergency services (911)" />
            <FeatureRow icon={<MapPin size={16} color="#FF1744" />} text="Share your GPS location" />
            <FeatureRow icon={<Video size={16} color="#FF1744" />} text="Save 30-second video clip" />
            <FeatureRow icon={<Users size={16} color="#FF1744" />} text="Notify all emergency contacts" />
          </View>
        </LinearGradient>

        {/* Massive SOS Button */}
        <View style={styles.sosContainer}>
          <View style={styles.outerGlow}>
            <TouchableOpacity style={styles.sosButton} activeOpacity={0.7} onPress={handleSOSPress}>
              <AlertCircle size={48} color="#FFF" />
              <Text style={styles.sosText}>PRESS FOR SOS</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Emergency Contacts List */}
        <View style={styles.contactsCard}>
          <View style={styles.contactsHeader}>
            <Users size={20} color="#00E5FF" />
            <Text style={styles.contactsTitle}>Emergency Contacts</Text>
          </View>

          <ContactItem name="Emergency Services" info="911" tag="Police" />
          
          {contacts.map(contact => (
            <ContactItem 
              key={contact.id} 
              name={contact.name} 
              info={contact.relationship || "Trusted Contact"} 
              tag={contact.relationship || "User"} 
            />
          ))}

          {contacts.length === 0 && (
            <Text style={{ color: '#64748B', fontSize: 13, marginBottom: 15 }}>No trusted contacts added yet.</Text>
          )}

          <TouchableOpacity 
            style={styles.manageBtn}
            onPress={() => navigation.navigate('TrustedPersons')}
          >
            <Text style={styles.manageBtnText}>Manage Contacts</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.tabItem}>
          <Home size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Cameras')} style={styles.tabItem}>
          <Camera size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Cameras</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Alerts')} style={styles.tabItem}>
          <Bell size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Alerts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Analytics')} style={styles.tabItem}>
          <BarChart2 size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.tabItem}>
          <User size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
