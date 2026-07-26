import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Eye, EyeOff } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');

export default function ResetPasswordScreen({ route, navigation }) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { email } = route.params || {};

  const handleReset = async () => {
    if (!code || code.length < 6) {
      alert('Please enter the 6-digit code');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          code: code,
          new_password: newPassword
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to reset password');
      }

      alert('Password reset successfully! You can now log in.');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Reset password error:', error);
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
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Enter the 6-digit code sent to {email} and create a new password.</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="6-Digit Code"
            placeholderTextColor="#64748B"
            style={[styles.input, { letterSpacing: 5, fontWeight: 'bold' }]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Lock size={20} color="#94A3B8" style={styles.icon} />
          <TextInput
            placeholder="New Password"
            placeholderTextColor="#64748B"
            style={styles.input}
            secureTextEntry={!showPassword}
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} color="#94A3B8" /> : <Eye size={20} color="#94A3B8" />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.7 }]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Resetting...' : 'Reset Password'}</Text>
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
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', height: 60, paddingHorizontal: 15, marginBottom: 20 },
  icon: { marginRight: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  btn: { width: '100%', backgroundColor: '#00E5FF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});
