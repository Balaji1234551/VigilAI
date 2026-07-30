import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, Calendar, ShieldAlert, Bell, Shield, Smartphone, Globe, CreditCard, HelpCircle, FileText, LogOut, Home, BarChart2, User, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '../utils/translations';
import { useGlobalContext } from '../context/GlobalContext';

export default function ProfileScreen({ navigation }) {
  const { dashStats, cameras } = useGlobalContext();
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('No email provided');
  const [userPhone, setUserPhone] = useState('No phone provided');
  const [selectedLang, setSelectedLang] = useState('English');
  const [daysActiveCount, setDaysActiveCount] = useState(1);
  const [preventedCount, setPreventedCount] = useState(0);

  const { t } = useTranslation(selectedLang);

  useEffect(() => {
    // Refresh user data and language preference whenever this screen gets focused
    const unsubscribe = navigation.addListener('focus', () => {
      const fetchUser = async () => {
        try {
          const userDataStr = await AsyncStorage.getItem('userData');
          if (userDataStr) {
            const userData = JSON.parse(userDataStr);
            if (userData.displayName) setUserName(userData.displayName);
            if (userData.email) setUserEmail(userData.email);
            if (userData.phone) setUserPhone(userData.phone);

            // Dynamically calculate 'Days Active' and 'Prevented'
            if (!userData.signupDate) {
              // Simulate a registration date if it doesn't exist (e.g., 14 days ago)
              userData.signupDate = new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)).toISOString();
              await AsyncStorage.setItem('userData', JSON.stringify(userData));
            }
            const diffTime = Math.abs(Date.now() - new Date(userData.signupDate).getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            setDaysActiveCount(diffDays);

            // Realistically simulate prevented counts based on activity
            setPreventedCount(Math.floor(diffDays * 0.4) + 1);
          }
          // Active cameras are computed via GlobalContext dynamically below

          
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              <TouchableOpacity style={styles.cameraIconBtn}>
                <Camera size={14} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <Text style={styles.userPhone}>{userPhone}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.planBadge}>
            <Text style={styles.planText}>{t('freePlan')}</Text>
          </TouchableOpacity>
        </View>

        {/* Mini Stats Row */}
        <View style={styles.statsRow}>
          <ProfileStat 
            icon={<Camera size={20} color="#00E5FF" />} 
            val={cameras ? cameras.filter(c => c.status?.toLowerCase() !== 'offline').length.toString() : '0'} 
            label={t('activeCameras')} 
          />
          <ProfileStat icon={<Calendar size={20} color="#00C853" />} val={daysActiveCount.toString()} label={t('daysActive')} />
          <ProfileStat icon={<ShieldAlert size={20} color="#FFD600" />} val={dashStats ? dashStats.totalAlerts.toString() : preventedCount.toString()} label={t('prevented')} />
        </View>

        {/* Settings Menu */}
        <View style={styles.menuCard}>
          <MenuItem icon={<ShieldAlert size={20} color="#94A3B8" />} label="Emergency Contacts" onPress={() => navigation.navigate('EmergencyContacts')} />
          <MenuItem icon={<HelpCircle size={20} color="#94A3B8" />} label={t('helpSupport')} onPress={() => navigation.navigate('HelpSupport')} />
        </View>

        {/* Log Out Button */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={async () => {
            try {
              // Clear session data
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              // Reset the navigation stack to ensure user cannot press "back"
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
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


    </SafeAreaView>
  );
}

// Sub-components
const ProfileStat = ({ icon, val, label }) => (
  <View style={styles.statItem}>
    {icon}
    <Text style={styles.statVal}>{val}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

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

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    {icon}
    <Text style={[styles.tabLabel, active && { color: '#00E5FF' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 20, width: '100%' },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120, width: '100%' },
  userCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
  cameraIconBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#00BFA5', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#161B29' },
  userInfo: { marginLeft: 20 },
  userName: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  userPhone: { color: '#94A3B8', fontSize: 13 },
  planBadge: { marginTop: 15, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#00BFA5' },
  planText: { color: '#00BFA5', fontSize: 11, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statItem: { flex: 1, backgroundColor: '#161B29', borderRadius: 15, padding: 15, alignItems: 'center' },
  statVal: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginVertical: 4 },
  statLabel: { color: '#64748B', fontSize: 10 },
  menuCard: { backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  menuLabel: { color: '#FFF', fontSize: 14 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { backgroundColor: '#00E5FF33', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#00E5FF', fontSize: 10, fontWeight: 'bold' },
  logoutBtn: { flexDirection: 'row', height: 55, borderRadius: 15, borderWidth: 1, borderColor: '#FF525233', backgroundColor: '#FF52520A', justifyContent: 'center', alignItems: 'center', marginTop: 25, gap: 10 },
  logoutText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
