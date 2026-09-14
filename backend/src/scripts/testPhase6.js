import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import LocationVerification from '../models/LocationVerification.model.js';
import {
  verifyLocation,
  getLocationVerificationById,
  adminReviewLocation,
  getLocationVerificationStats,
  listLocationVerifications,
} from '../services/locationVerification.service.js';
import { createInstallation } from '../services/installation.service.js';
import { sendCustomerConfirmationOTP, verifyCustomerConfirmationOTP } from '../services/customer.service.js';
import {
  USER_ROLES,
  FRANCHISE_TYPES,
  ACCOUNT_STATUS,
  CARD_STATUS,
  LOCATION_VERIFICATION_STATUS,
  GPS_ACCURACY_STATUS,
} from '../config/constants.js';

dotenv.config();

const runPhase6TestSuite = async () => {
  console.log('======================================================');
  console.log('🧪 RUNNING PHASE 6 LIVE GPS & LOCATION VERIFICATION SUITE');
  console.log('======================================================\n');

  await connectDB();

  try {
    // 1. Setup Admin User
    let adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Super Admin GPS Test',
        email: 'superadmin.gps@vidhyutsaathi.com',
        mobileNumber: '9999990001',
        role: USER_ROLES.SUPER_ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
      });
    }

    // 2. Setup Mumbai Partner (District Franchise)
    let partnerUser = await User.findOne({ email: 'partner.mumbai.gps@vidhyutsaathi.com' });
    if (!partnerUser) {
      partnerUser = await User.create({
        fullName: 'Rajesh Mumbai Partner',
        email: 'partner.mumbai.gps@vidhyutsaathi.com',
        mobileNumber: '9999990002',
        role: USER_ROLES.DISTRICT_FRANCHISE,
        status: ACCOUNT_STATUS.ACTIVE,
      });
    }

    let partnerMumbai = await FranchisePartner.findOne({ userId: partnerUser._id });
    if (!partnerMumbai) {
      partnerMumbai = await FranchisePartner.create({
        userId: partnerUser._id,
        franchiseId: 'VS-MH-MUM-6001',
        franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
        fullName: 'Rajesh Mumbai Partner',
        mobileNumber: '9999990002',
        email: 'partner.mumbai.gps@vidhyutsaathi.com',
        state: 'Maharashtra',
        district: 'Mumbai',
        authorizedDistricts: ['Mumbai', 'Mumbai Suburban'],
        city: 'Mumbai',
        addressLine1: 'Andheri East',
        pinCode: '400069',
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      });
    }

    console.log('✅ Test Environment Setup Complete.');
    console.log(`   - Super Admin: ${adminUser.email}`);
    console.log(`   - Mumbai Partner: ${partnerMumbai.fullName} (${partnerMumbai.franchiseId})`);
    console.log(`   - Authorized: ${partnerMumbai.district}, ${partnerMumbai.state}\n`);

    // TEST 1: Valid In-Territory GPS Location Verification (Mumbai Coordinates ~ 19.0760, 72.8777)
    console.log('▶️ TEST 1: In-Territory GPS Capture (Mumbai coordinates, 12m accuracy)');
    const test1Result = await verifyLocation(
      {
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 12,
        gpsCapturedAt: new Date(),
        customerEnteredState: 'Maharashtra',
        customerEnteredDistrict: 'Mumbai',
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Verification ID: ${test1Result.locationVerificationId}`);
    console.log(`   - Detected: ${test1Result.detectedDistrict}, ${test1Result.detectedState}`);
    console.log(`   - Territory Match: ${test1Result.territoryMatch}`);
    console.log(`   - Verification Status: ${test1Result.verificationStatus}`);
    console.log(`   - Accuracy Status: ${test1Result.accuracyStatus}`);

    if (test1Result.verificationStatus !== LOCATION_VERIFICATION_STATUS.VERIFIED) {
      throw new Error(`TEST 1 Failed: Expected status VERIFIED, got ${test1Result.verificationStatus}`);
    }
    console.log('   ✅ TEST 1 PASSED: In-territory GPS successfully verified.\n');

    // TEST 2: District Territory Mismatch (Mumbai Partner submitting Pune coordinates ~ 18.5204, 73.8567)
    console.log('▶️ TEST 2: District Territory Mismatch (Mumbai Partner at Pune coordinates)');
    const test2Result = await verifyLocation(
      {
        latitude: 18.5204,
        longitude: 73.8567,
        accuracy: 15,
        gpsCapturedAt: new Date(),
        customerEnteredState: 'Maharashtra',
        customerEnteredDistrict: 'Pune',
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Verification ID: ${test2Result.locationVerificationId}`);
    console.log(`   - Detected: ${test2Result.detectedDistrict}, ${test2Result.detectedState}`);
    console.log(`   - Territory Match: ${test2Result.territoryMatch}`);
    console.log(`   - Verification Status: ${test2Result.verificationStatus}`);
    console.log(`   - Reason: ${test2Result.verificationReason}`);

    if (test2Result.verificationStatus !== LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH) {
      throw new Error(`TEST 2 Failed: Expected TERRITORY_MISMATCH, got ${test2Result.verificationStatus}`);
    }
    console.log('   ✅ TEST 2 PASSED: District mismatch correctly detected and flagged.\n');

    // TEST 3: State Territory Mismatch (Maharashtra Partner submitting Ahmedabad, Gujarat ~ 23.0225, 72.5714)
    console.log('▶️ TEST 3: Out-of-State Territory Mismatch (Gujarat coordinates for MH partner)');
    const test3Result = await verifyLocation(
      {
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: 20,
        gpsCapturedAt: new Date(),
        customerEnteredState: 'Gujarat',
        customerEnteredDistrict: 'Ahmedabad',
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Verification ID: ${test3Result.locationVerificationId}`);
    console.log(`   - Detected: ${test3Result.detectedDistrict}, ${test3Result.detectedState}`);
    console.log(`   - Verification Status: ${test3Result.verificationStatus}`);

    if (test3Result.verificationStatus !== LOCATION_VERIFICATION_STATUS.TERRITORY_MISMATCH) {
      throw new Error(`TEST 3 Failed: Expected TERRITORY_MISMATCH, got ${test3Result.verificationStatus}`);
    }
    console.log('   ✅ TEST 3 PASSED: Out-of-state territory mismatch correctly blocked.\n');

    // TEST 4: Poor GPS Accuracy Test (Accuracy = 150m > 100m threshold)
    console.log('▶️ TEST 4: Poor GPS Accuracy Handling (Accuracy = 150 meters)');
    const test4Result = await verifyLocation(
      {
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 150,
        gpsCapturedAt: new Date(),
        customerEnteredState: 'Maharashtra',
        customerEnteredDistrict: 'Mumbai',
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Accuracy Status: ${test4Result.accuracyStatus}`);
    console.log(`   - Verification Status: ${test4Result.verificationStatus}`);
    console.log(`   - Reason: ${test4Result.verificationReason}`);

    if (test4Result.verificationStatus !== LOCATION_VERIFICATION_STATUS.LOW_ACCURACY) {
      throw new Error(`TEST 4 Failed: Expected LOW_ACCURACY, got ${test4Result.verificationStatus}`);
    }
    console.log('   ✅ TEST 4 PASSED: Low accuracy correctly detected.\n');

    // TEST 5: Customer Address vs GPS Mismatch
    console.log('▶️ TEST 5: Customer Address vs GPS Location Discrepancy');
    const test5Result = await verifyLocation(
      {
        latitude: 19.076,
        longitude: 72.8777, // GPS in Mumbai
        accuracy: 25,
        gpsCapturedAt: new Date(),
        customerEnteredState: 'Maharashtra',
        customerEnteredDistrict: 'Nagpur', // Customer address in Nagpur
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Customer Address Match: ${test5Result.customerAddressMatch}`);
    console.log(`   - Note appended: ${test5Result.verificationReason}`);

    if (test5Result.customerAddressMatch !== false) {
      throw new Error(`TEST 5 Failed: Expected customerAddressMatch = false`);
    }
    console.log('   ✅ TEST 5 PASSED: Address discrepancy flagged in audit notes.\n');

    // TEST 6: Super Admin Override & Auditable Approval
    console.log('▶️ TEST 6: Super Admin Review & Approval Override of Flagged Mismatch');
    const flaggedRecordId = test2Result.locationVerificationId;
    const reviewResult = await adminReviewLocation(
      flaggedRecordId,
      'APPROVE',
      'Verified customer property is located on the boundary of Mumbai/Pune and authorized by Regional Director.',
      adminUser
    );

    console.log(`   - Updated Status: ${reviewResult.verificationStatus}`);
    console.log(`   - Audit Log Length: ${reviewResult.auditHistory.length}`);
    console.log(`   - Latest Audit Entry: ${reviewResult.auditHistory[0].reviewReason}`);

    if (reviewResult.verificationStatus !== LOCATION_VERIFICATION_STATUS.VERIFIED) {
      throw new Error(`TEST 6 Failed: Expected VERIFIED after Admin APPROVE, got ${reviewResult.verificationStatus}`);
    }
    console.log('   ✅ TEST 6 PASSED: Super Admin override succeeded with immutable audit logging.\n');

    // TEST 7: Admin GPS Statistics & Aggregations
    console.log('▶️ TEST 7: GPS Metrics Summary Aggregation');
    const stats = await getLocationVerificationStats(adminUser);
    console.log('   - Stats:', stats);

    if (stats.total < 5) {
      throw new Error(`TEST 7 Failed: Expected total verifications >= 5, got ${stats.total}`);
    }
    console.log('   ✅ TEST 7 PASSED: GPS statistics aggregated from MongoDB Atlas.\n');

    // TEST 8: Full Installation with Linked GPS Location Record & Card Atomic State
    console.log('▶️ TEST 8: Full End-to-End Installation with Verified GPS Evidence');
    const cardSerial = `VSGPS${Math.floor(100000 + Math.random() * 900000)}`;
    const testCard = await Card.create({
      serialNumber: cardSerial,
      status: CARD_STATUS.ASSIGNED,
      currentOwnerType: 'FRANCHISE_PARTNER',
      currentOwnerId: partnerMumbai._id,
      batchId: 'BATCH-2026-GPS',
      assignedAt: new Date(),
    });

    const custMobile = `9820${Math.floor(100000 + Math.random() * 900000)}`;
    const otpRes = await sendCustomerConfirmationOTP(custMobile);
    const validOtp = otpRes.devCode;

    const installationRes = await createInstallation(
      {
        fullName: 'Sunil Verma',
        mobileNumber: custMobile,
        email: `sunil.${cardSerial.toLowerCase()}@example.com`,
        customerType: 'RESIDENTIAL',
        address: {
          houseOrShopNumber: 'B-104',
          street: 'SV Road',
          locality: 'Andheri West',
          city: 'Mumbai',
          district: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400058',
        },
        electricityDetails: {
          connectedLoadKw: 6,
          monthlyElectricityBill: 3200,
          highestElectricityBill12Months: 4500,
          electricityBoard: 'MSEDCL',
          consumerAccountNumber: 'CA-987654321',
          meterNumber: 'MTR-12345',
          phase: 'SINGLE_PHASE',
        },
        cardSerialNumbers: [cardSerial],
        pricePerCard: 2500,
        mcbPhoto: 'https://storage.vidhyutsaathi.com/photos/mcb_gps_test.jpg',
        billPhoto: 'https://storage.vidhyutsaathi.com/photos/bill_gps_test.jpg',
        installedCardPhoto: 'https://storage.vidhyutsaathi.com/photos/card_gps_test.jpg',
        customerOtp: validOtp,
        locationVerificationId: test1Result.locationVerificationId,
        notes: 'Live GPS Verified installation test.',
      },
      partnerUser,
      partnerMumbai
    );

    console.log(`   - Created Installation ID: ${installationRes.installation.installationId}`);
    console.log(`   - Linked Location ID: ${installationRes.installation.locationVerificationId}`);
    console.log(`   - Detected District: ${installationRes.installation.detectedDistrict}`);
    console.log(`   - Territory Match: ${installationRes.installation.territoryMatch}`);

    const updatedCard = await Card.findById(testCard._id);
    console.log(`   - Card Status: ${updatedCard.status}`);

    if (updatedCard.status !== CARD_STATUS.INSTALLED) {
      throw new Error(`TEST 8 Failed: Card status should be INSTALLED, got ${updatedCard.status}`);
    }

    const linkedLocation = await LocationVerification.findById(test1Result._id);
    console.log(`   - Location record installationId: ${linkedLocation.installationId}`);

    if (!linkedLocation.installationId) {
      throw new Error(`TEST 8 Failed: LocationVerification installationId not populated`);
    }

    console.log('   ✅ TEST 8 PASSED: Installation atomically finalized with linked GPS evidence.\n');

    console.log('======================================================');
    console.log('🎉 ALL PHASE 6 TESTS PASSED SUCCESSFULLY (100%)');
    console.log('======================================================');
  } catch (error) {
    console.error('❌ PHASE 6 TEST RUNNER FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

runPhase6TestSuite();
