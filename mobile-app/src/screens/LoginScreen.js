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
  Alert,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

const LoginScreen = ({ onNavigateToOTP }) => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { requestOTP } = useAuth();

  const handleRequestOTP = async () => {
    setErrorMessage('');
    const cleanNumber = mobileNumber.trim();

    if (!cleanNumber) {
      setErrorMessage('Please enter your 10-digit mobile number.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    try {
      setLoading(true);
      const res = await requestOTP(cleanNumber);
      const devCode = res?.data?.devCode;

      onNavigateToOTP({
        mobileNumber: cleanNumber,
        devCode,
        cooldownSeconds: res?.data?.cooldownSeconds || 60,
      });
    } catch (err) {
      const serverMsg =
        err.response?.data?.message ||
        'This mobile number is not registered or authorized as a Vidhyut Saathi Partner.';
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
          <Text style={styles.brandSubtitle}>Franchise Partner Network</Text>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Partner Login</Text>
          <Text style={styles.cardDescription}>
            Enter your registered 10-digit mobile number to receive a verification OTP.
          </Text>

          {/* Mobile Input */}
          <Text style={styles.inputLabel}>Mobile Number</Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.prefixBox}>
              <Text style={styles.prefixText}>🇮🇳 +91</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              placeholder="9876543210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              maxLength={10}
              value={mobileNumber}
              onChangeText={(val) => {
                setMobileNumber(val);
                if (errorMessage) setErrorMessage('');
              }}
            />
          </View>

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
              🔒 Restricted to authorized Franchise Partners. Accounts are created and activated by Super Admin.
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  prefixBox: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phoneInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: COLORS.border,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    backgroundColor: '#FFFFFF',
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
