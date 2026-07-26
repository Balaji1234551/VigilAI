import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Crown, Check, Home, Camera, Bell, BarChart2, User, Gift } from 'lucide-react-native';

export default function SubscriptionScreen({ navigation }) {
  const handleActivateFree = (planType) => {
    Alert.alert(
      'Success',
      `Premium ${planType} plan activated successfully for $0.00! Enjoy unlimited surveillance.`,
      [{ text: 'Great!' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft color="#FFF" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <View>
            <Text style={styles.planLabel}>Current Plan</Text>
            <Text style={styles.planName}>VigilAI Premium Access</Text>
          </View>
          <View style={styles.freeBadgeMain}>
            <Text style={styles.freeBadgeTextMain}>FREE PROMO</Text>
          </View>
        </View>

        {/* Promo Announcement Banner */}
        <View style={styles.promoBanner}>
          <Gift size={22} color="#FFD600" />
          <View style={styles.promoTextContainer}>
            <Text style={styles.promoTitle}>Special Launch Offer!</Text>
            <Text style={styles.promoDescription}>To support home security for everyone, all premium surveillance features are currently 100% free.</Text>
          </View>
        </View>

        {/* Feature Comparison Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Feature Comparison</Text>

          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, { flex: 1.5 }]}>Feature</Text>
            <Text style={styles.colHeader}>Basic</Text>
            <Text style={[styles.colHeader, { color: '#00E5FF' }]}>Premium</Text>
          </View>

          <TableRow label="Cameras" free="2" premium="Unlimited" />
          <TableRow label="Cloud Storage" free="7 days" premium="90 days" premiumColor="#00E5FF" />
          <TableRow label="Advanced Analytics" free="Basic" premium="Full" premiumColor="#00E5FF" />
          <TableRow label="SMS Alerts" free="5/month" premium="Unlimited" premiumColor="#00E5FF" />
          <TableRow label="Priority Support" free="No" premium="Yes" premiumColor="#00E5FF" />
          <TableRow label="Family Sharing" free="No" premium="Yes" premiumColor="#00E5FF" isLast />
        </View>

        {/* Monthly Plan Card (FREE) */}
        <View style={styles.highlightCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Crown size={20} color="#00E5FF" />
              <Text style={styles.tierTitle}>Monthly Plan</Text>
            </View>
            <View style={styles.popularBadge}><Text style={styles.popularText}>FREE PLAN</Text></View>
          </View>
          <Text style={styles.billingCycle}>Billed monthly • Promotinal Offer</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.priceLarge}>0.00</Text>
            <Text style={styles.perPeriod}>/month</Text>
          </View>

          <View style={styles.featureList}>
            <CheckItem text="Unlimited cameras" />
            <CheckItem text="90-day cloud storage" />
            <CheckItem text="Advanced analytics" />
          </View>

          <TouchableOpacity style={styles.subscribeBtnMain} onPress={() => handleActivateFree('Monthly')}>
            <Text style={styles.subscribeBtnTextMain}>Activate Free Premium</Text>
          </TouchableOpacity>
        </View>

        {/* Yearly Plan Card (FREE) */}
        <View style={styles.secondaryCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.row}>
              <Crown size={20} color="#00C853" />
              <Text style={styles.tierTitle}>Yearly Plan</Text>
            </View>
            <View style={styles.saveBadge}><Text style={styles.saveText}>BEST VALUE</Text></View>
          </View>
          <Text style={styles.billingCycle}>Billed annually • Promotional Offer</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.priceLarge}>0.00</Text>
            <Text style={styles.perPeriod}>/year</Text>
          </View>

          <View style={styles.featureList}>
            <CheckItem text="All premium features" />
            <CheckItem text="Full year protection" />
            <CheckItem text="Priority support" />
          </View>

          <TouchableOpacity style={styles.subscribeBtnOutline} onPress={() => handleActivateFree('Yearly')}>
            <Text style={styles.subscribeBtnTextOutline}>Activate Free Premium</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.restoreBtn} onPress={() => Alert.alert('Success', 'Purchases restored successfully.')}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
        <Text style={styles.footerLegal}>100% Free. No credit card required. Cancel anytime.</Text>

      </ScrollView>

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
const TableRow = ({ label, free, premium, premiumColor, isLast }) => (
  <View style={[styles.tableRow, isLast && { borderBottomWidth: 0 }]}>
    <Text style={[styles.rowLabel, { flex: 1.5 }]}>{label}</Text>
    <Text style={styles.rowVal}>{free}</Text>
    <Text style={[styles.rowVal, premiumColor && { color: premiumColor }]}>{premium}</Text>
  </View>
);

const CheckItem = ({ text }) => (
  <View style={styles.checkRow}>
    <Check size={16} color="#00E5FF" />
    <Text style={styles.checkText}>{text}</Text>
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
  currentPlanCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  planLabel: { color: '#94A3B8', fontSize: 13 },
  planName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  freeBadgeMain: { backgroundColor: '#00E5FF33', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#00E5FF' },
  freeBadgeTextMain: { color: '#00E5FF', fontSize: 11, fontWeight: 'bold' },
  promoBanner: { flexDirection: 'row', backgroundColor: '#FFD6000D', borderRadius: 15, padding: 15, gap: 12, marginBottom: 25, borderWidth: 1, borderColor: '#FFD60033', alignItems: 'center' },
  promoTextContainer: { flex: 1 },
  promoTitle: { color: '#FFD600', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  promoDescription: { color: '#94A3B8', fontSize: 11, lineHeight: 16 },
  tableCard: { backgroundColor: '#161B29', borderRadius: 15, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#1E293B' },
  tableTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingBottom: 12, marginBottom: 5 },
  colHeader: { flex: 1, color: '#64748B', fontSize: 12, fontWeight: 'bold', textAlign: 'left' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  rowLabel: { color: '#FFF', fontSize: 13 },
  rowVal: { flex: 1, color: '#94A3B8', fontSize: 13 },
  highlightCard: { backgroundColor: '#0F172A', borderRadius: 20, padding: 25, marginBottom: 20, borderWidth: 2, borderColor: '#00E5FF' },
  secondaryCard: { backgroundColor: '#161B29', borderRadius: 20, padding: 25, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  popularBadge: { backgroundColor: '#00E5FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  popularText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  saveBadge: { backgroundColor: '#00C85333', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#00C853' },
  saveText: { color: '#00C853', fontSize: 10, fontWeight: 'bold' },
  billingCycle: { color: '#64748B', fontSize: 12, marginTop: 5 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 15, marginBottom: 20 },
  currency: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  priceLarge: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  perPeriod: { color: '#64748B', fontSize: 16 },
  featureList: { gap: 12, marginBottom: 25 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkText: { color: '#FFF', fontSize: 14 },
  subscribeBtnMain: { backgroundColor: '#00E5FF', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  subscribeBtnTextMain: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  subscribeBtnOutline: { backgroundColor: '#0F172A', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  subscribeBtnTextOutline: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  restoreBtn: { marginTop: 20, alignSelf: 'center' },
  restoreText: { color: '#00E5FF', fontWeight: 'bold', fontSize: 14 },
  footerLegal: { color: '#64748B', fontSize: 11, textAlign: 'center', marginTop: 8, marginBottom: 30 },
  tabBar: { position: 'absolute', bottom: 0, flexDirection: 'row', backgroundColor: '#0F172A', width: '100%', height: 85, paddingBottom: 25, borderTopWidth: 1, borderColor: '#1E293B' },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 }
});
