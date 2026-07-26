import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Shield, Home, Camera, Bell, BarChart2, User, ChevronRight } from 'lucide-react-native';

export default function TermsPrivacyScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Privacy Policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Terms of Service Section */}
        <View style={styles.policyCard}>
          <Text style={styles.lastUpdated}>Last Updated: April 24, 2026</Text>
          <Text style={styles.introText}>
            By using VigilAI, you agree to these terms. Our AI-based surveillance system is designed for lawful monitoring purposes only.
          </Text>

          <PolicySection number="1" title="Acceptable Use">
            You agree to use VigilAI only for lawful purposes and in compliance with all applicable local, state, and federal laws. Prohibited uses include surveillance in areas where individuals have a reasonable expectation of privacy without proper consent.
          </PolicySection>

          <PolicySection number="2" title="User Responsibilities">
            You are responsible for ensuring compliance with surveillance laws in your jurisdiction. You must inform individuals when they are being monitored where required by law.
          </PolicySection>

          <PolicySection number="3" title="AI Detection Accuracy">
            While our AI models achieve 90-95% accuracy, no automated system is perfect. You should not rely solely on VigilAI for critical safety decisions. Always verify alerts and use human judgment.
          </PolicySection>

          <PolicySection number="4" title="Limitation of Liability">
            VigilAI is provided "as is" without warranties. We are not liable for missed detections, false positives, or any damages resulting from system use or failure.
          </PolicySection>
        </View>

        {/* Privacy Policy Section */}
        <View style={styles.policyCard}>
          <View style={styles.privacyHeader}>
            <Shield size={20} color="#00C853" />
            <Text style={styles.privacyTitle}>Privacy Policy</Text>
          </View>
          <Text style={styles.lastUpdated}>Last Updated: April 24, 2026</Text>
          <Text style={styles.introText}>
            Your privacy is our top priority. VigilAI is designed with privacy-first principles.
          </Text>

          <PolicySection number="1" title="Data Collection">
            We collect minimal personal information: email, name, and phone number for account creation. Video footage is processed locally on your device by default.
          </PolicySection>

          <PolicySection number="2" title="Edge Processing">
            All AI detection runs on your device. Video footage is NOT uploaded to our servers unless you explicitly enable cloud backup (Premium feature).
          </PolicySection>

          <PolicySection number="3" title="Alert Data">
            When alerts are triggered, we store metadata (timestamp, camera ID, alert type, confidence score) but NOT the video footage itself, unless cloud backup is enabled.
          </PolicySection>

          <PolicySection number="4" title="Face Blurring">
            When enabled, our system automatically blurs faces in all recordings. This feature uses on-device processing and blurred data is not reversible.
          </PolicySection>

          <PolicySection number="5" title="Data Retention">
            Local alerts are automatically deleted after 7 days (Free) or 90 days (Premium). Cloud backups follow the same retention policy. You can manually delete alerts anytime.
          </PolicySection>

          <PolicySection number="6" title="Third-Party Sharing">
            We do NOT sell your data to third parties. Video footage is never shared unless you explicitly use the "Share" feature to send alerts to emergency contacts or authorities.
          </PolicySection>

          <PolicySection number="7" title="Your Rights">
            You have the right to access, export, or delete all your data. Use the "Export My Data" button in Privacy & Security settings or contact support@vigilai.com.
          </PolicySection>
        </View>

        {/* Questions Card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionTitle}>Questions?</Text>
          <Text style={styles.questionText}>
            If you have questions about our Terms or Privacy Policy, contact us at legal@vigilai.com
          </Text>
          <TouchableOpacity 
            style={styles.contactRow}
            onPress={() => navigation.navigate('HelpSupport')}
          >
            <Text style={styles.contactText}>Contact Support</Text>
            <ChevronRight size={16} color="#00E5FF" />
          </TouchableOpacity>
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
const PolicySection = ({ number, title, children }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionHeader}>{number}. {title}</Text>
    <Text style={styles.sectionBody}>{children}</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 12, zIndex: 10 },
  backBtn: { marginRight: 15, paddingVertical: 8 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  policyCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  lastUpdated: { color: '#64748B', fontSize: 12, marginBottom: 15 },
  introText: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  sectionContainer: { marginBottom: 25 },
  sectionHeader: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  sectionBody: { color: '#94A3B8', fontSize: 13, lineHeight: 20 },
  privacyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  privacyTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  questionCard: { backgroundColor: '#0F172A', borderRadius: 15, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: '#00E5FF33' },
  questionTitle: { color: '#00E5FF', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  questionText: { color: '#94A3B8', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  contactText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
