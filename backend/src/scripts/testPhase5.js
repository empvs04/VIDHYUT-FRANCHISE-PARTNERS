import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import { calculateRecommendedCards, calculateInstallationTotal } from '../config/businessRules.js';
import {
  sendCustomerConfirmationOTP,
  verifyCustomerConfirmationOTP,
  getCustomers,
  getCustomerById,
} from '../services/customer.service.js';
import {
  getInstallationEligibleCards,
  createInstallation,
  getInstallations,
  getInstallationById,
} from '../services/installation.service.js';
import {
  USER_ROLES,
  FRANCHISE_TYPES,
  ACCOUNT_STATUS,
  CARD_STATUS,
  CARD_ACTIONS,
  CARD_OWNER_TYPES,
  CUSTOMER_TYPES,
} from '../config/constants.js';

dotenv.config();

const runPhase5TestSuite = async () => {
  console.log('======================================================');
  console.log('🧪 RUNNING PHASE 5 CUSTOMER & INSTALLATION TEST SUITE');
  console.log('======================================================');

  await connectDB();

  try {
    // 1. Setup / Lookup Super Admin User
    let adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Super Admin Test',
        email: 'superadmin.phase5@vidhyutsaathi.com',
        mobileNumber: '9888888881',
        role: USER_ROLES.SUPER_ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
      });
    }

    // 2. Setup / Lookup Test Partner (Mumbai District Franchise)
    let partnerUser = await User.findOne({ email: 'partner.mumbai5@vidhyutsaathi.com' });
    if (!partnerUser) {
      partnerUser = await User.create({
        fullName: 'Mumbai Partner Test',
        email: 'partner.mumbai5@vidhyutsaathi.com',
        mobileNumber: '9888888882',
        role: USER_ROLES.DISTRICT_FRANCHISE,
        status: ACCOUNT_STATUS.ACTIVE,
      });
    }

    let partner = await FranchisePartner.findOne({ userId: partnerUser._id });
    if (!partner) {
      partner = await FranchisePartner.create({
        userId: partnerUser._id,
        franchiseId: 'VS-MH-MUM-9005',
        franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
        fullName: 'Mumbai Partner Test',
        mobileNumber: '9888888882',
        email: 'partner.mumbai5@vidhyutsaathi.com',
        state: 'Maharashtra',
        district: 'Mumbai City',
        authorizedDistricts: ['Mumbai City', 'Mumbai Suburban'],
        city: 'Mumbai',
        addressLine1: 'Test Marine Drive',
        pinCode: '400001',
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      });
    }

    // Clean up old test data
    await Card.deleteMany({ serialNumber: /^P5TEST/ });
    await CardHistory.deleteMany({ serialNumber: /^P5TEST/ });
    await Customer.deleteMany({ mobileNumber: /^91111111/ });
    await Installation.deleteMany({ 'installationAddress.street': 'P5 Test Street' });

    console.log(`✅ [SETUP] Admin and Test Partner (${partner.fullName} - ${partner.district}, ${partner.state}) prepared.`);

    // TEST 1: Business Rule - Load to Card Calculation
    console.log('\n[TEST 1] Testing Load to Card Calculation (1 card per 6 kW rule)...');
    const rec1 = calculateRecommendedCards(5); // 1 card
    const rec2 = calculateRecommendedCards(6); // 1 card
    const rec3 = calculateRecommendedCards(6.5); // 2 cards
    const rec4 = calculateRecommendedCards(12); // 2 cards
    const rec5 = calculateRecommendedCards(18); // 3 cards

    if (rec1 === 1 && rec2 === 1 && rec3 === 2 && rec4 === 2 && rec5 === 3) {
      console.log('✅ [PASS] Load calculation verified: 5kW=1, 6kW=1, 6.5kW=2, 12kW=2, 18kW=3 cards.');
    } else {
      throw new Error(`Load calculation mismatch: ${rec1}, ${rec2}, ${rec3}, ${rec4}, ${rec5}`);
    }

    // TEST 2: Customer OTP Generation & Verification
    console.log('\n[TEST 2] Testing Customer OTP Confirmation flow...');
    const testCustMobile = '9111111101';
    const otpRes = await sendCustomerConfirmationOTP(testCustMobile);
    if (!otpRes || !otpRes.devCode) {
      throw new Error('Failed to generate customer confirmation OTP.');
    }
    console.log(`✅ [PASS] Customer OTP generated: ${otpRes.devCode}`);

    const isVerified = await verifyCustomerConfirmationOTP(testCustMobile, otpRes.devCode);
    if (isVerified) {
      console.log('✅ [PASS] Customer OTP verified successfully.');
    } else {
      throw new Error('Customer OTP verification returned false.');
    }

    // TEST 3: Create Sample Cards for Partner
    console.log('\n[TEST 3] Creating Test Cards assigned to Mumbai Partner...');
    const card1 = await Card.create({
      serialNumber: 'P5TEST0001',
      status: CARD_STATUS.ASSIGNED,
      currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
      currentOwnerId: partner._id,
      batchId: 'BATCH-P5',
    });
    const card2 = await Card.create({
      serialNumber: 'P5TEST0002',
      status: CARD_STATUS.ASSIGNED,
      currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
      currentOwnerId: partner._id,
      batchId: 'BATCH-P5',
    });
    const card3 = await Card.create({
      serialNumber: 'P5TEST0003',
      status: CARD_STATUS.ASSIGNED,
      currentOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
      currentOwnerId: partner._id,
      batchId: 'BATCH-P5',
    });
    console.log('✅ [PASS] 3 Test cards created and assigned to partner.');

    // TEST 4: Query Eligible Cards for Partner
    console.log('\n[TEST 4] Testing Eligible Cards Query...');
    const eligible = await getInstallationEligibleCards(partnerUser, partner);
    const hasCards = eligible.some((c) => c.serialNumber === 'P5TEST0001');
    if (hasCards) {
      console.log(`✅ [PASS] Eligible cards found for partner: ${eligible.length} total.`);
    } else {
      throw new Error('Eligible cards query did not return the assigned test cards.');
    }

    // TEST 5: Territory Validation Rejection
    console.log('\n[TEST 5] Testing Territory Validation (Unauthorized District Rejection)...');
    try {
      await createInstallation(
        {
          fullName: 'Unauthorized Territory Customer',
          mobileNumber: '9111111102',
          customerType: CUSTOMER_TYPES.RESIDENTIAL,
          address: {
            city: 'Pune',
            district: 'Pune', // Mismatch! Partner is authorized only for Mumbai
            state: 'Maharashtra',
            pinCode: '411001',
            street: 'P5 Test Street',
          },
          electricityDetails: {
            connectedLoadKw: 6,
            monthlyElectricityBill: 3000,
            phase: 'SINGLE_PHASE',
          },
          cardSerialNumbers: ['P5TEST0001'],
          pricePerCard: 2500,
          mcbPhoto: 'https://cdn.vidhyutsaathi.com/media/mcb.jpg',
          billPhoto: 'https://cdn.vidhyutsaathi.com/media/bill.jpg',
          installedCardPhoto: 'https://cdn.vidhyutsaathi.com/media/card.jpg',
          skipOtpVerification: true,
        },
        partnerUser,
        partner
      );
      throw new Error('Territory violation was not blocked!');
    } catch (err) {
      if (err.message.includes('Territory Violation')) {
        console.log(`✅ [PASS] Territory violation properly blocked: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // TEST 6: Successful Installation & Customer Registration (Atomic)
    console.log('\n[TEST 6] Executing Atomic Installation (2 Cards for 12 kW Residential Customer)...');
    const installResult = await createInstallation(
      {
        fullName: 'Rajesh Sharma',
        mobileNumber: '9111111103',
        customerType: CUSTOMER_TYPES.RESIDENTIAL,
        address: {
          houseOrShopNumber: 'Flat 402',
          street: 'P5 Test Street',
          locality: 'Nariman Point',
          city: 'Mumbai',
          district: 'Mumbai City', // Matches partner territory!
          state: 'Maharashtra',
          pinCode: '400021',
        },
        electricityDetails: {
          connectedLoadKw: 12,
          monthlyElectricityBill: 6500,
          highestElectricityBill12Months: 9200,
          electricityBoard: 'BEST Undertaking',
          consumerAccountNumber: 'CA-987654321',
          meterNumber: 'MTR-888999',
          phase: 'THREE_PHASE',
        },
        cardSerialNumbers: ['P5TEST0001', 'P5TEST0002'],
        pricePerCard: 2500,
        mcbPhoto: 'https://cdn.vidhyutsaathi.com/media/installations/mcb_test.jpg',
        billPhoto: 'https://cdn.vidhyutsaathi.com/media/installations/bill_test.jpg',
        installedCardPhoto: 'https://cdn.vidhyutsaathi.com/media/installations/installed_cards_test.jpg',
        skipOtpVerification: true,
      },
      partnerUser,
      partner
    );

    const { installation, customer } = installResult;
    console.log(`✅ [PASS] Customer created: ${customer.fullName} (ID: ${customer.customerId})`);
    console.log(`✅ [PASS] Installation created: ${installation.installationId} (Total: ₹${installation.totalAmount})`);

    // TEST 7: Verify Card Status and History Updates
    console.log('\n[TEST 7] Verifying Card status updated to INSTALLED...');
    const updatedCard1 = await Card.findOne({ serialNumber: 'P5TEST0001' });
    const updatedCard2 = await Card.findOne({ serialNumber: 'P5TEST0002' });

    if (
      updatedCard1.status === CARD_STATUS.INSTALLED &&
      updatedCard2.status === CARD_STATUS.INSTALLED &&
      String(updatedCard1.customerId) === String(customer._id) &&
      updatedCard1.installationId === installation.installationId
    ) {
      console.log('✅ [PASS] Cards P5TEST0001 & P5TEST0002 updated to INSTALLED with customer & installation links.');
    } else {
      throw new Error('Card status or customer linking failed!');
    }

    const cardHistoryEntries = await CardHistory.find({
      serialNumber: { $in: ['P5TEST0001', 'P5TEST0002'] },
      action: CARD_ACTIONS.INSTALLED,
    });
    if (cardHistoryEntries.length === 2) {
      console.log(`✅ [PASS] Immutable CardHistory audit records created for both cards.`);
    } else {
      throw new Error(`Expected 2 CardHistory records, found ${cardHistoryEntries.length}`);
    }

    // TEST 8: Prevent Reuse of Already Installed Card
    console.log('\n[TEST 8] Testing Installed Card Double-Allocation Protection...');
    try {
      await createInstallation(
        {
          fullName: 'Another Customer',
          mobileNumber: '9111111104',
          customerType: CUSTOMER_TYPES.COMMERCIAL,
          address: {
            city: 'Mumbai',
            district: 'Mumbai City',
            state: 'Maharashtra',
            pinCode: '400001',
            street: 'P5 Test Street',
          },
          electricityDetails: {
            connectedLoadKw: 6,
            monthlyElectricityBill: 4000,
            phase: 'SINGLE_PHASE',
          },
          cardSerialNumbers: ['P5TEST0001'], // Already installed!
          pricePerCard: 2500,
          mcbPhoto: 'https://cdn.vidhyutsaathi.com/media/mcb.jpg',
          billPhoto: 'https://cdn.vidhyutsaathi.com/media/bill.jpg',
          installedCardPhoto: 'https://cdn.vidhyutsaathi.com/media/card.jpg',
          skipOtpVerification: true,
        },
        partnerUser,
        partner
      );
      throw new Error('Installed card reuse was not prevented!');
    } catch (err) {
      if (err.message.includes('already INSTALLED')) {
        console.log(`✅ [PASS] Double-installation prevented: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // TEST 9: Query Customers & Installations via Services
    console.log('\n[TEST 9] Testing Customer and Installation listings & RBAC queries...');
    const custRes = await getCustomers({ search: 'Rajesh' }, partnerUser, partner);
    if (custRes.customers.length >= 1 && custRes.customers[0].customerId === customer.customerId) {
      console.log(`✅ [PASS] Customer search query returned customer: ${custRes.customers[0].fullName}`);
    } else {
      throw new Error('Customer search did not return expected record.');
    }

    const insRes = await getInstallations({ search: installation.installationId }, partnerUser, partner);
    if (insRes.installations.length >= 1 && insRes.installations[0].installationId === installation.installationId) {
      console.log(`✅ [PASS] Installation search query returned installation: ${insRes.installations[0].installationId}`);
    } else {
      throw new Error('Installation search did not return expected record.');
    }

    const customerDetail = await getCustomerById(customer._id, partnerUser, partner);
    if (customerDetail.customer && customerDetail.installations.length >= 1) {
      console.log(`✅ [PASS] Customer detail retrieved with ${customerDetail.installations.length} installation record(s).`);
    } else {
      throw new Error('Customer detail fetch failed.');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL PHASE 5 BACKEND TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ [TEST FAILURE]:', err);
    process.exit(1);
  }
};

runPhase5TestSuite();
