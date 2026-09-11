import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import { USER_ROLES, ACCOUNT_STATUS } from '../config/constants.js';

dotenv.config();

const seedSuperAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not defined in environment variables.');
    process.exit(1);
  }

  const adminName = process.env.ADMIN_NAME || 'Super Admin';
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@vidhyutsaathi.com').toLowerCase();
  const adminMobile = process.env.ADMIN_MOBILE || '9876543210';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Vidhyut2026!';

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: 'vidhyut_saathi' });
    console.log('Connected to MongoDB: vidhyut_saathi');

    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { mobileNumber: adminMobile }, { role: USER_ROLES.SUPER_ADMIN }],
    });

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    if (existingAdmin) {
      existingAdmin.fullName = adminName;
      existingAdmin.email = adminEmail;
      existingAdmin.mobileNumber = adminMobile;
      existingAdmin.passwordHash = passwordHash;
      existingAdmin.role = USER_ROLES.SUPER_ADMIN;
      existingAdmin.status = ACCOUNT_STATUS.ACTIVE;
      await existingAdmin.save();

      console.log('\n======================================================');
      console.log('✅ Super Admin account UPDATED successfully:');
      console.log(`   Name:   ${adminName}`);
      console.log(`   Email:  ${adminEmail}`);
      console.log(`   Mobile: ${adminMobile}`);
      console.log(`   Role:   ${USER_ROLES.SUPER_ADMIN}`);
      console.log('======================================================\n');
    } else {
      await User.create({
        fullName: adminName,
        email: adminEmail,
        mobileNumber: adminMobile,
        passwordHash,
        role: USER_ROLES.SUPER_ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
      });

      console.log('\n======================================================');
      console.log('✅ Super Admin account CREATED successfully:');
      console.log(`   Name:   ${adminName}`);
      console.log(`   Email:  ${adminEmail}`);
      console.log(`   Mobile: ${adminMobile}`);
      console.log(`   Role:   ${USER_ROLES.SUPER_ADMIN}`);
      console.log('======================================================\n');
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed Super Admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
