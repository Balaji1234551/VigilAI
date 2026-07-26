import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (!email.trim()) {
      alert('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to send reset code');
      }

      alert('Password reset code sent to your email!');
      navigation.navigate('ResetPassword', { email: email.trim().toLowerCase() });
    } catch (error) {
      console.error('Forgot password error:', error);
      alert(error.message || 'Something went wrong.');
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
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>Enter your email address and we'll send you a 6-digit code to reset your password.</Text>

        <View style={styles.inputWrapper}>
          <Mail size={20} color="#94A3B8" style={styles.icon} />
          <TextInput
            placeholder="Email Address"
            placeholderTextColor="#64748B"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleSendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0A0E17" />
          ) : (
            <Text style={styles.btnText}>Send Reset Code</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  backButton: { marginLeft: 25, marginTop: 20, width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 25, marginTop: 30 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { color: '#94A3B8', fontSize: 16, marginBottom: 40, lineHeight: 24 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', height: 60, paddingHorizontal: 15, marginBottom: 30 },
  icon: { marginRight: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  btn: { width: '100%', backgroundColor: '#00E5FF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
