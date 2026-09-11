import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../styles/colors';

const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoIcon}>⚡</Text>
      </View>
      <Text style={styles.title}>Vidhyut Saathi</Text>
      <Text style={styles.subtitle}>ENERGY SAVERS PVT. LTD.</Text>
      <Text style={styles.tagline}>Partner Management Network</Text>

      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={COLORS.primary} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  logoIcon: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 50,
  },
});

export default SplashScreen;
