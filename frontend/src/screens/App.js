import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GlobalProvider } from '../context/GlobalContext';

// Import your screen files
// LoginScreen lives one folder up from src/screens
import WelcomeScreen from './WelcomeScreen';

// Removed buggy global CSS scroll hack that breaks RNW flexbox
import EmailVerificationScreen from './EmailVerificationScreen';
import SignUpScreen from './SignUpScreen';
import LoginScreen from './LoginScreen';
import HomeScreen from './HomeScreen';
import CameraScreen from './CameraScreen';
import AddCameraScreen from './AddCameraScreen';
import AlertsScreen from './AlertsScreen';
import AnalyticsScreen from './AnalyticsScreen';
import ProfileScreen from './ProfileScreen';
import EmergencySOSScreen from './EmergencySOSScreen';
import PatrolModeScreen from './PatrolModeScreen';
import PrivacyZonesScreen from './PrivacyZonesScreen';
import AlertDetailsScreen from './AlertDetailsScreen';
import HelpSupportScreen from './HelpSupportScreen';
import TrustedPersonsScreen from './TrustedPersonsScreen';
import CameraDetailsScreen from './CameraDetailsScreen';
import CameraSettingsScreen from './CameraSettingsScreen';
import EmergencyContactsScreen from './EmergencyContactsScreen';
import VerificationCodeScreen from './VerificationCodeScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Camera, Bell, BarChart2, User } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopWidth: 1,
          borderTopColor: '#1E293B',
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
          width: '100%'
        },
        tabBarActiveTintColor: '#00E5FF',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 10, marginTop: 4 }
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="CamerasTab" 
        component={CameraScreen} 
        options={{
          tabBarLabel: 'Cameras',
          tabBarIcon: ({ color }) => <Camera size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="AlertsTab" 
        component={AlertsScreen} 
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Bell size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="AnalyticsTab" 
        component={AnalyticsScreen} 
        options={{
          tabBarLabel: 'Analytics',
          tabBarIcon: ({ color }) => <BarChart2 size={24} color={color} />
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User size={24} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['vigilai://', 'https://vigilai.com'],
  config: {
    screens: {
      Welcome: '',
      Login: 'login',
      SignUp: 'signup',
      EmailVerification: 'verify-email',
      VerificationCode: 'verify-code',
      ForgotPassword: 'forgot-password',
      ResetPassword: 'reset-password',
      MainTabs: {
        path: 'app',
        screens: {
          Dashboard: 'home',
          CamerasTab: 'cameras',
          AlertsTab: 'alerts',
          AnalyticsTab: 'analytics',
          ProfileTab: 'profile',
        },
      },
      AddCamera: 'cameras/add',
      CameraDetails: 'cameras/details/:cameraId',
      CameraSettings: 'cameras/settings/:cameraId',
      PatrolMode: 'cameras/patrol',
      EmergencySOS: 'emergency/sos',
      EmergencyContacts: 'profile/emergency-contacts',
      PrivacyZones: 'cameras/privacy-zones',
      AlertDetails: 'alerts/details/:alertId',
      HelpSupport: 'support',
      TrustedPersons: 'profile/trusted',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: '#0A0E17' }}>
      <GlobalProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator 
            initialRouteName="Welcome"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            
            {/* Sub-screens (No tabs shown) */}
            <Stack.Screen name="AddCamera" component={AddCameraScreen} />
            <Stack.Screen name="PatrolMode" component={PatrolModeScreen} />
            <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
            <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
            <Stack.Screen name="PrivacyZones" component={PrivacyZonesScreen} />
            <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} />
            <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
            <Stack.Screen name="TrustedPersons" component={TrustedPersonsScreen} />
            <Stack.Screen name="CameraDetails" component={CameraDetailsScreen} />
            <Stack.Screen name="CameraSettings" component={CameraSettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </GlobalProvider>
    </SafeAreaProvider>
  );
}
