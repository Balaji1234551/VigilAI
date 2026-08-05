import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, StatusBar, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Moon, Sun, Zap, Bell, Volume2, Video, Info, Home, Camera, BarChart2, User } from 'lucide-react-native';

export default function PatrolModeScreen({ navigation }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [activeTimeSelect, setActiveTimeSelect] = useState('start');

  const timeOptions = [
    '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', 
    '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
    '06:00', '07:00', '08:00', '09:00', '10:00'
  ];

  const [settings, setSettings] = useState({
    highSensitivity: true,
    criticalAlerts: true,
    audioWarning: true,
    autoRecord: true,
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem('patrolModeSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.isEnabled !== undefined) setIsEnabled(parsed.isEnabled);
          if (parsed.settings) setSettings(parsed.settings);
          if (parsed.startTime) setStartTime(parsed.startTime);
          if (parsed.endTime) setEndTime(parsed.endTime);
        }
      } catch (e) {}
    };
    loadSettings();
  }, []);

  const saveSettings = async (newEnabled, newSettings, newStart, newEnd) => {
    try {
      await AsyncStorage.setItem('patrolModeSettings', JSON.stringify({
        isEnabled: newEnabled,
        settings: newSettings,
        startTime: newStart,
        endTime: newEnd
      }));
    } catch (e) {}
  };

  const toggleEnabled = (val) => {
    setIsEnabled(val);
    saveSettings(val, settings, startTime, endTime);
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(isEnabled, newSettings, startTime, endTime);
  };

  const handleTimeSelect = (time) => {
    if (activeTimeSelect === 'start') {
      setStartTime(time);
      saveSettings(isEnabled, settings, time, endTime);
    } else {
      setEndTime(time);
      saveSettings(isEnabled, settings, startTime, time);
    }
    setShowTimePicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patrol Mode</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Enable Patrol Mode</Text>
              <Text style={styles.cardSubtitle}>High-sensitivity monitoring during night hours</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={toggleEnabled}
              trackColor={{ false: '#1E293B', true: '#00E5FF' }}
              thumbColor="#FFF"
            />
          </View>

          {isEnabled && (
            <View style={styles.statusBox}>
              <Moon size={18} color="#00E5FF" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.statusTitle}>Currently Active</Text>
                <Text style={styles.statusDesc}>Patrol Mode will run from 22:00 to 06:00 every night</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Schedule</Text>
          <View style={styles.timeRow}>
            <TouchableOpacity style={styles.timeInput} onPress={() => { setActiveTimeSelect('start'); setShowTimePicker(true); }}>
              <View style={styles.timeHeader}><Moon size={14} color="#94A3B8" /><Text style={styles.timeLabel}>Start Time</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeText}>{startTime}</Text></View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.timeInput} onPress={() => { setActiveTimeSelect('end'); setShowTimePicker(true); }}>
              <View style={styles.timeHeader}><Sun size={14} color="#94A3B8" /><Text style={styles.timeLabel}>End Time</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeText}>{endTime}</Text></View>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Moon size={16} color="#00E5FF" />
            <Text style={styles.infoText}>Typical Night Schedule: 10:00 PM - 6:00 AM is recommended for most homes</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detection Settings</Text>
          <SettingToggle
            icon={<Zap size={20} color="#00E5FF" />}
            title="High Sensitivity Mode"
            desc="Detect even subtle movements during patrol hours"
            value={settings.highSensitivity}
            onToggle={() => toggleSetting('highSensitivity')}
          />
          <SettingToggle
            icon={<Bell size={20} color="#FF5252" />}
            title="Instant Critical Alerts"
            desc="Skip confidence threshold for urgent threats at night"
            value={settings.criticalAlerts}
            onToggle={() => toggleSetting('criticalAlerts')}
          />
          <SettingToggle
            icon={<Volume2 size={20} color="#FFD600" />}
            title="AI Audio Warning"
            desc="Play warning through camera speaker when intruder detected"
            value={settings.audioWarning}
            onToggle={() => toggleSetting('audioWarning')}
          />
          <SettingToggle
            icon={<Video size={20} color="#00C853" />}
            title="Auto-Record on Motion"
            desc="Save 30-second clips when motion detected"
            value={settings.autoRecord}
            onToggle={() => toggleSetting('autoRecord')}
            isLast
          />
        </View>

        <View style={styles.infoCard}>
          <View style={styles.timeHeader}><Info size={18} color="#00E5FF" /><Text style={styles.cardTitle}>What is Patrol Mode?</Text></View>
          <Text style={styles.longDesc}>Patrol Mode increases detection sensitivity during scheduled hours (typically nighttime) when unusual activity is more likely to be suspicious.</Text>
          <Bullet text="Lower confidence thresholds mean more alerts (fewer missed threats)" />
          <Bullet text="Instant notifications without verification delay" />
          <Bullet text="Optional audio warnings to deter intruders before they act" />
          <Bullet text="Automatically disables during daytime to reduce false positives" />
        </View>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={showTimePicker} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select {activeTimeSelect === 'start' ? 'Start' : 'End'} Time</Text>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.timeGrid}>
              {timeOptions.map((time) => {
                const isActive = activeTimeSelect === 'start' ? time === startTime : time === endTime;
                return (
                  <TouchableOpacity 
                    key={time} 
                    style={[styles.timeOption, isActive && styles.timeOptionActive]} 
                    onPress={() => handleTimeSelect(time)}
                  >
                    <Text style={[styles.timeOptionText, isActive && styles.timeOptionTextActive]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTimePicker(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const SettingToggle = ({ icon, title, desc, value, onToggle, isLast }) => (
  <View style={[styles.settingRow, isLast && { borderBottomWidth: 0 }]}>
    <View style={styles.settingLeft}>
      {icon}
      <View style={{ flex: 1, marginLeft: 15 }}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDesc}>{desc}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#1E293B', true: '#00E5FF' }}
      thumbColor="#FFF"
    />
  </View>
);

const Bullet = ({ text }) => (
  <View style={styles.bulletRow}>
    <View style={styles.bullet} />
    <Text style={styles.bulletText}>{text}</Text>
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
  card: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  cardSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 4 },
  statusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#00E5FF1A', borderRadius: 12, padding: 15, marginTop: 20 },
  statusTitle: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  statusDesc: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  timeRow: { flexDirection: 'row', gap: 15, marginVertical: 20 },
  timeInput: { flex: 1 },
  timeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  timeLabel: { color: '#94A3B8', fontSize: 12 },
  timeBox: { backgroundColor: '#0F172A', height: 50, borderRadius: 10, justifyContent: 'center', paddingHorizontal: 15, borderWidth: 1, borderColor: '#1E293B' },
  timeText: { color: '#FFF', fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10, backgroundColor: '#0F172A', padding: 15, borderRadius: 12 },
  infoText: { flex: 1, color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  settingLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  settingTitle: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  settingDesc: { color: '#64748B', fontSize: 11, marginTop: 2 },
  infoCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  longDesc: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginVertical: 15 },
  bulletRow: { flexDirection: 'row', marginBottom: 10, paddingRight: 10 },
  bullet: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#00E5FF', marginTop: 8, marginRight: 10 },
  bulletText: { flex: 1, color: '#94A3B8', fontSize: 12, lineHeight: 18 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#161B29', borderRadius: 15, padding: 20, maxHeight: '60%', borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  timeOption: { width: '30%', backgroundColor: '#0F172A', paddingVertical: 15, borderRadius: 10, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center' },
  timeOptionActive: { backgroundColor: '#00E5FF', borderColor: '#00E5FF' },
  timeOptionText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  timeOptionTextActive: { color: '#000' },
  modalCloseBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 15, backgroundColor: '#0F172A', borderRadius: 10 },
  modalCloseText: { color: '#FF5252', fontWeight: 'bold', fontSize: 16 }
});
