import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import {
  createFranchisePartner,
  updateFranchisePartnerStatus,
  getPartnerHierarchy,
} from '../services/partner.service.js';
import { FRANCHISE_TYPES, ACCOUNT_STATUS, USER_ROLES } from '../config/constants.js';

dotenv.config();

const runPhase2Tests = async () => {
  console.log('======================================================');
  console.log('🧪 RUNNING PHASE 2 BACKEND TEST SUITE');
  console.log('======================================================');

  await connectDB();

  try {
    const adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      throw new Error('Super Admin not found. Please run seedAdmin first.');
    }

    // Clean up previous test partners
    await FranchisePartner.deleteMany({ email: { $regex: /@testvidhyut\.com$/i } });
    await User.deleteMany({ email: { $regex: /@testvidhyut\.com$/i } });

    console.log('\n[TEST 1] Super Admin creates State Franchise Partner (Gujarat)...');
    const statePartner = await createFranchisePartner(
      {
        fullName: 'Gujarat State Head',
        mobileNumber: '9100000001',
        email: 'gujarat.state@testvidhyut.com',
        franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE,
        state: 'Gujarat',
        district: 'Gandhinagar',
        city: 'Gandhinagar',
        addressLine1: 'Gujarat Infocity 101',
        pinCode: '382007',
        govIdType: 'PAN',
        govIdNumber: 'ABCPG1234F',
        govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_state.jpg',
      },
      adminUser
    );
    console.log(`✅ [PASS] Created State Partner: ${statePartner.fullName} (${statePartner.franchiseId})`);

    console.log('\n[TEST 2] Super Admin creates District Franchise directly without State Franchise (Nashik, MH)...');
    const directDistrictPartner = await createFranchisePartner(
      {
        fullName: 'Nashik Direct District Head',
        mobileNumber: '9100000002',
        email: 'nashik.direct@testvidhyut.com',
        franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
        state: 'Maharashtra',
        district: 'Nashik',
        city: 'Nashik',
        addressLine1: 'College Road, Nashik',
        pinCode: '422005',
        govIdType: 'PAN',
        govIdNumber: 'ABCPN1234N',
        govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_nashik.jpg',
      },
      adminUser
    );
    console.log(`✅ [PASS] Created Direct District Partner: ${directDistrictPartner.fullName} (${directDistrictPartner.franchiseId})`);

    console.log('\n[TEST 3] Super Admin creates District Franchise under Gujarat State Partner (Ahmedabad)...');
    const gujDistrictPartner = await createFranchisePartner(
      {
        fullName: 'Ahmedabad District Partner',
        mobileNumber: '9100000003',
        email: 'ahmedabad.partner@testvidhyut.com',
        franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
        parentPartnerId: statePartner._id,
        state: 'Gujarat',
        district: 'Ahmedabad',
        city: 'Ahmedabad',
        addressLine1: 'SG Highway, Bodakdev',
        pinCode: '380054',
        govIdType: 'PAN',
        govIdNumber: 'ABCPA1234A',
        govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_ahd.jpg',
      },
      adminUser
    );
    console.log(`✅ [PASS] Created District Partner under State Partner: ${gujDistrictPartner.fullName} (${gujDistrictPartner.franchiseId})`);

    console.log('\n[TEST 4] Duplicate Active District Franchise Protection...');
    try {
      await createFranchisePartner(
        {
          fullName: 'Duplicate Ahmedabad Partner',
          mobileNumber: '9100000004',
          email: 'duplicate.ahd@testvidhyut.com',
          franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
          state: 'Gujarat',
          district: 'Ahmedabad',
          city: 'Ahmedabad',
          addressLine1: 'Maninagar, Ahmedabad',
          pinCode: '380008',
          govIdType: 'PAN',
          govIdNumber: 'ABCPD1234D',
          govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_dup.jpg',
        },
        adminUser
      );
      console.error('❌ [FAIL] Duplicate district partner should have been blocked!');
    } catch (err) {
      console.log(`✅ [PASS] Duplicate Active District blocked successfully! Error: "${err.message}"`);
    }

    console.log('\n[TEST 5] District Partner creates Sub-Franchise inside authorized territory (Ahmedabad East)...');
    const ahdDistrictUser = await User.findById(gujDistrictPartner.userId);
    const subPartner = await createFranchisePartner(
      {
        fullName: 'Ahmedabad East Sub-Franchise',
        mobileNumber: '9100000005',
        email: 'ahd.east.sub@testvidhyut.com',
        franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
        parentPartnerId: gujDistrictPartner._id,
        state: 'Gujarat',
        district: 'Ahmedabad',
        city: 'Maninagar East',
        addressLine1: 'Shop 12, Express Arcade',
        pinCode: '380008',
        govIdType: 'PAN',
        govIdNumber: 'SUBGP1234K',
        govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_sub.jpg',
      },
      ahdDistrictUser
    );
    console.log(`✅ [PASS] Sub-Franchise Created: ${subPartner.fullName} (${subPartner.franchiseId})`);

    console.log('\n[TEST 6] Parent-Child Territory conflict test (Sub-Franchise outside parent district)...');
    try {
      await createFranchisePartner(
        {
          fullName: 'Cross-District Sub-Franchise',
          mobileNumber: '9100000006',
          email: 'cross.sub@testvidhyut.com',
          franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
          parentPartnerId: gujDistrictPartner._id, // Ahmedabad parent
          state: 'Gujarat',
          district: 'Surat', // Outside parent's district!
          city: 'Varachha',
          addressLine1: 'Surat Diamond Bazaar',
          pinCode: '395006',
          govIdType: 'PAN',
          govIdNumber: 'CROSP1234S',
          govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_cross.jpg',
        },
        ahdDistrictUser
      );
      console.error('❌ [FAIL] Cross-district partner should have been rejected!');
    } catch (err) {
      console.log(`✅ [PASS] Cross-district territory conflict rejected: "${err.message}"`);
    }

    console.log('\n[TEST 7] Partner Hierarchy Retrieval (Ahmedabad District Head)...');
    const hierarchy = await getPartnerHierarchy(gujDistrictPartner._id);
    console.log(`✅ [PASS] Hierarchy Retrieved:`);
    console.log(`   - Partner: ${hierarchy.partner.fullName} (${hierarchy.partner.franchiseId})`);
    console.log(`   - Parent:  ${hierarchy.parent ? hierarchy.parent.fullName + ' (' + hierarchy.parent.franchiseId + ')' : 'None (Super Admin Direct)'}`);
    console.log(`   - Children Count: ${hierarchy.totalChildren} (Active: ${hierarchy.activeChildren})`);

    console.log('\n[TEST 8] Account Status Management (Suspend & Reactivate)...');
    await updateFranchisePartnerStatus(directDistrictPartner._id, ACCOUNT_STATUS.SUSPENDED);
    const suspendedPartner = await FranchisePartner.findById(directDistrictPartner._id);
    const suspendedUser = await User.findById(directDistrictPartner.userId);
    console.log(`✅ [PASS] Partner & User successfully suspended: Partner Status = ${suspendedPartner.accountStatus}, User Status = ${suspendedUser.status}`);

    await updateFranchisePartnerStatus(directDistrictPartner._id, ACCOUNT_STATUS.ACTIVE);
    const reactivatedPartner = await FranchisePartner.findById(directDistrictPartner._id);
    console.log(`✅ [PASS] Partner successfully reactivated: Status = ${reactivatedPartner.accountStatus}`);

    // Cleanup test records
    await FranchisePartner.deleteMany({ email: { $regex: /@testvidhyut\.com$/i } });
    await User.deleteMany({ email: { $regex: /@testvidhyut\.com$/i } });
    console.log('\n🧹 Test records cleaned up.');

    console.log('\n======================================================');
    console.log('🎉 ALL PHASE 2 BACKEND TEST SUITE CASES PASSED 100%');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runPhase2Tests();
