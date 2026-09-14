import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

const ProfileScreen = ({ onBackToDashboard }) => {
  const { partner, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out from Vidhyut Saathi Partner App?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backButton} onPress={onBackToDashboard}>
            <Text style={styles.backButtonText}>← Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Partner Profile</Text>
          <View style={{ width: 80 }} />
        </View>

        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {partner?.fullName ? partner.fullName.charAt(0).toUpperCase() : 'P'}
            </Text>
          </View>
          <Text style={styles.profileName}>{partner?.fullName || 'Partner'}</Text>
          <Text style={styles.profileFranchiseId}>{partner?.franchiseId}</Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>Status: {partner?.accountStatus || 'ACTIVE'}</Text>
          </View>
        </View>

        {/* Details Group */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Contact & Location Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registered Mobile</Text>
            <Text style={styles.detailValue}>+91 {partner?.mobileNumber}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email Address</Text>
            <Text style={styles.detailValue}>{partner?.email || 'Not Provided'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>State</Text>
            <Text style={styles.detailValue}>{partner?.state}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>District</Text>
            <Text style={styles.detailValue}>{partner?.district}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Operating City</Text>
            <Text style={styles.detailValue}>{partner?.city}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Registered Address</Text>
            <Text style={styles.detailValue}>
              {partner?.addressLine1}
              {partner?.addressLine2 ? `, ${partner?.addressLine2}` : ''}
              {'\n'}PIN Code: {partner?.pinCode}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>Joining Date</Text>
            <Text style={styles.detailValue}>
              {new Date(partner?.joiningDate || Date.now()).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Log Out Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.primary,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileFranchiseId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  statusPill: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  statusPillText: {
    color: COLORS.success,
    fontSize: 11.5,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 11.5,
    color: COLORS.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    borderRadius: 8,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ProfileScreen;
