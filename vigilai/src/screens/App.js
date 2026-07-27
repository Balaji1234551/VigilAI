import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Remove flaky CSS injection and rely on React Native Web styling
// Import your screen files
// LoginScreen lives one folder up from src/screens
import WelcomeScreen from './WelcomeScreen';
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
import NotificationSettingsScreen from './NotificationSettingsScreen';
import PrivacySecurityScreen from './PrivacySecurityScreen';
import PrivacyZonesScreen from './PrivacyZonesScreen';
import AlertDetailsScreen from './AlertDetailsScreen';
import ConnectedDevicesScreen from './ConnectedDevicesScreen';
import LanguageScreen from './LanguageScreen';
import SubscriptionScreen from './SubscriptionScreen';
import HelpSupportScreen from './HelpSupportScreen';
import TermsPrivacyScreen from './TermsPrivacyScreen';
import RiskHeatmapScreen from './RiskHeatmapScreen';
import AlertCalendarScreen from './AlertCalendarScreen';
import TrustedPersonsScreen from './TrustedPersonsScreen';
import CameraDetailsScreen from './CameraDetailsScreen';
import CameraSettingsScreen from './CameraSettingsScreen';
import EmergencyContactsScreen from './EmergencyContactsScreen';
import VerificationCodeScreen from './VerificationCodeScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';
import ResetPasswordScreen from './ResetPasswordScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, height: Platform.OS === 'web' ? '100vh' : '100%', backgroundColor: '#0A0E17', overflow: 'hidden' }}>
      <NavigationContainer>
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
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Cameras" component={CameraScreen} />
          <Stack.Screen name="AddCamera" component={AddCameraScreen} />
          <Stack.Screen name="Alerts" component={AlertsScreen} />
          <Stack.Screen name="Analytics" component={AnalyticsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="PatrolMode" component={PatrolModeScreen} />
          <Stack.Screen name="EmergencySOS" component={EmergencySOSScreen} />
          <Stack.Screen name="Notifications" component={NotificationSettingsScreen} />
          <Stack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
          <Stack.Screen name="Privacy" component={PrivacySecurityScreen} />
          <Stack.Screen name="PrivacyZones" component={PrivacyZonesScreen} />
          <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} />
          <Stack.Screen name="ConnectedDevices" component={ConnectedDevicesScreen} />
          <Stack.Screen name="Language" component={LanguageScreen} />
          <Stack.Screen name="Subscription" component={SubscriptionScreen} />
          <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
          <Stack.Screen name="TermsPrivacy" component={TermsPrivacyScreen} />
          <Stack.Screen name="RiskHeatmap" component={RiskHeatmapScreen} />
          <Stack.Screen name="AlertCalendar" component={AlertCalendarScreen} />
          <Stack.Screen name="TrustedPersons" component={TrustedPersonsScreen} />
          <Stack.Screen name="CameraDetails" component={CameraDetailsScreen} />
          <Stack.Screen name="CameraSettings" component={CameraSettingsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
