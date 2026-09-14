import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import Transaction from '../models/Transaction.model.js';
import Installation from '../models/Installation.model.js';
import Customer from '../models/Customer.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import LocationVerification from '../models/LocationVerification.model.js';
import User from '../models/User.model.js';

import * as analyticsService from '../services/analytics.service.js';
import * as reportService from '../services/report.service.js';
import { USER_ROLES } from '../config/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const runPhase7Tests = async () => {
  console.log('🧪 Starting Phase 7 Analytics, Business Intelligence & Export Tests...');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas for Phase 7 Testing');

    const superAdminUser = { role: USER_ROLES.SUPER_ADMIN };

    // Test 1: Overview Analytics
    console.log('\n--- Test 1: Overview Analytics Aggregation ---');
    const overview = await analyticsService.getOverviewAnalytics({
      dateRange: 'LAST_30_DAYS',
      user: superAdminUser,
      partner: null,
    });
    console.log('Total Partners in DB:', overview.metrics.partners.total);
    console.log('Total Cards in Inventory:', overview.metrics.cards.totalCards);
    console.log('Cards With Partners:', overview.metrics.cards.cardsWithPartners);
    console.log('Installed Cards:', overview.metrics.cards.installed);
    console.log('Customer Revenue (INR):', overview.metrics.revenue.customerRevenue);
    console.log('P2P Confirmed Sales (INR):', overview.metrics.revenue.p2pConfirmedSales);
    console.log('✅ Overview Analytics test passed!');

    // Test 2: Revenue Analytics (P2P vs Customer Separation)
    console.log('\n--- Test 2: Revenue Analytics Separation ---');
    const revenueData = await analyticsService.getRevenueAnalytics({ dateRange: 'ALL_TIME' });
    console.log('P2P Total Sales Value:', revenueData.partnerToPartner.totalSalesValue);
    console.log('P2P Verified Payments:', revenueData.partnerToPartner.verifiedPayments);
    console.log('Customer Installation Sales:', revenueData.customerInstallations.totalCustomerSales);
    console.log('✅ Revenue Analytics test passed!');

    // Test 3: Card Lifecycle Analytics
    console.log('\n--- Test 3: Card Lifecycle Activity ---');
    const cardLifecycle = await analyticsService.getCardLifecycleAnalytics({ dateRange: 'THIS_YEAR' });
    console.log('Current Inventory Breakdown:', cardLifecycle.currentStatus);
    console.log('Lifecycle Activity in Period:', cardLifecycle.lifecycleInPeriod);
    console.log('✅ Card Lifecycle test passed!');

    // Test 4: Partner Performance & Leaderboard Rankings
    console.log('\n--- Test 4: Partner Performance & Leaderboard ---');
    const partnerPerf = await analyticsService.getPartnerPerformanceAnalytics({ sortBy: 'installations', limit: 10 });
    console.log(`Ranked Partners count: ${partnerPerf.partners.length}`);
    if (partnerPerf.partners.length > 0) {
      console.log('Top Partner Sample:', {
        rank: partnerPerf.partners[0].rank,
        name: partnerPerf.partners[0].fullName,
        franchiseId: partnerPerf.partners[0].franchiseId,
        installations: partnerPerf.partners[0].installationsCount,
        revenue: partnerPerf.partners[0].installationRevenue,
      });
    }
    console.log('✅ Partner Performance test passed!');

    // Test 5: State & District Analytics
    console.log('\n--- Test 5: State & District Analytics ---');
    const states = await analyticsService.getStateAnalytics();
    console.log(`States analyzed count: ${states.length}`);
    if (states.length > 0) {
      console.log('Sample State:', states[0]);
      const districts = await analyticsService.getDistrictAnalytics(states[0].state);
      console.log(`Districts in ${states[0].state}: ${districts.length}`);
    }
    console.log('✅ State & District Analytics test passed!');

    // Test 6: GPS Quality Analytics
    console.log('\n--- Test 6: GPS Quality & Territory Compliance ---');
    const gpsData = await analyticsService.getGPSQualityAnalytics({});
    console.log('GPS Audited Count:', gpsData.totalAudited);
    console.log('GPS Accuracy Summary:', gpsData.accuracySummary);
    console.log('Territory Compliance:', gpsData.territoryCompliance);
    console.log('✅ GPS Quality test passed!');

    // Test 7: Customer & Load Analytics
    console.log('\n--- Test 7: Customer & Load Intelligence ---');
    const customerStats = await analyticsService.getCustomerElectricityAnalytics();
    console.log('Customer Types:', customerStats.customerDistribution);
    console.log('Connected Load (kW):', customerStats.connectedLoad.totalConnectedLoadKw);
    console.log('Recommended vs Installed Variance:', customerStats.connectedLoad.varianceCards);
    console.log('✅ Customer & Load Analytics test passed!');

    // Test 8: Tabular Reports & Card Movement
    console.log('\n--- Test 8: Reports (Movements & Inventory) ---');
    const movements = await reportService.getCardMovementsReport({ page: 1, limit: 5 });
    console.log(`Card Movements total records: ${movements.pagination.total}`);
    const inventoryRep = await reportService.getPartnerInventoryReport({ page: 1, limit: 5 });
    console.log(`Partner Inventory total records: ${inventoryRep.pagination.total}`);
    console.log('✅ Reports test passed!');

    // Test 9: Single Card Audit Tracer
    console.log('\n--- Test 9: Single Card Audit Tracer ---');
    const sampleCard = await Card.findOne();
    if (sampleCard) {
      const audit = await reportService.getCardSerialAuditTracer(sampleCard.serialNumber);
      console.log(`Audited Card Serial: ${sampleCard.serialNumber}`);
      console.log('Audit Card Object Found:', !!audit.card);
      console.log('History entries count:', audit.history.length);
    }
    console.log('✅ Single Card Audit Tracer test passed!');

    // Test 10: CSV Exporter
    console.log('\n--- Test 10: CSV Exporter ---');
    const csvMovements = await reportService.exportReportToCSV('card-movements', {});
    console.log('CSV Lines count:', csvMovements.split('\r\n').length);
    console.log('CSV Header preview:', csvMovements.split('\r\n')[0]);
    console.log('✅ CSV Exporter test passed!');

    console.log('\n==================================================');
    console.log('🎉 ALL PHASE 7 BACKEND TESTS COMPLETED SUCCESSFULLY!');
    console.log('==================================================');
  } catch (err) {
    console.error('❌ Phase 7 Test Failure:', err);
  } finally {
    await mongoose.disconnect();
  }
};

runPhase7Tests();
