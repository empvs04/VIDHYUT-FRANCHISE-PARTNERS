import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

const DashboardScreen = ({ onNavigateToProfile }) => {
  const { partner } = useAuth();

  const isStateFranchise = partner?.franchiseType === 'STATE_FRANCHISE';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingText}>Welcome back,</Text>
            <Text style={styles.partnerName}>{partner?.fullName || 'Franchise Partner'}</Text>
          </View>

          <TouchableOpacity
            style={styles.profileAvatarButton}
            onPress={onNavigateToProfile}
          >
            <Text style={styles.profileAvatarText}>
              {partner?.fullName ? partner.fullName.charAt(0).toUpperCase() : 'P'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary Franchise ID Card */}
        <View style={styles.franchiseCard}>
          <View style={styles.cardTopRow}>
            <View style={styles.brandPill}>
              <Text style={styles.brandPillText}>⚡ Vidhyut Saathi</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>● {partner?.accountStatus || 'ACTIVE'}</Text>
            </View>
          </View>

          <Text style={styles.franchiseIdLabel}>OFFICIAL FRANCHISE ID</Text>
          <Text style={styles.franchiseIdValue}>{partner?.franchiseId || 'VS-PARTNER'}</Text>

          <View style={styles.cardDivider} />

          <View style={styles.cardMetaRow}>
            <View>
              <Text style={styles.metaLabel}>Franchise Level</Text>
              <Text style={styles.metaValue}>
                {isStateFranchise ? 'State Franchise' : 'District Franchise'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Authorized District</Text>
              <Text style={styles.metaValue}>{partner?.district || 'General'}</Text>
            </View>
          </View>
        </View>

        {/* Authorized Territory Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Authorized Operating Territory</Text>

          <View style={styles.territoryRow}>
            <Text style={styles.territoryIcon}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.territoryState}>State: {partner?.state || 'Maharashtra'}</Text>
              <Text style={styles.territoryDistrict}>
                District: {partner?.district || 'Mumbai'}
              </Text>
              <Text style={styles.territoryCity}>
                Base Operating City: {partner?.city} (PIN: {partner?.pinCode})
              </Text>
            </View>
          </View>

          <View style={styles.territoryInfoBox}>
            <Text style={styles.territoryInfoText}>
              🔒 Territory isolation is active. Sub-franchise & installation privileges are bound to {partner?.district}.
            </Text>
          </View>
        </View>

        {/* Future Modules Section (Disabled Preview) */}
        <Text style={styles.modulesHeaderTitle}>Upcoming Modules (Phase 2+)</Text>

        <View style={styles.modulesGrid}>
          <View style={styles.moduleTile}>
            <Text style={styles.moduleIcon}>💳</Text>
            <Text style={styles.moduleName}>Card Inventory</Text>
            <Text style={styles.moduleBadge}>Phase 2</Text>
          </View>

          <View style={styles.moduleTile}>
            <Text style={styles.moduleIcon}>🏢</Text>
            <Text style={styles.moduleName}>Sub-Franchise</Text>
            <Text style={styles.moduleBadge}>Phase 3</Text>
          </View>

          <View style={styles.moduleTile}>
            <Text style={styles.moduleIcon}>🛠️</Text>
            <Text style={styles.moduleName}>Installations & GPS</Text>
            <Text style={styles.moduleBadge}>Phase 4</Text>
          </View>

          <View style={styles.moduleTile}>
            <Text style={styles.moduleIcon}>📊</Text>
            <Text style={styles.moduleName}>Reports & Payouts</Text>
            <Text style={styles.moduleBadge}>Phase 5</Text>
          </View>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  profileAvatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  profileAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  franchiseCard: {
    backgroundColor: '#0F172A', // Dark Navy Card for sleek physical card look
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  brandPillText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
  },
  franchiseIdLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  franchiseIdValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 2,
  },
  metaValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  territoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  territoryIcon: {
    fontSize: 24,
  },
  territoryState: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  territoryDistrict: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  territoryCity: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  territoryInfoBox: {
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: 6,
    marginTop: 14,
  },
  territoryInfoText: {
    fontSize: 11.5,
    color: '#0369A1',
    lineHeight: 16,
  },
  modulesHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleTile: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.7,
  },
  moduleIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  moduleName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  moduleBadge: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default DashboardScreen;
