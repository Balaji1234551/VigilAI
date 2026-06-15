import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { Mail, Lock, Eye, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '<YOUR_EXPO_CLIENT_ID>',
    iosClientId: '<YOUR_IOS_CLIENT_ID>',
    androidClientId: '<YOUR_ANDROID_CLIENT_ID>',
    webClientId: '<YOUR_WEB_CLIENT_ID>',
    scopes: ['profile', 'email'],
    responseType: 'token',
    redirectUri: makeRedirectUri({ useProxy: true }),
  });

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

  useEffect(() => {
    const fetchGoogleUser = async () => {
      const accessToken = response?.authentication?.accessToken;
      if (response?.type === 'success' && accessToken) {
        try {
          const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const userInfo = await userInfoResponse.json();
          if (userInfo?.email) {
            setEmail(userInfo.email);
            await AsyncStorage.setItem('userEmail', userInfo.email);
            await AsyncStorage.removeItem('userPassword');
            navigation.navigate('Home');
          }
        } catch (error) {
          console.error('Error fetching Google user info:', error);
          alert('Google sign-in succeeded, but user info could not be loaded.');
        }
      }
    };
    fetchGoogleUser();
  }, [response, navigation]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter both email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email');
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert('Password must be at least 8 characters with uppercase, lowercase, and number');
      return;
    }

    try {
      if (rememberMe) {
        await AsyncStorage.setItem('userEmail', email);
        await AsyncStorage.setItem('userPassword', password);
      } else {
        await AsyncStorage.removeItem('userEmail');
        await AsyncStorage.removeItem('userPassword');
      }
      navigation.navigate('Home');
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('Login failed. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft color="#FFFFFF" size={24} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Logo Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.iconGlow}>
            <View style={styles.eyeOuter}>
               <View style={styles.eyeInner} />
            </View>
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        {/* Form */}
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
              secureTextEntry 
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity><Eye size={20} color="#94A3B8" /></TouchableOpacity>
          </View>

          {/* Remember Me Checkbox */}
          <View style={styles.checkboxContainer}>
            <Checkbox 
              style={styles.checkbox} 
              value={rememberMe} 
              onValueChange={setRememberMe} 
              color={rememberMe ? '#00E5FF' : undefined} 
            />
            <Text style={styles.checkboxText}>Remember me</Text>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.line} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.line} />
        </View>

        {/* Google Sign In */}
<TouchableOpacity style={styles.googleBtn} onPress={async () => {
            if (!request) {
              alert('Google sign-in is not ready yet. Please try again in a moment.');
              return;
            }
            try {
              await promptAsync({ useProxy: true });
            } catch (error) {
              console.error('Google sign-in error:', error);
              alert('Unable to sign in with Google. Please try again.');
            }
          }}>
          <Text style={styles.googleText}>G  Sign in with Google</Text>
        </TouchableOpacity>

        {/* Footer */}
        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.signUpLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
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