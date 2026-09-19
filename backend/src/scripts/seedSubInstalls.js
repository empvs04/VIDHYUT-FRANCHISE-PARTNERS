import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function seedSubInstalls() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const sameerId = new mongoose.Types.ObjectId('6aa3e50cd97b8609b3a0243b');
  const vikramId = new mongoose.Types.ObjectId('6aa7b120c94a821950d8101a');
  const abhishekId = new mongoose.Types.ObjectId('6aa3b752b15fc22929d462f3');

  // 1. Create Customer 4 (for Sameer Patil)
  const cust4Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c201');
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust4Id },
    {
      $set: {
        _id: cust4Id,
        customerId: 'CUST-20260914-004',
        fullName: 'Kalyan Organic Cold Storage & Agrotech',
        mobileNumber: '9819876543',
        customerType: 'COMMERCIAL',
        installationAddress: {
          houseOrShopNumber: 'Gala 5, Agro Industrial Park',
          street: 'Kalyan-Shil Road',
          locality: 'Dombivli East',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '421204',
          fullAddress: 'Gala 5, Agro Industrial Park, Kalyan-Shil Road, Mumbai Suburban, Maharashtra - 421204'
        },
        address: {
          houseOrShopNumber: 'Gala 5, Agro Industrial Park',
          street: 'Kalyan-Shil Road',
          locality: 'Dombivli East',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '421204',
          fullAddress: 'Gala 5, Agro Industrial Park, Kalyan-Shil Road, Mumbai Suburban, Maharashtra - 421204'
        },
        createdAt: new Date('2026-09-14T10:30:00Z'),
        updatedAt: new Date('2026-09-14T10:30:00Z')
      }
    },
    { upsert: true }
  );

  // 2. Create Customer 5 (for Sameer Patil)
  const cust5Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c202');
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust5Id },
    {
      $set: {
        _id: cust5Id,
        customerId: 'CUST-20260915-005',
        fullName: 'Sanjay Auto Engineering & Works',
        mobileNumber: '9820543210',
        customerType: 'COMMERCIAL',
        installationAddress: {
          houseOrShopNumber: 'Shop 8, MIDC Sector 3',
          street: 'Mahape Road',
          locality: 'Navi Mumbai',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400710',
          fullAddress: 'Shop 8, MIDC Sector 3, Mahape Road, Mumbai Suburban, Maharashtra - 400710'
        },
        address: {
          houseOrShopNumber: 'Shop 8, MIDC Sector 3',
          street: 'Mahape Road',
          locality: 'Navi Mumbai',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400710',
          fullAddress: 'Shop 8, MIDC Sector 3, Mahape Road, Mumbai Suburban, Maharashtra - 400710'
        },
        createdAt: new Date('2026-09-15T11:15:00Z'),
        updatedAt: new Date('2026-09-15T11:15:00Z')
      }
    },
    { upsert: true }
  );

  // 3. Create Customer 6 (for Vikram Shinde)
  const cust6Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c203');
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust6Id },
    {
      $set: {
        _id: cust6Id,
        customerId: 'CUST-20260916-006',
        fullName: 'Milind Traders & Grain Packaging',
        mobileNumber: '9833214567',
        customerType: 'COMMERCIAL',
        installationAddress: {
          houseOrShopNumber: 'Unit 14, APMC Market',
          street: 'Turbhe Road',
          locality: 'Vashi',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400703',
          fullAddress: 'Unit 14, APMC Market, Turbhe Road, Mumbai Suburban, Maharashtra - 400703'
        },
        address: {
          houseOrShopNumber: 'Unit 14, APMC Market',
          street: 'Turbhe Road',
          locality: 'Vashi',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400703',
          fullAddress: 'Unit 14, APMC Market, Turbhe Road, Mumbai Suburban, Maharashtra - 400703'
        },
        createdAt: new Date('2026-09-16T14:45:00Z'),
        updatedAt: new Date('2026-09-16T14:45:00Z')
      }
    },
    { upsert: true }
  );

  // 4. Create Installation 4 (Sameer Patil)
  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260914-201' },
    {
      $set: {
        installationId: 'INS-20260914-201',
        partnerId: sameerId,
        customerId: cust4Id,
        customerName: 'Kalyan Organic Cold Storage & Agrotech',
        customerMobile: '9819876543',
        customerType: 'COMMERCIAL',
        installedCardCount: 4,
        cardSerialNumbers: ['VS000041', 'VS000042', 'VS000043', 'VS000044'],
        connectedLoadKw: 8.5,
        electricityBoard: 'MSEDCL',
        pricePerCard: 2400,
        totalAmount: 9600,
        verificationStatus: 'CONFIRMED',
        customerConfirmationStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        installationDateTime: new Date('2026-09-14T10:30:00Z'),
        createdAt: new Date('2026-09-14T10:30:00Z'),
        updatedAt: new Date('2026-09-14T10:30:00Z')
      }
    },
    { upsert: true }
  );

  // 5. Create Installation 5 (Sameer Patil)
  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260915-202' },
    {
      $set: {
        installationId: 'INS-20260915-202',
        partnerId: sameerId,
        customerId: cust5Id,
        customerName: 'Sanjay Auto Engineering & Works',
        customerMobile: '9820543210',
        customerType: 'COMMERCIAL',
        installedCardCount: 4,
        cardSerialNumbers: ['VS000045', 'VS000046', 'VS000047', 'VS000048'],
        connectedLoadKw: 7.0,
        electricityBoard: 'MSEDCL',
        pricePerCard: 2400,
        totalAmount: 9600,
        verificationStatus: 'CONFIRMED',
        customerConfirmationStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        installationDateTime: new Date('2026-09-15T11:15:00Z'),
        createdAt: new Date('2026-09-15T11:15:00Z'),
        updatedAt: new Date('2026-09-15T11:15:00Z')
      }
    },
    { upsert: true }
  );

  // 6. Create Installation 6 (Vikram Shinde)
  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260916-203' },
    {
      $set: {
        installationId: 'INS-20260916-203',
        partnerId: vikramId,
        customerId: cust6Id,
        customerName: 'Milind Traders & Grain Packaging',
        customerMobile: '9833214567',
        customerType: 'COMMERCIAL',
        installedCardCount: 4,
        cardSerialNumbers: ['VS000065', 'VS000066', 'VS000067', 'VS000068'],
        connectedLoadKw: 6.5,
        electricityBoard: 'MSEDCL',
        pricePerCard: 2400,
        totalAmount: 9600,
        verificationStatus: 'CONFIRMED',
        customerConfirmationStatus: 'CONFIRMED',
        status: 'CONFIRMED',
        installationDateTime: new Date('2026-09-16T14:45:00Z'),
        createdAt: new Date('2026-09-16T14:45:00Z'),
        updatedAt: new Date('2026-09-16T14:45:00Z')
      }
    },
    { upsert: true }
  );

  // 7. Update stats on franchisepartners and users
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: sameerId },
    { $set: { 'stats.installedCards': 8, 'stats.assignedCards': 24, installedCount: 8, assignedCount: 24 } }
  );
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: vikramId },
    { $set: { 'stats.installedCards': 4, 'stats.assignedCards': 16, installedCount: 4, assignedCount: 16 } }
  );
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: abhishekId },
    { $set: { 'stats.installedCards': 12, 'stats.subFranchisesCount': 2, 'stats.assignedCards': 300, installedCount: 12, subFranchisesCount: 2, assignedCount: 300 } }
  );

  console.log('Successfully seeded 3 sub-franchise installations in MongoDB and updated partner stats!');
  await mongoose.disconnect();
}

seedSubInstalls().catch(console.error);
