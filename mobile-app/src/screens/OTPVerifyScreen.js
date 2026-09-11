import React, { useState, useEffect } from 'react';
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

const OTPVerifyScreen = ({ routeParams, onBackToLogin }) => {
  const { mobileNumber, devCode, cooldownSeconds = 60 } = routeParams;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [timer, setTimer] = useState(cooldownSeconds);

  const { verifyOTP, resendOTP } = useAuth();

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    setErrorMessage('');
    const cleanOTP = otp.trim();

    if (!cleanOTP || cleanOTP.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      await verifyOTP(mobileNumber, cleanOTP);
      // Handled automatically by AuthContext (sets token and partner)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setErrorMessage('');
    try {
      setLoading(true);
      await resendOTP(mobileNumber);
      setTimer(60);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to resend OTP.');
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
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Verify Mobile OTP</Text>
          <Text style={styles.cardDescription}>
            We have sent a 6-digit verification code to:
          </Text>

          <View style={styles.phoneBadge}>
            <Text style={styles.phoneBadgeText}>+91 {mobileNumber}</Text>
            <TouchableOpacity onPress={onBackToLogin}>
              <Text style={styles.changePhoneText}>Change</Text>
            </TouchableOpacity>
          </View>

          {devCode ? (
            <View style={styles.devCodeNotice}>
              <Text style={styles.devCodeLabel}>⚡ Development Mode OTP Code:</Text>
              <Text style={styles.devCodeValue}>{devCode}</Text>
            </View>
          ) : null}

          {/* OTP Input */}
          <Text style={styles.inputLabel}>Enter 6-Digit Code</Text>
          <TextInput
            style={styles.otpInput}
            placeholder="••••••"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={(val) => {
              setOtp(val);
              if (errorMessage) setErrorMessage('');
            }}
            autoFocus
          />

          {/* Error display */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.primaryButton, (loading || otp.length !== 6) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Verify & Login</Text>
            )}
          </TouchableOpacity>

          {/* Resend Cooldown Timer */}
          <View style={styles.resendContainer}>
            {timer > 0 ? (
              <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} disabled={loading}>
                <Text style={styles.resendButtonText}>Resend New OTP</Text>
              </TouchableOpacity>
            )}
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
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
  },
  phoneBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  changePhoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  devCodeNotice: {
    backgroundColor: '#E0F2FE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  devCodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  devCodeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 4,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  otpInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
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
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  timerText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  resendButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default OTPVerifyScreen;
