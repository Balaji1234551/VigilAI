import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, ChevronDown, ChevronUp, ShieldAlert, FileText, Info } from 'lucide-react-native';

const termsData = [
  {
    category: "App Usage Instructions",
    icon: <Info size={20} color="#00E5FF" />,
    items: [
      {
        id: 1,
        question: "Adding and Managing Cameras",
        answer: "To add a new camera, navigate to the Home screen and tap the '+' icon. You will need the RTSP URL or the IP address of your device. Ensure your mobile device and the camera are on the same local network for initial setup."
      },
      {
        id: 2,
        question: "Configuring AI Detection Rules",
        answer: "Go to your Camera Settings to select which AI models to run (e.g., Person, Vehicle, Fall Detection). Processing intensive models may require a stable network connection to communicate with the VigilAI backend servers."
      },
      {
        id: 3,
        question: "Understanding Privacy Zones",
        answer: "You can draw Privacy Zones over areas of your camera feed (like a neighbor's window). The AI will ignore any movement inside these blacked-out zones, ensuring compliance with local surveillance laws."
      }
    ]
  },
  {
    category: "Terms of Service (EULA)",
    icon: <FileText size={20} color="#00E5FF" />,
    items: [
      {
        id: 4,
        question: "1. Acceptance of Terms",
        answer: "By creating an account and using the VigilAI application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application."
      },
      {
        id: 5,
        question: "2. Lawful Use",
        answer: "You agree to use this application only for lawful security and monitoring purposes. You are strictly prohibited from using VigilAI to monitor individuals in spaces where they have a reasonable expectation of privacy without their explicit consent."
      },
      {
        id: 6,
        question: "3. Limitation of Liability",
        answer: "VigilAI is an automated software tool and is NOT a replacement for emergency services (911) or professional security guards. We are not liable for any property damage, loss, or personal injury resulting from missed detections, system downtime, or network failures."
      }
    ]
  },
  {
    category: "Privacy Policy",
    icon: <ShieldAlert size={20} color="#00E5FF" />,
    items: [
      {
        id: 7,
        question: "Data Processing & Storage",
        answer: "Video feeds are processed in real-time by the AI. We do not permanently store your video footage on our cloud servers unless you explicitly enable Cloud Recording. Snapshot evidence for generated alerts is retained for 30 days before automatic deletion."
      },
      {
        id: 8,
        question: "Face Recognition Data",
        answer: "If you utilize the 'Trusted Persons' feature, the biometric facial vectors are encrypted and stored securely. This data is never shared with third parties or used for training generalized AI models."
      }
    ]
  }
];

export default function HelpSupportScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const toggleFAQ = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Instructions</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search instructions or terms..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Content Sections */}
        {termsData.map((section, idx) => {
          // Filter items based on search query
          const filteredItems = section.items.filter(item => 
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <View key={idx} style={styles.faqSection}>
              <View style={styles.sectionHeader}>
                {section.icon}
                <Text style={styles.sectionTitle}>{section.category}</Text>
              </View>
              {filteredItems.map((item, i) => (
                <FAQItem 
                  key={item.id}
                  question={item.question}
                  answer={item.answer}
                  isExpanded={expandedId === item.id}
                  onPress={() => toggleFAQ(item.id)}
                  isLast={i === filteredItems.length - 1}
                />
              ))}
            </View>
          );
        })}

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>VigilAI Version 2.1.4</Text>
          <Text style={styles.footerText}>Last updated: August 2026</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components
const FAQItem = ({ question, answer, isExpanded, onPress, isLast }) => (
  <View style={[styles.faqItemContainer, isLast && { borderBottomWidth: 0 }]}>
    <TouchableOpacity style={styles.faqHeader} onPress={onPress}>
      <Text style={[styles.faqQuestion, isExpanded && { color: '#00E5FF' }]}>{question}</Text>
      {isExpanded ? <ChevronUp size={20} color="#00E5FF" /> : <ChevronDown size={20} color="#94A3B8" />}
    </TouchableOpacity>
    {isExpanded && (
      <View style={styles.faqAnswerContainer}>
        <Text style={styles.faqAnswer}>{answer}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25, borderWidth: 1, borderColor: '#1E293B' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  faqSection: { backgroundColor: '#161B29', borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#1E293B33', gap: 10, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  sectionTitle: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  faqItemContainer: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  faqQuestion: { color: '#FFF', fontSize: 15, flex: 1, marginRight: 10, fontWeight: '500' },
  faqAnswerContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  faqAnswer: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
  footerInfo: { marginTop: 20, alignItems: 'center', marginBottom: 20 },
  footerText: { color: '#64748B', fontSize: 12, marginBottom: 5 }
});
