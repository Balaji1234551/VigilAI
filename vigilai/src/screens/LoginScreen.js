import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, StatusBar, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';



const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://10.202.212.80:8000');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkSavedCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('userEmail');
        const savedPassword = await AsyncStorage.getItem('userPassword');
        if (savedEmail && savedPassword) {
          setEmail(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Error loading credentials:', error);
      }
    };
    checkSavedCredentials();
  }, []);

  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      alert('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      let backendUserData = null;
      try {
        const backendLoginResponse = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Bypass-Tunnel-Reminder': 'true'
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password,
            device_info: `${Platform.OS} device`
          })
        });

        const rawText = await backendLoginResponse.text();
        let responseData;
        try {
          responseData = JSON.parse(rawText);
        } catch (parseError) {
          throw new Error('Backend returned invalid response (Not JSON). Server might be down or crashed. Snippet: ' + rawText.substring(0, 50));
        }

        if (backendLoginResponse.ok) {
          backendUserData = responseData;
        } else {
          throw new Error(responseData.detail || responseData.message || 'Backend login authentication failed.');
        }
      } catch (e) {
        console.error('Backend database authentication failed:', e);
        throw new Error(e.message || 'Failed to authenticate with backend server.');
      }

      // Save user info locally
      if (backendUserData) {
        await AsyncStorage.setItem('userToken', backendUserData.access_token || backendUserData.token);
        await AsyncStorage.setItem('userData', JSON.stringify({
          uid: backendUserData.user.id.toString(),
          id: backendUserData.user.id,
          email: backendUserData.user.email,
          displayName: backendUserData.user.name,
          phone: backendUserData.user.phone,
          plan: backendUserData.user.plan
        }));
      }

      if (rememberMe) {
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('userPassword', password);
      } else {
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userPassword');
      }

      navigation.navigate('Home');
    } catch (error) {
      console.error('Login error:', error);
      alert(error.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <TouchableOpacity style={styles.backButton} onPress={() => {
        navigation.goBack();
      }}>
        <ArrowLeft color="#FFFFFF" size={24} />
      </TouchableOpacity>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.iconGlow}>
            <View style={styles.eyeOuter}>
               <View style={styles.eyeInner} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.form}>
          <View style={styles.inputWrapper}>
            <Mail size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Lock size={20} color="#94A3B8" style={styles.icon} />
            <TextInput
              placeholder="Password"
              placeholderTextColor="#64748B"
              style={styles.input}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color="#94A3B8" />
              ) : (
                <Eye size={20} color="#94A3B8" />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.checkboxContainer}>
            <Checkbox
              style={styles.checkbox}
              value={rememberMe}
              onValueChange={setRememberMe}
              color={rememberMe ? '#00E5FF' : undefined}
            />
            <Text style={styles.checkboxText}>Remember me</Text>
          </View>

          <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0A0E17" />
            ) : (
              <Text style={styles.loginBtnText}>Login</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn}>
          <Text style={styles.googleText}>G  Sign in with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('EmailVerification')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  backButton: { marginLeft: 25, marginTop: 20, width: 40, height: 40, justifyContent: 'center' },
  content: { flex: 1, paddingHorizontal: 25, alignItems: 'center' },
  logoContainer: { marginTop: 20, marginBottom: 20 },
  iconGlow: { shadowColor: '#00E5FF', shadowOpacity: 0.8, shadowRadius: 20, elevation: 15 },
  eyeOuter: { width: 70, height: 45, borderRadius: 25, borderWidth: 3, borderColor: '#00E5FF', justifyContent: 'center', alignItems: 'center' },
  eyeInner: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#00E5FF' },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#94A3B8', fontSize: 16, marginBottom: 40 },
  form: { width: '100%', gap: 20 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#161B29', borderRadius: 12, borderWidth: 1, borderColor: '#242C3E', height: 60, paddingHorizontal: 15 },
  icon: { marginRight: 12 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  forgotBtn: { alignSelf: 'flex-end' },
  forgotText: { color: '#00E5FF', fontSize: 13, fontWeight: '600' },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  checkbox: { width: 20, height: 20, borderRadius: 4, marginRight: 12 },
  checkboxText: { color: '#94A3B8', fontSize: 14 },
  loginBtn: { backgroundColor: '#00E5FF', height: 60, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  loginBtnText: { color: '#000', fontSize: 18, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 30, width: '100%' },
  line: { flex: 1, height: 1, backgroundColor: '#242C3E' },
  orText: { color: '#94A3B8', paddingHorizontal: 15, fontSize: 12 },
  googleBtn: { width: '100%', height: 60, borderRadius: 15, borderWidth: 1, borderColor: '#242C3E', justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  googleText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  footer: { marginTop: 40 },
  footerText: { color: '#94A3B8', fontSize: 14 },
  signUpLink: { color: '#00E5FF', fontWeight: 'bold' }
});
