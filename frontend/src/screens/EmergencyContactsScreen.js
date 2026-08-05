import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, StatusBar 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, Mail, User, Phone, Trash2, Send, Plus, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = 'http://192.168.137.1:8000';

export default function EmergencyContactsScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // New Contact Form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/contacts/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!newName.trim() || (!newEmail.trim() && !newPhone.trim())) {
      Alert.alert("Error", "Please provide a name and at least an email or phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        name: newName.trim(),
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
      };

      const res = await fetch(`${API_URL}/api/contacts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Alert.alert("Success", "Emergency contact added!");
        setNewName('');
        setNewEmail('');
        setNewPhone('');
        fetchContacts();
      } else {
        const data = await res.json();
        Alert.alert("Error", data.detail || "Failed to add contact.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContact = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setContacts(contacts.filter(c => c.id !== id));
      } else {
        Alert.alert("Error", "Failed to delete contact.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(`${API_URL}/api/alerts/test-email`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (res.ok) {
        Alert.alert("Test Sent!", data.message || "Test email dispatched successfully.");
      } else {
        Alert.alert("Test Failed", data.detail || "Could not send test email.");
      }
    } catch (e) {
      Alert.alert("Error", "Network error while triggering test email.");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* Info Card */}
        <View style={styles.infoCard}>
          <ShieldAlert color="#00E5FF" size={32} style={{ marginBottom: 10 }} />
          <Text style={styles.infoTitle}>Email Alert System</Text>
          <Text style={styles.infoDesc}>
            When a dangerous incident is detected, an automatic emergency email will be dispatched to your account email and all configured emergency contacts below.
          </Text>
        </View>

        {/* Action Button: Test Email */}
        <TouchableOpacity 
          style={styles.testBtn} 
          onPress={handleTestEmail}
          disabled={isTesting}
        >
          {isTesting ? (
            <ActivityIndicator color="#0A0E17" />
          ) : (
            <>
              <Send color="#0A0E17" size={20} />
              <Text style={styles.testBtnText}>Send Test Email</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Add New Contact</Text>
        <View style={styles.formCard}>
          <View style={styles.inputContainer}>
            <User color="#64748B" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Name (e.g. John Doe)"
              placeholderTextColor="#64748B"
              value={newName}
              onChangeText={setNewName}
            />
          </View>
          <View style={styles.inputContainer}>
            <Mail color="#64748B" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
            />
          </View>
          <View style={styles.inputContainer}>
            <Phone color="#64748B" size={20} />
            <TextInput
              style={styles.input}
              placeholder="Phone Number (Optional)"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
              value={newPhone}
              onChangeText={setNewPhone}
            />
          </View>
          <TouchableOpacity 
            style={styles.saveBtn} 
            onPress={handleAddContact}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0A0E17" />
            ) : (
              <>
                <Plus color="#0A0E17" size={20} />
                <Text style={styles.saveBtnText}>Save Contact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Saved Contacts</Text>
        {loading ? (
          <ActivityIndicator color="#00E5FF" style={{ marginTop: 20 }} />
        ) : contacts.length === 0 ? (
          <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.email && <Text style={styles.contactSub}>{contact.email}</Text>}
                  {contact.phone && <Text style={styles.contactSub}>{contact.phone}</Text>}
                </View>
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteContact(contact.id)}>
                <Trash2 color="#FF5252" size={20} />
              </TouchableOpacity>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  
  infoCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, alignItems: 'center' },
  infoTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  infoDesc: { color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  
  testBtn: { backgroundColor: '#00E5FF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 30, gap: 10 },
  testBtnText: { color: '#0A0E17', fontSize: 16, fontWeight: 'bold' },
  
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  formCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 30 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 15, marginBottom: 15, borderWidth: 1, borderColor: '#1E293B' },
  input: { flex: 1, color: '#FFF', paddingVertical: 14, marginLeft: 10, fontSize: 14 },
  saveBtn: { backgroundColor: '#00E5FF', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 14, borderRadius: 10, marginTop: 5, gap: 10 },
  saveBtnText: { color: '#0A0E17', fontSize: 15, fontWeight: 'bold' },

  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#161B29', padding: 15, borderRadius: 12, marginBottom: 10 },
  contactLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', marginRight: 15, borderWidth: 1, borderColor: '#1E293B' },
  avatarText: { color: '#00E5FF', fontSize: 18, fontWeight: 'bold' },
  contactName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  contactSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 10, backgroundColor: '#FF52521A', borderRadius: 10 },
  
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }
});
