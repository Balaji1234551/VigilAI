import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, ScrollView, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { ArrowLeft, Moon, Sun, Zap, Bell, Volume2, Video, Info, Home, Camera, BarChart2, User } from 'lucide-react-native';

export default function PatrolModeScreen({ navigation }) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [settings, setSettings] = useState({
    highSensitivity: true,
    criticalAlerts: true,
    audioWarning: true,
    autoRecord: true,
  });

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.cardTitle}>Enable Patrol Mode</Text>
              <Text style={styles.cardSubtitle}>High-sensitivity monitoring during night hours</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={setIsEnabled}
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
            <View style={styles.timeInput}>
              <View style={styles.timeHeader}><Moon size={14} color="#94A3B8" /><Text style={styles.timeLabel}>Start Time</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeText}>22:00</Text></View>
            </View>
            <View style={styles.timeInput}>
              <View style={styles.timeHeader}><Sun size={14} color="#94A3B8" /><Text style={styles.timeLabel}>End Time</Text></View>
              <View style={styles.timeBox}><Text style={styles.timeText}>06:00</Text></View>
            </View>
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

      <View style={styles.tabBar}>
        <TabItem icon={<Home size={24} color="#94A3B8" />} label="Home" onPress={() => navigation.navigate('Home')} />
        <TabItem icon={<Camera size={24} color="#00E5FF" />} label="Cameras" active onPress={() => navigation.navigate('Cameras')} />
        <TabItem icon={<Bell size={24} color="#94A3B8" />} label="Alerts" onPress={() => navigation.navigate('Alerts')} />
        <TabItem icon={<BarChart2 size={24} color="#94A3B8" />} label="Analytics" onPress={() => navigation.navigate('Analytics')} />
        <TabItem icon={<User size={24} color="#94A3B8" />} label="Profile" onPress={() => navigation.navigate('Profile')} />
      </View>
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
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
