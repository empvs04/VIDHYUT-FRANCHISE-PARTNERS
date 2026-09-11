import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ onNavigateToOTP }) => {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { requestOTP } = useAuth();

  const handleRequestOTP = async () => {
    setErrorMessage('');
    const cleanInput = identifier.trim();

    if (!cleanInput) {
      setErrorMessage('Please enter your Mobile Number, Email, or Franchise ID.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOTP(cleanInput);
      const devCode = res?.data?.devCode;
      const maskedMobile = res?.data?.maskedMobile;

      onNavigateToOTP({
        identifier: cleanInput,
        maskedMobile,
        devCode,
        cooldownSeconds: res?.data?.cooldownSeconds || 60,
      });
    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        'This Mobile Number, Email, or Franchise ID is not registered or authorized as an active Vidhyut Saathi Partner.';
      setErrorMessage(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Branding */}
        <View style={styles.brandHeader}>
          <View style={styles.iconContainer}>
            <Text style={styles.brandIcon}>⚡</Text>
          </View>
          <Text style={styles.brandTitle}>Vidhyut Saathi</Text>
          <Text style={styles.brandSubtitle}>Franchise Partner Portal</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Partner Sign In</Text>
          <Text style={styles.cardDescription}>
            Enter your registered Mobile Number, Email Address, or Franchise ID to receive a verification OTP.
          </Text>

          {/* Identifier Input */}
          <Text style={styles.inputLabel}>Mobile No. / Email / Franchise ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 9820123456 or VS-DT-MH-MUM-..."
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            value={identifier}
            onChangeText={(val) => {
              setIdentifier(val);
              if (errorMessage) setErrorMessage('');
            }}
          />

          {/* Error message alert */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleRequestOTP}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Request OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.securityNotice}>
            <Text style={styles.securityNoticeText}>
              🔒 Secure login. An OTP will be dispatched to your registered phone number.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 4,
  },
  brandIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  brandSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12.5,
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  securityNotice: {
    marginTop: 18,
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  securityNoticeText: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    lineHeight: 15,
    textAlign: 'center',
  },
});

export default LoginScreen;
