import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';



const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://172.23.50.173:8000');

export default function SignUpScreen({ route, navigation }) {
  const verifiedEmail = route.params?.verifiedEmail || '';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState(verifiedEmail);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !password.trim() || !confirmPassword.trim()) {
      alert('Please fill in all required fields, including your phone number.');
      return;
    }

    // 1. Validate Full Name (Min 3 chars, letters and spaces only)
    const nameRegex = /^[A-Za-z\s]{3,}$/;
    if (!nameRegex.test(fullName.trim())) {
      alert('Full Name must be at least 3 characters and contain no special symbols.');
      return;
    }

    // 2. Validate Email (Already verified, just a safety check)
    if (!email) {
      alert('Email not verified. Please go back and verify your email.');
      return;
    }

    // 3. Validate Phone Number (Exactly 10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      alert('Phone Number must contain exactly 10 digits.');
      return;
    }

    // 4. Validate Password (Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert('Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
      return;
    }

    if (password !== confirmPassword) {
      alert('Password and confirm password must match.');
      return;
    }

    if (!agree) {
      alert('Please agree to the Terms & Conditions and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password: password,
        phone: phoneNumber.trim() || null
      };

      // Call API to register user
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create account.');
      }

      // Explicitly require the user to log in manually per requirements
      alert('Account created successfully! Please log in to continue.');
      navigation.replace('Login');
    } catch (error) {
      console.error('Sign up error:', error);
      if (error.message.includes('already exists')) {
        alert('Email already registered! Redirecting to Login...');
        navigation.navigate('Login');
      } else {
        alert(error.message || 'Sign up failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        <View style={styles.form}>
          <InputGroup icon={<User size={20} color="#94A3B8" />} placeholder="Full Name" value={fullName} onChangeText={setFullName} />
          <InputGroup icon={<Mail size={20} color="#94A3B8" />} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={false} />
          <InputGroup icon={<Phone size={20} color="#94A3B8" />} placeholder="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
          <InputGroup icon={<Lock size={20} color="#94A3B8" />} placeholder="Password" value={password} onChangeText={setPassword} isPassword={true} />
          <InputGroup icon={<Lock size={20} color="#94A3B8" />} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} isPassword={true} />
        </View>

        <View style={styles.termsContainer}>
          <Checkbox style={styles.checkbox} value={agree} onValueChange={setAgree} color={agree ? '#00E5FF' : undefined} />
          <Text style={styles.termsText}>I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text></Text>
        </View>

        <TouchableOpacity
          style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0A0E17" />
          ) : (
            <Text style={styles.signUpBtnText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerText}>Already have an account? <Text style={styles.loginLink}>Login</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const InputGroup = ({ icon, placeholder, isPassword, value, onChangeText, keyboardType = 'default', autoCapitalize = 'sentences', editable = true }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputWrapper}>
      <View style={styles.inputIcon}>{icon}</View>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        style={styles.input}
        secureTextEntry={isPassword && !showPassword}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        editable={editable}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          {showPassword ? (
            <EyeOff size={20} color="#94A3B8" />
          ) : (
            <Eye size={20} color="#94A3B8" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 25, paddingTop: 20, paddingBottom: 40 },
  backButton: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#94A3B8', fontSize: 16 },
  form: { gap: 15, marginBottom: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', height: 60, paddingHorizontal: 15 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  termsContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, marginBottom: 30 },
  checkbox: { width: 20, height: 20, borderRadius: 4, marginRight: 12, marginTop: 2 },
  termsText: { color: '#94A3B8', fontSize: 13, lineHeight: 20, flex: 1 },
  linkText: { color: '#00E5FF' },
  signUpBtn: { backgroundColor: '#00E5FF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  signUpBtnText: { color: '#000000', fontSize: 18, fontWeight: 'bold' },
  footer: { alignItems: 'center' },
  footerText: { color: '#94A3B8', fontSize: 14 },
  loginLink: { color: '#00E5FF', fontWeight: 'bold' },
});
