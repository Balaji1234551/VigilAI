const fs = require('fs');

let content = fs.readFileSync('src/screens/ProfileScreen.js', 'utf8');

const target = `export default function ProfileScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
              <TouchableOpacity style={styles.cameraIconBtn}>
                <Camera size={14} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Alex Johnson</Text>
              <Text style={styles.userEmail}>alex.johnson@email.com</Text>
              <Text style={styles.userPhone}>+1 (555) 123-4567</Text>
            </View>`;

const replacement = `export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('No email provided');
  const [userPhone, setUserPhone] = useState('No phone provided');

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.displayName) setUserName(userData.displayName);
          if (userData.email) setUserEmail(userData.email);
          // Note: If you saved phone number in AsyncStorage during signup, it would be fetched here.
          if (userData.phoneNumber) setUserPhone(userData.phoneNumber);
        }
      } catch (e) {
        console.error('Failed to load user data', e);
      }
    };
    fetchUser();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* User Identity Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
              <TouchableOpacity style={styles.cameraIconBtn}>
                <Camera size={14} color="#000" />
              </TouchableOpacity>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
              <Text style={styles.userPhone}>{userPhone}</Text>
            </View>`;

// handle CRLF
const targetRegex = new RegExp(target.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
content = content.replace(targetRegex, replacement);

const targetImport = `import React from 'react';`;
const replacementImport = `import React, { useState, useEffect } from 'react';\nimport AsyncStorage from '@react-native-async-storage/async-storage';`;

const targetImportRegex = new RegExp(targetImport.replace(/[.*+?^$\{key}()|[\]\\]/g, '\\$&').replace(/\r?\n/g, '\\r?\\n'));
content = content.replace(targetImportRegex, replacementImport);

fs.writeFileSync('src/screens/ProfileScreen.js', content, 'utf8');
console.log('Done Profile Update');
