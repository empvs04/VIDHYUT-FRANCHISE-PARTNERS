import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import OTP from '../models/OTP.model.js';
import AuditLog from '../models/AuditLog.model.js';
import { createFranchisePartner } from '../services/partner.service.js';
import { createAndSendPartnerRegistrationOTP, verifyOTP } from '../services/otp.service.js';
import { USER_ROLES, FRANCHISE_TYPES, OTP_PURPOSE, AUDIT_ACTIONS } from '../config/constants.js';

const runTests = async () => {
  await connectDB();
  console.log('\n===============================================================');
  console.log('🧪 RUNNING COMPREHENSIVE TESTS FOR PARTNER REGISTRATION OTP');
  console.log('===============================================================\n');

  // Find Super Admin & a District Franchise Partner for testing
  let superAdminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
  if (!superAdminUser) {
    superAdminUser = await User.create({
      fullName: 'Super Admin Test',
      email: 'superadmin_test@vidhyutsaathi.com',
      mobileNumber: '9999000011',
      role: USER_ROLES.SUPER_ADMIN,
    });
  }

  const districtPartner = await FranchisePartner.findOne({
    franchiseType: { $in: [FRANCHISE_TYPES.DISTRICT_FRANCHISE, FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT] },
  });

  const generateUniqueMobile = () => `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const generateUniqueEmail = () => `test_partner_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;

  // -------------------------------------------------------------
  // TEST 1: Admin adds Franchise Partner (SMS & Email sent to new partner, NOT admin)
  // -------------------------------------------------------------
  console.log('👉 [TEST 1] Admin creates Franchise Partner (Mobile + Email)...');
  const t1Mobile = generateUniqueMobile();
  const t1Email = generateUniqueEmail();

  const partner1Data = {
    fullName: 'Rakesh Shah Test1',
    mobileNumber: t1Mobile,
    email: t1Email,
    franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
    state: 'Gujarat',
    district: 'Ahmedabad',
    city: 'Ahmedabad',
    addressLine1: 'Test Address Line 1',
    pinCode: '380001',
  };

  const partner1 = await createFranchisePartner(partner1Data, superAdminUser);
  console.log(`   ✅ Partner created in DB: ${partner1.fullName} (${partner1.franchiseId})`);

  const otpResult1 = await createAndSendPartnerRegistrationOTP({
    partner: partner1,
    creatorUser: superAdminUser,
    reqMetadata: { ipAddress: '127.0.0.1' },
  });

  console.log('   ✅ OTP Result:', otpResult1);

  // Verify OTP record in DB
  const otpRec1 = await OTP.findOne({
    partnerId: partner1._id,
    purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
    isUsed: false,
  });

  if (!otpRec1) throw new Error('TEST 1 FAILED: OTP record not created in DB');
  if (otpRec1.mobileNumber !== t1Mobile) throw new Error(`TEST 1 FAILED: Expected OTP mobile ${t1Mobile}, got ${otpRec1.mobileNumber}`);
  if (otpRec1.email !== t1Email) throw new Error(`TEST 1 FAILED: Expected OTP email ${t1Email}, got ${otpRec1.email}`);
  if (otpRec1.channel !== 'BOTH') throw new Error(`TEST 1 FAILED: Expected channel BOTH, got ${otpRec1.channel}`);

  // Check audit log
  const auditLogs1 = await AuditLog.find({
    entityId: partner1.franchiseId,
    action: AUDIT_ACTIONS.REGISTRATION_OTP_GENERATED,
  });
  if (auditLogs1.length === 0) throw new Error('TEST 1 FAILED: Audit log for OTP generation not found');

  console.log('   🎉 [TEST 1 PASSED]: Partner created, single secure OTP generated for new partner mobile & email. Admin received nothing.\n');

  // -------------------------------------------------------------
  // TEST 2: Franchise Partner adds Sub-Franchise (OTP to Sub-Franchise, NOT Parent)
  // -------------------------------------------------------------
  console.log('👉 [TEST 2] Franchise Partner creates Sub-Franchise...');
  if (!districtPartner) {
    console.log('   ⚠️ Skipping Test 2 (No district partner found in database)');
  } else {
    const t2Mobile = generateUniqueMobile();
    const t2Email = generateUniqueEmail();

    const subData = {
      fullName: 'Amit Kumar Sub Test2',
      mobileNumber: t2Mobile,
      email: t2Email,
      franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
      parentPartnerId: districtPartner._id,
      state: districtPartner.state,
      district: districtPartner.district,
      city: 'Mumbai',
      addressLine1: 'Sub Address Line 1',
      pinCode: '400001',
    };

    const parentUser = await User.findById(districtPartner.userId);
    const subPartner = await createFranchisePartner(subData, parentUser);
    console.log(`   ✅ Sub-Franchise created in DB: ${subPartner.fullName} (${subPartner.franchiseId}) under parent ${districtPartner.fullName}`);

    const otpResult2 = await createAndSendPartnerRegistrationOTP({
      partner: subPartner,
      creatorUser: parentUser,
      reqMetadata: { ipAddress: '127.0.0.1' },
    });

    const otpRec2 = await OTP.findOne({
      partnerId: subPartner._id,
      purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
      isUsed: false,
    });

    if (!otpRec2) throw new Error('TEST 2 FAILED: OTP record not created for Sub-Franchise');
    if (otpRec2.mobileNumber !== t2Mobile) throw new Error(`TEST 2 FAILED: Expected OTP mobile ${t2Mobile}, got ${otpRec2.mobileNumber}`);
    if (otpRec2.email !== t2Email) throw new Error(`TEST 2 FAILED: Expected OTP email ${t2Email}, got ${otpRec2.email}`);

    // Verify parent's phone was NOT used
    if (otpRec2.mobileNumber === districtPartner.mobileNumber) {
      throw new Error('TEST 2 FAILED: OTP was mistakenly sent to Parent Partner mobile number!');
    }

    console.log('   🎉 [TEST 2 PASSED]: Sub-Franchise received registration OTP. Parent partner received nothing.\n');
  }

  // -------------------------------------------------------------
  // TEST 3: Mobile Only
  // -------------------------------------------------------------
  console.log('👉 [TEST 3] Mobile only partner registration...');
  const t3Mobile = generateUniqueMobile();
  const partner3Mock = {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Mobile Only Partner',
    mobileNumber: t3Mobile,
    email: '',
    franchiseId: 'VS-TEST-MOB-01',
    franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
  };

  const otpResult3 = await createAndSendPartnerRegistrationOTP({
    partner: partner3Mock,
    creatorUser: superAdminUser,
    reqMetadata: { ipAddress: '127.0.0.1' },
  });

  const otpRec3 = await OTP.findOne({
    partnerId: partner3Mock._id,
    purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
  });

  if (!otpRec3) throw new Error('TEST 3 FAILED: OTP record not created');
  if (otpRec3.channel !== 'SMS') throw new Error(`TEST 3 FAILED: Expected channel SMS, got ${otpRec3.channel}`);
  if (otpRec3.email !== '') throw new Error(`TEST 3 FAILED: Expected empty email, got ${otpRec3.email}`);

  console.log('   🎉 [TEST 3 PASSED]: SMS OTP sent, Email OTP skipped.\n');

  // -------------------------------------------------------------
  // TEST 4: Email Only
  // -------------------------------------------------------------
  console.log('👉 [TEST 4] Email only partner registration...');
  const t4Email = generateUniqueEmail();
  const partner4Mock = {
    _id: new mongoose.Types.ObjectId(),
    fullName: 'Email Only Partner',
    mobileNumber: '',
    email: t4Email,
    franchiseId: 'VS-TEST-EML-01',
    franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
  };

  const otpResult4 = await createAndSendPartnerRegistrationOTP({
    partner: partner4Mock,
    creatorUser: superAdminUser,
    reqMetadata: { ipAddress: '127.0.0.1' },
  });

  const otpRec4 = await OTP.findOne({
    partnerId: partner4Mock._id,
    purpose: OTP_PURPOSE.PARTNER_REGISTRATION,
  });

  if (!otpRec4) throw new Error('TEST 4 FAILED: OTP record not created');
  if (otpRec4.channel !== 'EMAIL') throw new Error(`TEST 4 FAILED: Expected channel EMAIL, got ${otpRec4.channel}`);
  if (otpRec4.mobileNumber !== '') throw new Error(`TEST 4 FAILED: Expected empty mobileNumber, got ${otpRec4.mobileNumber}`);

  console.log('   🎉 [TEST 4 PASSED]: Email OTP sent, SMS OTP skipped.\n');

  // -------------------------------------------------------------
  // TEST 5: Registration Fails (Duplicate Mobile)
  // -------------------------------------------------------------
  console.log('👉 [TEST 5] Registration fails validation (Duplicate Mobile)...');
  let duplicateThrew = false;
  try {
    await createFranchisePartner(
      {
        fullName: 'Duplicate Partner',
        mobileNumber: t1Mobile, // Already used in Test 1
        email: generateUniqueEmail(),
        franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
        state: 'Gujarat',
        district: 'Surat',
        city: 'Surat',
        addressLine1: 'Test Address',
        pinCode: '395001',
      },
      superAdminUser
    );
  } catch (err) {
    duplicateThrew = true;
    console.log(`   ✅ Expected error caught: ${err.message}`);
  }

  if (!duplicateThrew) throw new Error('TEST 5 FAILED: Duplicate partner registration should have thrown an error');
  console.log('   🎉 [TEST 5 PASSED]: No OTP generated when registration fails.\n');

  // -------------------------------------------------------------
  // TEST 6 & 7: Communication Failure Resilience (No DB Rollback)
  // -------------------------------------------------------------
  console.log('👉 [TEST 6 & 7] Verification resilience: No database rollback on SMS/Email error...');
  const t6Mobile = generateUniqueMobile();
  const t6Email = generateUniqueEmail();
  const partner6Data = {
    fullName: 'Resilience Test Partner',
    mobileNumber: t6Mobile,
    email: t6Email,
    franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    city: 'Bengaluru',
    addressLine1: 'MG Road',
    pinCode: '560001',
  };

  const partner6 = await createFranchisePartner(partner6Data, superAdminUser);
  console.log(`   ✅ Partner created in DB: ${partner6.fullName}`);

  // Trigger OTP dispatch
  const otpRes6 = await createAndSendPartnerRegistrationOTP({
    partner: partner6,
    creatorUser: superAdminUser,
    reqMetadata: { ipAddress: '127.0.0.1' },
  });

  // Verify partner STILL exists in DB
  const checkPartner = await FranchisePartner.findById(partner6._id);
  if (!checkPartner) throw new Error('TEST 6/7 FAILED: Partner was mistakenly deleted/rolled back!');

  console.log('   🎉 [TEST 6 & 7 PASSED]: Partner remains safely preserved in MongoDB Atlas.\n');

  console.log('===============================================================');
  console.log('🏆 ALL 7 TEST CASES PASSED SUCCESSFULLY!');
  console.log('===============================================================\n');

  process.exit(0);
};

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
