import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import OTPVerifyScreen from './src/screens/OTPVerifyScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { COLORS } from './src/styles/colors';

const MainNavigator = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('DASHBOARD'); // 'DASHBOARD' | 'PROFILE'
  const [otpParams, setOtpParams] = useState(null); // { mobileNumber, devCode, cooldownSeconds }

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Not authenticated: Auth Flow
  if (!isAuthenticated) {
    if (otpParams) {
      return (
        <OTPVerifyScreen
          routeParams={otpParams}
          onBackToLogin={() => setOtpParams(null)}
        />
      );
    }
    return (
      <LoginScreen
        onNavigateToOTP={(params) => setOtpParams(params)}
      />
    );
  }

  // Authenticated App Flow
  if (currentScreen === 'PROFILE') {
    return (
      <ProfileScreen
        onBackToDashboard={() => setCurrentScreen('DASHBOARD')}
      />
    );
  }

  return (
    <DashboardScreen
      onNavigateToProfile={() => setCurrentScreen('PROFILE')}
    />
  );
};

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
