import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import { createFranchisePartner } from '../services/partner.service.js';
import { FRANCHISE_TYPES, USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

dotenv.config();

const seedDemoPartner = async () => {
  await connectDB();

  try {
    const adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      throw new Error('Super Admin not found in database.');
    }

    // Check if partner already exists
    const existingPartner = await FranchisePartner.findOne({
      $or: [{ email: 'abhishek.partner@vidhyutsaathi.com' }, { mobileNumber: '9820112233' }],
    });

    if (existingPartner) {
      console.log('======================================================');
      console.log('⚡ DEMO FRANCHISE PARTNER ALREADY EXISTS ⚡');
      console.log('======================================================');
      console.log(`👤 Name:         ${existingPartner.fullName}`);
      console.log(`🆔 Franchise ID: ${existingPartner.franchiseId}`);
      console.log(`📱 Mobile:       ${existingPartner.mobileNumber}`);
      console.log(`📧 Email:        ${existingPartner.email}`);
      console.log(`📍 Territory:    ${existingPartner.district}, ${existingPartner.state}`);
      console.log(`🔰 Status:       ${existingPartner.accountStatus}`);
      console.log('======================================================');
      process.exit(0);
    }

    const partner = await createFranchisePartner(
      {
        fullName: 'Abhishek Deshmukh',
        mobileNumber: '9820112233',
        email: 'abhishek.partner@vidhyutsaathi.com',
        franchiseType: FRANCHISE_TYPES.DISTRICT_FRANCHISE,
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Andheri West',
        addressLine1: 'Shop 4B, Crystal Plaza, New Link Road',
        pinCode: '400053',
        govIdType: 'PAN',
        govIdNumber: 'ABCPD1234M',
        govIdDocumentUrl: 'https://storage.vidhyutsaathi.com/docs/pan_abhishek.jpg',
        startDate: new Date(),
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      },
      adminUser
    );

    console.log('======================================================');
    console.log('⚡ DEMO FRANCHISE PARTNER CREATED SUCCESSFULLY ⚡');
    console.log('======================================================');
    console.log(`👤 Full Name:    ${partner.fullName}`);
    console.log(`🆔 Franchise ID: ${partner.franchiseId}`);
    console.log(`📱 Mobile:       ${partner.mobileNumber}`);
    console.log(`📧 Email:        ${partner.email}`);
    console.log(`📍 Territory:    ${partner.district}, ${partner.state}`);
    console.log(`🔰 Level:        ${partner.franchiseType}`);
    console.log(`✅ Status:       ${partner.accountStatus}`);
    console.log('======================================================');
  } catch (err) {
    console.error('Failed to create demo partner:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedDemoPartner();
