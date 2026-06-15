import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, KeyRound } from 'lucide-react-native';

const API_URL = Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.241.125.80:8000';

export default function VerificationCodeScreen({ route, navigation }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { registrationData } = route.params || {};

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      // 1. Verify Code
      const verifyResponse = await fetch(`${API_URL}/api/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registrationData.email, code: code })
      });

      if (!verifyResponse.ok) {
        const errData = await verifyResponse.json();
        throw new Error(errData.detail || 'Invalid verification code.');
      }

      // 2. Officially Register User
      const backendResponse = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      if (!backendResponse.ok) {
        const errData = await backendResponse.json();
        throw new Error(errData.detail || 'Failed to save account in database.');
      }

      alert('Email Verified! Account created successfully. Please log in.');
      navigation.navigate('Login');

    } catch (error) {
      console.error('Verification error:', error);
      alert(error.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color="#FFFFFF" size={24} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <KeyRound color="#00E5FF" size={60} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to {registrationData?.email}
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Enter 6-digit code"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Verifying...' : 'Verify Email'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  backButton: { marginLeft: 25, marginTop: 20, width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 25, alignItems: 'center', marginTop: 40 },
  iconContainer: { marginBottom: 30, shadowColor: '#00E5FF', shadowOpacity: 0.6, shadowRadius: 15, elevation: 10 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  subtitle: { color: '#94A3B8', fontSize: 16, marginBottom: 40, textAlign: 'center', lineHeight: 24 },
  inputWrapper: { width: '100%', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', height: 70, paddingHorizontal: 15, justifyContent: 'center', marginBottom: 30 },
  input: { color: '#00E5FF', fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: 'bold' },
  btn: { width: '100%', backgroundColor: '#00E5FF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
