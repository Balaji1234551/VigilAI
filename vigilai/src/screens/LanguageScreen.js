import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Globe, Check, Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../utils/translations';

// Language Selection Screen with local persistence and backend synchronization


export default function LanguageScreen({ navigation }) {
  const [selectedLang, setSelectedLang] = useState('English');
  const { t } = useTranslation(selectedLang);

  const languages = [
    { name: 'English', sub: 'English', flag: '🇺🇸' },
    { name: 'Spanish', sub: 'Español', flag: '🇪🇸' },
    { name: 'French', sub: 'Français', flag: '🇫🇷' },
    { name: 'German', sub: 'Deutsch', flag: '🇩🇪' },
    { name: 'Chinese', sub: '中文', flag: '🇨🇳' },
    { name: 'Japanese', sub: '日本語', flag: '🇯🇵' },
    { name: 'Korean', sub: '한국어', flag: '🇰🇷' },
    { name: 'Arabic', sub: 'العربية', flag: '🇸🇦' },
    { name: 'Hindi', sub: 'हिंदी', flag: '🇮🇳' },
    { name: 'Tamil', sub: 'தமிழ்', flag: '🇮🇳' },
    { name: 'Telugu', sub: 'తెలుగు', flag: '🇮🇳' },
    { name: 'Marathi', sub: 'मराठी', flag: '🇮🇳' },
    { name: 'Bengali', sub: 'বাংলা', flag: '🇮🇳' },
    { name: 'Portuguese', sub: 'Português', flag: '🇵🇹' },
    { name: 'Russian', sub: 'Русский', flag: '🇷🇺' },
    { name: 'Italian', sub: 'Italiano', flag: '🇮🇹' },
  ];

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem('userLanguage');
        if (storedLang) {
          setSelectedLang(storedLang);
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLanguage();
  }, []);

  const handleSaveLanguage = async () => {
    try {
      // Save locally first for instant reactivity
      await AsyncStorage.setItem('userLanguage', selectedLang);
      
      // Update local userData object so other profile screens are in sync
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        userData.language = selectedLang;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        
        // Sync to backend if email exists
        if (userData.email) {
          const baseUrl = Platform.OS === 'android' ? 'http://10.241.125.80:8000' : 'http://localhost:8000';
          
          const response = await fetch(`${baseUrl}/api/v1/auth/profile/${userData.email}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              language: selectedLang
            })
          });
          
          if (!response.ok) {
            console.warn('Backend sync failed, saved locally.');
          }
        }
      }
      
      Alert.alert('Success', `Language preference saved: ${selectedLang}`);
      navigation.goBack();
    } catch (e) {
      console.warn('Backend offline or error syncing language preference, saved locally.');
      Alert.alert('Success', `Language preference saved locally: ${selectedLang}`);
      navigation.goBack();
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
        <Text style={styles.headerTitle}>{t('language')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Support Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Globe size={20} color="#00E5FF" />
            <Text style={styles.infoTitle}>Multi-Language Support</Text>
          </View>
          <Text style={styles.infoText}>
            VigilAI supports 16 languages including <Text style={styles.boldText}>Hindi, Tamil, Telugu, Marathi, and Bengali</Text>. The entire app interface, alerts, and notifications will be translated.
          </Text>
        </View>

        {/* Language Selection List */}
        <View style={styles.listCard}>
          <View style={styles.listHeader}>
            <Globe size={18} color="#00E5FF" />
            <Text style={styles.listTitle}>Select Language</Text>
          </View>
          
          {languages.map((lang, index) => (
            <TouchableOpacity 
              key={lang.name} 
              style={[styles.langItem, index === languages.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => setSelectedLang(lang.name)}
            >
              <Text style={styles.flagText}>{lang.flag}</Text>
              <View style={styles.langInfo}>
                <Text style={styles.langName}>{lang.name}</Text>
                <Text style={styles.langSub}>{lang.sub}</Text>
              </View>
              {selectedLang === lang.name && <Check size={20} color="#00E5FF" />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Translation Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>What Gets Translated?</Text>
          <Bullet text="All app screens, buttons, and menus" />
          <Bullet text="Alert notifications and push messages" />
          <Bullet text="Email alerts and reports" />
          <Bullet text="Help documentation and FAQs" />
          <Bullet text="Audio warnings (when camera has speaker)" />
        </View>

        {/* Regional Support Highlight */}
        <View style={styles.regionalCard}>
          <Text style={styles.regionalTitle}>Regional Support</Text>
          <Text style={styles.regionalText}>
            VigilAI is the <Text style={styles.boldRegional}>only consumer surveillance app</Text> with native support for Indian languages (Hindi, Tamil, Telugu, Marathi, Bengali). This makes it accessible to <Text style={styles.boldRegional}>850+ million</Text> additional users with preferred regional language interfaces.
          </Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLanguage}>
          <Text style={styles.saveBtnText}>Save Language Preference</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.tabItem}>
          <Home size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('home')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Cameras')} style={styles.tabItem}>
          <Camera size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('cameras')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Alerts')}>
          <Bell size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('alerts')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Analytics')}>
          <BarChart2 size={24} color="#94A3B8" />
          <Text style={styles.tabLabel}>{t('analytics')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => navigation.navigate('Profile')}>
          <User size={24} color="#00E5FF" />
          <Text style={[styles.tabLabel, { color: '#00E5FF' }]}>{t('profile')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Sub-components
const Bullet = ({ text }) => (
  <View style={styles.bulletRow}>
    <Check size={14} color="#00C853" />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  infoCard: { backgroundColor: '#00E5FF0D', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#00E5FF33' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  infoTitle: { color: '#00E5FF', fontSize: 16, fontWeight: 'bold' },
  infoText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  boldText: { color: '#FFF', fontWeight: 'bold' },
  listCard: { backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  listTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  langItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  flagText: { fontSize: 24, marginRight: 15 },
  langInfo: { flex: 1 },
  langName: { color: '#FFF', fontSize: 16, fontWeight: '500' },
  langSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  detailsCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  detailsTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bulletText: { color: '#94A3B8', fontSize: 13 },
  regionalCard: { backgroundColor: '#FFD6000D', borderRadius: 15, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#FFD60033' },
  regionalTitle: { color: '#FFD600', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  regionalText: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  boldRegional: { color: '#FFF', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#00E5FF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});