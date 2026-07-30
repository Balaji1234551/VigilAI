import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Animated, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, CheckCircle, ChevronLeft, Shield } from 'lucide-react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');

export default function EmailVerificationScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Enter Email, 2 = Enter OTP
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (text) => {
    // Basic regex: no spaces, must have @, must end in specific domains
    const regex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yahoo\.com|outlook\.com)$/;
    return regex.test(text);
  };

  const handleSendOTP = async () => {
    if (!validateEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid @gmail.com, @yahoo.com, or @outlook.com address without spaces.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/send-verification-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('OTP Sent', 'Please check your email for the verification code.');
        setStep(2);
      } else {
        Alert.alert('Error', data.detail || 'Failed to send OTP.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify({ email: email.trim(), code: otp.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Email verified successfully!');
        // Navigate to Sign Up and pass the verified email
        navigation.navigate('SignUp', { verifiedEmail: email.trim() });
      } else {
        Alert.alert('Verification Failed', data.detail || 'Invalid or expired OTP.');
      }
    } catch (error) {
      Alert.alert('Network Error', 'Could not connect to server.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ChevronLeft size={24} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Shield size={60} color="#00E5FF" />
        </View>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.subtitle}>
          {step === 1 
            ? "Enter your email to receive a verification code. Only verified users can access VigilAI." 
            : `We sent a 6-digit code to ${email}`}
        </Text>

        {step === 1 ? (
          <View style={styles.inputContainer}>
            <Mail size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="user@gmail.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <CheckCircle size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.primaryBtn, isLoading && { opacity: 0.7 }]} 
          onPress={step === 1 ? handleSendOTP : handleVerifyOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#0A0E17" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {step === 1 ? "Send Verification Code" : "Verify & Continue"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipBtn} 
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.skipBtnText}>Already have an account? Skip to Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17', padding: 20 },
  backBtn: { marginTop: 10, marginBottom: 20 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  iconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#161B29', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', paddingHorizontal: 15, marginBottom: 20, width: '100%', height: 55 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  primaryBtn: { backgroundColor: '#00E5FF', borderRadius: 12, width: '100%', height: 55, justifyContent: 'center', alignItems: 'center', shadowColor: '#00E5FF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  primaryBtnText: { color: '#0A0E17', fontSize: 16, fontWeight: 'bold' },
  skipBtn: { marginTop: 20, paddingVertical: 10 },
  skipBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' }
});
