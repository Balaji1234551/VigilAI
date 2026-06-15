import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  SafeAreaView, ScrollView, StatusBar 
} from 'react-native';
import { User, Mail, Phone, Lock, Eye, ArrowLeft } from 'lucide-react-native';
import Checkbox from 'expo-checkbox';

export default function SignUpScreen() {
  const [agree, setAgree] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton}>
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>

        {/* Title Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* Form Section */}
        <View style={styles.form}>
          <InputGroup icon={<User size={20} color="#94A3B8" />} placeholder="Full Name" />
          <InputGroup icon={<Mail size={20} color="#94A3B8" />} placeholder="Email" />
          <InputGroup icon={<Phone size={20} color="#94A3B8" />} placeholder="Phone Number" />
          
          <InputGroup 
            icon={<Lock size={20} color="#94A3B8" />} 
            placeholder="Password" 
            isPassword={true} 
          />
          <InputGroup 
            icon={<Lock size={20} color="#94A3B8" />} 
            placeholder="Confirm Password" 
            isPassword={true} 
          />
        </View>

        {/* Terms & Conditions */}
        <View style={styles.termsContainer}>
          <Checkbox
            style={styles.checkbox}
            value={agree}
            onValueChange={setAgree}
            color={agree ? '#00E5FF' : undefined}
          />
          <Text style={styles.termsText}>
            I agree to the <Text style={styles.linkText}>Terms & Conditions</Text> and <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity style={styles.signUpBtn}>
          <Text style={styles.signUpBtnText}>Sign Up</Text>
        </TouchableOpacity>

        {/* Footer */}
        <TouchableOpacity style={styles.footer}>
          <Text style={styles.footerText}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// Custom Input Component
const InputGroup = ({ icon, placeholder, isPassword }) => (
  <View style={styles.inputWrapper}>
    <View style={styles.inputIcon}>{icon}</View>
    <TextInput 
      placeholder={placeholder}
      placeholderTextColor="#64748B"
      style={styles.input}
      secureTextEntry={isPassword}
    />
    {isPassword && (
      <TouchableOpacity style={styles.eyeIcon}>
        <Eye size={20} color="#94A3B8" />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
  },
  form: {
    gap: 20,
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B29',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242C3E',
    height: 60,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  eyeIcon: {
    marginLeft: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 30,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderColor: '#242C3E',
    marginRight: 12,
    marginTop: 2,
  },
  termsText: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  linkText: {
    color: '#00E5FF',
  },
  signUpBtn: {
    backgroundColor: '#00E5FF',
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  signUpBtnText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  loginLink: {
    color: '#00E5FF',
    fontWeight: 'bold',
  }
});