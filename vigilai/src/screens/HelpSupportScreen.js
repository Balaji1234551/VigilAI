import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Search, MessageCircle, BookOpen, Video, ChevronDown, ChevronUp, Home, Camera, Bell, BarChart2, User, Send, X } from 'lucide-react-native';

const faqData = [
  {
    category: "Getting Started",
    items: [
      {
        id: 1,
        question: "How do I add my first camera?",
        answer: "Go to the Cameras tab, tap the '+' button in the top right corner, and follow the on-screen pairing instructions. You can connect via IP address, RTSP stream, or scan a QR code."
      },
      {
        id: 2,
        question: "What types of cameras are supported?",
        answer: "VigilAI currently supports most standard IP cameras, RTSP network streams, and USB webcams. Native integrations for Ring, Nest, and Arlo are arriving in the next major update."
      }
    ]
  },
  {
    category: "Detection & Alerts",
    items: [
      {
        id: 3,
        question: "How accurate is the AI detection?",
        answer: "Our advanced neural networks run locally on your device with 98.5% accuracy for human, vehicle, and package detection. Accuracy remains high even in low-light environments."
      },
      {
        id: 4,
        question: "Can I customize alert sensitivity?",
        answer: "Yes! Navigate to Profile > Notification Preferences. You can adjust the AI confidence threshold and create custom detection zones to avoid false positives."
      }
    ]
  }
];

export default function HelpSupportScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Chat State
  const [isChatVisible, setChatVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { id: 1, text: 'Hello! You are connected to VigilAI Support. How can we help you today?', sender: 'support' }
  ]);
  const scrollViewRef = useRef(null);

  const toggleFAQ = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleSupportLink = (type) => {
    if (type === 'chat') {
      setChatVisible(true);
    } else if (type === 'docs') {
      Alert.alert('Documentation', 'Opening the official VigilAI knowledge base in your browser.');
    } else if (type === 'tutorials') {
      Alert.alert('Video Tutorials', 'Opening the VigilAI Academy video playlist.');
    } else if (type === 'contact') {
      Alert.alert('Contact Support', 'A secure support ticket has been created. Our team will reach out to your registered email within 24 hours.');
    }
  };

  const handleSendMessage = () => {
    if (!currentMessage.trim()) return;

    const userMsg = { id: Date.now(), text: currentMessage.trim(), sender: 'user' };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');

    // Simulate owner/agent reply
    setTimeout(() => {
      const reply = { id: Date.now() + 1, text: 'An agent is currently reviewing your message. We will assist you shortly.', sender: 'support' };
      setChatMessages(prev => [...prev, reply]);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput 
            placeholder="Search FAQs..." 
            placeholderTextColor="#64748B" 
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Support Channels */}
        <View style={styles.channelRow}>
          <SupportChannel 
            icon={<MessageCircle size={24} color="#00E5FF" />} 
            label="Live Chat" 
            onPress={() => handleSupportLink('chat')}
          />
          <SupportChannel 
            icon={<BookOpen size={24} color="#00E5FF" />} 
            label="Docs" 
            onPress={() => handleSupportLink('docs')}
          />
          <SupportChannel 
            icon={<Video size={24} color="#00E5FF" />} 
            label="Tutorials" 
            onPress={() => handleSupportLink('tutorials')}
          />
        </View>

        {/* Dynamic FAQ Sections */}
        {faqData.map((section, sIndex) => {
          const filteredItems = section.items.filter(item => 
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (filteredItems.length === 0) return null;

          return (
            <View key={sIndex} style={styles.faqSection}>
              <Text style={styles.sectionTitle}>{section.category}</Text>
              {filteredItems.map((item, index) => (
                <FAQItem 
                  key={item.id}
                  question={item.question} 
                  answer={item.answer}
                  isExpanded={expandedId === item.id}
                  onPress={() => toggleFAQ(item.id)}
                  isLast={index === filteredItems.length - 1} 
                />
              ))}
            </View>
          );
        })}

        {/* Contact Support Card */}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Still need help?</Text>
          <Text style={styles.contactSubtitle}>
            Our support team is available 24/7 to assist you with any advanced technical issues.
          </Text>
          <TouchableOpacity style={styles.contactBtn} onPress={() => handleSupportLink('contact')}>
            <Text style={styles.contactBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Live Chat Modal */}
      <Modal visible={isChatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <SafeAreaView style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.chatCloseBtn}>
              <X color="#FFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.chatHeaderTitle}>Live Support</Text>
            <View style={{ width: 24 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView 
              ref={scrollViewRef}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
              style={styles.chatScroll}
              contentContainerStyle={{ padding: 20 }}
            >
              {chatMessages.map(msg => (
                <View key={msg.id} style={[styles.chatBubble, msg.sender === 'user' ? styles.userBubble : styles.supportBubble]}>
                  <Text style={[styles.chatText, msg.sender === 'user' ? styles.userText : styles.supportText]}>
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <View style={styles.chatInputContainer}>
              <TextInput 
                style={styles.chatInput}
                placeholder="Type a message..."
                placeholderTextColor="#64748B"
                value={currentMessage}
                onChangeText={setCurrentMessage}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity style={styles.sendBtn} onPress={handleSendMessage}>
                <Send size={20} color="#0A0E17" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Bottom Navigation */}
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
const SupportChannel = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.channelBtn} onPress={onPress}>
    {icon}
    <Text style={styles.channelLabel}>{label}</Text>
  </TouchableOpacity>
);

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
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, paddingHorizontal: 15, height: 55, marginBottom: 25, borderWidth: 1, borderColor: '#1E293B' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#FFF', fontSize: 16 },
  channelRow: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  channelBtn: { flex: 1, backgroundColor: '#161B29', borderRadius: 15, paddingVertical: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1E293B' },
  channelLabel: { color: '#FFF', fontSize: 13, fontWeight: '500' },
  faqSection: { backgroundColor: '#161B29', borderRadius: 15, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', padding: 20, backgroundColor: '#1E293B33' },
  faqItemContainer: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  faqQuestion: { color: '#FFF', fontSize: 15, flex: 1, marginRight: 10, fontWeight: '500' },
  faqAnswerContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  faqAnswer: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
  contactCard: { backgroundColor: '#161B29', borderRadius: 20, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', marginTop: 10 },
  contactTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  contactSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 25, lineHeight: 20 },
  contactBtn: { backgroundColor: '#00E5FF', width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  contactBtnText: { color: '#0A0E17', fontWeight: 'bold', fontSize: 16 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  chatContainer: { flex: 1, backgroundColor: '#0A0E17' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  chatCloseBtn: { padding: 5 },
  chatHeaderTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  chatScroll: { flex: 1 },
  chatBubble: { maxWidth: '80%', padding: 15, borderRadius: 20, marginBottom: 15 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#00E5FF', borderBottomRightRadius: 5 },
  supportBubble: { alignSelf: 'flex-start', backgroundColor: '#161B29', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#1E293B' },
  chatText: { fontSize: 15, lineHeight: 20 },
  userText: { color: '#0A0E17', fontWeight: '500' },
  supportText: { color: '#FFF' },
  chatInputContainer: { flexDirection: 'row', padding: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1E293B', backgroundColor: '#0F172A' },
  chatInput: { flex: 1, backgroundColor: '#161B29', height: 50, borderRadius: 25, paddingHorizontal: 20, color: '#FFF', fontSize: 15, borderWidth: 1, borderColor: '#1E293B' },
  sendBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00E5FF', justifyContent: 'center', alignItems: 'center', marginLeft: 10 }
});