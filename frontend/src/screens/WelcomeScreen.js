import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, StatusBar, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Eye, Shield, Zap, Target, ChevronRight } from 'lucide-react-native';

// Import CSS for web animations
if (Platform.OS === 'web') {
  require('./WelcomeScreen.web.css');
}

export default function WelcomeScreen({ navigation }) {
  const [scrollY] = useState(new Animated.Value(0));
  const [animationValues] = useState({
    iconRotate: new Animated.Value(0),
    cardScale: [new Animated.Value(1), new Animated.Value(1), new Animated.Value(1)],
  });

  useEffect(() => {

    // Continuous rotation animation for the eye icon
    Animated.loop(
      Animated.timing(animationValues.iconRotate, {
        toValue: 360,
        duration: 6000,
        useNativeDriver: true,
      })
    ).start();

    // Staggered card animations
    animationValues.cardScale.forEach((scale, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.loop(
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.05,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    });
  }, []);

  const iconRotation = animationValues.iconRotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Animated.View 
            style={[
              styles.iconGlow,
              Platform.OS === 'web' && {
                transform: [{ rotate: iconRotation }],
              },
            ]}
            className={Platform.OS === 'web' ? 'icon-glow' : ''}
          >
            <View style={styles.orbitRing} className={Platform.OS === 'web' ? 'orbit-ring' : ''} />
            <View style={styles.orbitRing2} className={Platform.OS === 'web' ? 'orbit-ring-2' : ''} />
            <Eye size={80} color="#00E5FF" strokeWidth={1.5} />
          </Animated.View>
          
          <Text style={styles.brandName}>VIGILAI</Text>
          <Text style={styles.mainTitle}>AI-Based Real-Time Intelligent Surveillance System</Text>
          <Text style={styles.subtitle}>Behavioral Anomaly Detection and Automated User Safety</Text>
        </View>

        <View style={styles.featuresContainer}>
          <AnimatedFeatureCard 
            scale={animationValues.cardScale[0]}
            icon={<Zap size={24} color="#00E5FF" />} 
            title="Real-Time Detection" 
            desc="1.8s average response time for 13 threat types"
            color="#00E5FF"
          />
          <AnimatedFeatureCard 
            scale={animationValues.cardScale[1]}
            icon={<Shield size={24} color="#00C853" />} 
            title="Privacy First" 
            desc="Edge AI processing - your footage never leaves your device"
            color="#00C853"
          />
          <AnimatedFeatureCard 
            scale={animationValues.cardScale[2]}
            icon={<Target size={24} color="#FFD600" />} 
            title="Multi-Threat Detection" 
            desc="Falls, theft, weapons, fire, unauthorized access & more"
            color="#FFD600"
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.getStartedBtn} 
            onPress={() => navigation.navigate('EmailVerification')}
            activeOpacity={0.85}
            className={Platform.OS === 'web' ? 'get-started-btn' : ''}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
            <ChevronRight size={20} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.signInBtn} 
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
            className={Platform.OS === 'web' ? 'sign-in-btn' : ''}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
          <Text style={styles.bottomTagline}>Intelligent Surveillance. Instant Safety.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AnimatedFeatureCard = ({ scale, icon, title, desc, color }) => (
  <Animated.View 
    style={[
      styles.card,
      Platform.OS !== 'web' && { transform: [{ scale }] },
      { borderColor: color + '30' },
    ]}
    className={Platform.OS === 'web' ? 'feature-card' : ''}
  >
    <View style={[styles.cardIconContainer, { backgroundColor: color + '15' }]}>
      {icon}
    </View>
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
  </Animated.View>
);

const FeatureCard = ({ icon, title, desc }) => (
  <View style={styles.card}>
    <View style={styles.cardIconContainer}>{icon}</View>
    <View style={styles.cardTextContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A0E17',
    height: Platform.OS === 'web' ? '100vh' : '100%',
  },
  scrollContent: { 
    paddingHorizontal: 25, 
    paddingVertical: 40, 
    alignItems: 'center',
    paddingBottom: 80,
  },
  header: { 
    alignItems: 'center', 
    marginBottom: 40,
    zIndex: 1,
  },
  iconGlow: { 
    shadowColor: '#00E5FF', 
    shadowOpacity: 0.8, 
    shadowRadius: 30, 
    elevation: 20, 
    marginBottom: 20,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  orbitRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  orbitRing2: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.1)',
  },
  brandName: { 
    color: '#00BFA5', 
    fontSize: 28, 
    fontWeight: '900', 
    letterSpacing: 2, 
    marginBottom: 10,
  },
  mainTitle: { 
    color: '#FFFFFF', 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    lineHeight: 28, 
    marginBottom: 15 
  },
  subtitle: { 
    color: '#94A3B8', 
    fontSize: 14, 
    textAlign: 'center', 
    paddingHorizontal: 20 
  },
  featuresContainer: { 
    width: '100%', 
    gap: 15, 
    marginBottom: 40,
    zIndex: 1,
  },
  card: { 
    flexDirection: 'row', 
    backgroundColor: '#161B29', 
    borderRadius: 12, 
    padding: 16, 
    borderWidth: 2,
    borderColor: '#242C3E',
  },
  cardIconContainer: { 
    marginRight: 15, 
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  cardTextContainer: { flex: 1 },
  cardTitle: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginBottom: 4 
  },
  cardDesc: { 
    color: '#94A3B8', 
    fontSize: 12, 
    lineHeight: 18 
  },
  footer: { 
    width: '100%', 
    alignItems: 'center',
    zIndex: 1,
    marginTop: 20,
  },
  getStartedBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#00E5FF', 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  getStartedText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginRight: 5 
  },
  signInBtn: { 
    width: '100%', 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#242C3E', 
    alignItems: 'center', 
    marginBottom: 30,
  },
  signInText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  bottomTagline: { 
    color: '#64748B', 
    fontSize: 11, 
    letterSpacing: 0.5 
  },
});
