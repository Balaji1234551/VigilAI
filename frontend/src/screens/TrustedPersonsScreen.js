import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Alert, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, UserPlus, Trash2, Camera, Home, Bell, BarChart2, User, Image as ImageIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export default function TrustedPersonsScreen({ navigation }) {
  const [persons, setPersons] = useState([
    { id: 1, initials: 'SJ', name: 'Sarah Johnson', role: 'Family', details: '3 cameras • Added 1 week ago', image: null },
    { id: 2, initials: 'MC', name: 'Michael Chen', role: 'Caregiver', details: '3 cameras • Added 1 month ago', image: null },
    { id: 3, initials: 'ED', name: 'Emma Davis', role: 'Family', details: '2 cameras • Added 3 weeks ago', image: null }
  ]);

  const [isModalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await AsyncStorage.getItem('trustedPersons');
        if (stored) {
          setPersons(JSON.parse(stored));
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadData();
  }, []);

  const savePersons = async (newPersons) => {
    setPersons(newPersons);
    try {
      await AsyncStorage.setItem('trustedPersons', JSON.stringify(newPersons));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert(
      'Remove Person',
      `Are you sure you want to remove ${name}? All their encrypted facial data will be permanently deleted from this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: () => savePersons(persons.filter(p => p.id !== id))
        }
      ]
    );
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You need to allow access to your photos to add a trusted person.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSavePerson = () => {
    if (!newName.trim() || !newRole.trim()) {
      Alert.alert("Missing Info", "Please enter both a name and a role.");
      return;
    }
    if (!selectedImage) {
      Alert.alert("Missing Photos", "Please select at least 1 clear photo from the gallery to build the facial map.");
      return;
    }

    const initials = newName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'GU';

    const newPerson = {
      id: Date.now(),
      initials,
      name: newName,
      role: newRole,
      details: 'All cameras • Added just now',
      image: selectedImage
    };

    savePersons([...persons, newPerson]);
    setModalVisible(false);
    setNewName('');
    setNewRole('');
    setSelectedImage(null);

    Alert.alert('Success', 'Facial map created successfully! ' + newName + ' has been added to your Trusted List.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );
}

// Sub-components
const PersonItem = ({ initials, name, role, details, image, isLast, onDelete }) => (
  <View style={[styles.personRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.avatar}>
      {image ? (
        <Image source={{ uri: image }} style={{ width: 45, height: 45, borderRadius: 23 }} />
      ) : (
        <Text style={styles.avatarText}>{initials}</Text>
      )}
    </View>
    <View style={{ flex: 1, marginLeft: 15 }}>
      <Text style={styles.personName}>{name}</Text>
      <Text style={styles.personRole}>{role}</Text>
      <View style={styles.row}>
        <Camera size={12} color="#64748B" />
        <Text style={styles.personDetails}>{details}</Text>
      </View>
    </View>
    <TouchableOpacity onPress={onDelete} style={{ padding: 10 }}>
      <Trash2 size={18} color="#FF1744" />
    </TouchableOpacity>
  </View>
);

const StepItem = ({ number, text }) => (
  <View style={styles.stepRow}>
    <Text style={styles.stepNumber}>{number}.</Text>
    <Text style={styles.stepText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  privacyCard: { backgroundColor: '#00C8530D', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#00C85333' },
  privacyTitle: { color: '#00C853', fontSize: 16, fontWeight: 'bold' },
  privacyText: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginTop: 10 },
  boldText: { color: '#FFF', fontWeight: 'bold' },
  listCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  addBtn: { flexDirection: 'row', backgroundColor: '#00E5FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', gap: 6 },
  addBtnText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  personRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  avatar: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#00BFA5', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFF', fontWeight: 'bold' },
  personName: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  personRole: { color: '#94A3B8', fontSize: 12, marginVertical: 2 },
  personDetails: { color: '#64748B', fontSize: 11, marginLeft: 5 },
  howCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  howTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  stepRow: { flexDirection: 'row', marginBottom: 15 },
  stepNumber: { color: '#00E5FF', fontSize: 14, fontWeight: 'bold', marginRight: 10 },
  stepText: { flex: 1, color: '#94A3B8', fontSize: 13, lineHeight: 18 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  
  /* Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(10, 14, 23, 0.9)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#161B29', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  imagePickerBtn: { height: 120, backgroundColor: '#0F172A', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', borderStyle: 'dashed' },
  imagePickerText: { color: '#94A3B8', marginTop: 10, fontSize: 14 },
  previewImage: { width: '100%', height: '100%', borderRadius: 15 },
  modalInput: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', borderRadius: 12, height: 55, paddingHorizontal: 15, color: '#FFF', fontSize: 16, marginBottom: 15 },
  modalButtonRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  modalCancelBtn: { flex: 1, height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 16 },
  modalSaveBtn: { flex: 1, height: 50, borderRadius: 12, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  modalSaveText: { color: '#0A0E17', fontWeight: 'bold', fontSize: 16 }
});
