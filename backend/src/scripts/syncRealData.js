import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncRealData() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const abhishekId = new mongoose.Types.ObjectId('6aa3b752b15fc22929d462f3');
  const abhishekUserId = new mongoose.Types.ObjectId('6aa3b751b15fc22929d462eb');
  const sameerId = new mongoose.Types.ObjectId('6aa3e50cd97b8609b3a0243b');
  const sameerUserId = new mongoose.Types.ObjectId('6aa3e50cd97b8609b3a02438');
  const vikramId = new mongoose.Types.ObjectId('6aa7b120c94a821950d8101a');
  const vikramUserId = new mongoose.Types.ObjectId('6aa7b120c94a821950d8101b');

  // 1. Ensure Abhishek Deshmukh Franchise Partner
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: abhishekId },
    {
      $set: {
        firmName: 'Deshmukh Green Energy Enterprises',
        businessName: 'Deshmukh Green Energy Enterprises',
        installedCount: 12,
        assignedCount: 300,
        subFranchisesCount: 2,
        stats: {
          installedCards: 12,
          assignedCards: 300,
          subFranchisesCount: 2,
          totalAssignedCards: 300,
          currentInventoryCount: 248,
          cardsDistributed: 40
        }
      }
    }
  );

  // 2. Ensure Sameer Patil's Sub-Franchise Partner
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: sameerId },
    {
      $set: {
        _id: sameerId,
        userId: sameerUserId,
        franchiseId: 'VS-SUB-MA-MUM-3827',
        franchiseType: 'SUB_FRANCHISE',
        fullName: "Sameer Patil's",
        firmName: 'Patil Energy Solutions & Hub',
        businessName: 'Patil Energy Solutions & Hub',
        mobileNumber: '9820556677',
        email: 'sameer.patil@vidhyutsaathi.com',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Borivali West',
        addressLine1: 'Shop 104, SV Road, Borivali West',
        parentPartnerId: abhishekId,
        accountStatus: 'ACTIVE',
        isGovIdVerified: true,
        installedCount: 8,
        assignedCount: 24,
        stats: {
          installedCards: 8,
          assignedCards: 24,
          totalAssignedCards: 24,
          currentInventoryCount: 16
        }
      }
    },
    { upsert: true }
  );

  // 3. Ensure Vikram Shinde Sub-Franchise Partner
  await mongoose.connection.db.collection('franchisepartners').updateOne(
    { _id: vikramId },
    {
      $set: {
        _id: vikramId,
        userId: vikramUserId,
        franchiseId: 'VS-SUB-MA-MUM-4102',
        franchiseType: 'SUB_FRANCHISE',
        fullName: 'Vikram Shinde',
        firmName: 'Shinde Green Electricals & Solar',
        businessName: 'Shinde Green Electricals & Solar',
        mobileNumber: '9820998877',
        email: 'vikram.shinde@vidhyutsaathi.com',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city: 'Kandivali East',
        addressLine1: 'Shop 22, Akurli Road, Kandivali East',
        parentPartnerId: abhishekId,
        accountStatus: 'ACTIVE',
        isGovIdVerified: true,
        installedCount: 4,
        assignedCount: 16,
        stats: {
          installedCards: 4,
          assignedCards: 16,
          totalAssignedCards: 16,
          currentInventoryCount: 12
        }
      }
    },
    { upsert: true }
  );

  // 4. Also ensure User record for Vikram Shinde
  await mongoose.connection.db.collection('users').updateOne(
    { _id: vikramUserId },
    {
      $set: {
        _id: vikramUserId,
        fullName: 'Vikram Shinde',
        mobileNumber: '9820998877',
        email: 'vikram.shinde@vidhyutsaathi.com',
        role: 'SUB_FRANCHISE',
        franchiseType: 'SUB_FRANCHISE',
        franchiseId: 'VS-SUB-MA-MUM-4102',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        parentPartnerId: abhishekId,
        status: 'ACTIVE',
        accountStatus: 'ACTIVE'
      }
    },
    { upsert: true }
  );

  // 5. Update Transaction 1 (Abhishek -> Sameer Patil)
  await mongoose.connection.db.collection('transactions').updateOne(
    { buyerPartnerId: sameerId },
    {
      $set: {
        transactionId: 'TXN-20260912-1249',
        transactionType: 'SALE',
        sellerPartnerId: abhishekId,
        sellerPartnerName: 'Abhishek Deshmukh',
        buyerPartnerId: sameerId,
        buyerPartnerName: "Sameer Patil's",
        quantity: 24,
        pricePerCard: 2400,
        totalAmount: 57600,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        cardSerialNumbers: Array.from({ length: 24 }, (_, i) => `VS${(i + 1).toString().padStart(6, '0')}`),
        createdAt: new Date('2026-09-12T10:00:00Z'),
        updatedAt: new Date('2026-09-12T10:00:00Z')
      }
    }
  );

  // 6. Update Transaction 2 (Abhishek -> Vikram Shinde)
  await mongoose.connection.db.collection('transactions').updateOne(
    { buyerPartnerId: vikramId },
    {
      $set: {
        transactionId: 'TXN-20260914-1402',
        transactionType: 'SALE',
        sellerPartnerId: abhishekId,
        sellerPartnerName: 'Abhishek Deshmukh',
        buyerPartnerId: vikramId,
        buyerPartnerName: 'Vikram Shinde',
        quantity: 16,
        pricePerCard: 2400,
        totalAmount: 38400,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        cardSerialNumbers: Array.from({ length: 16 }, (_, i) => `VS${(i + 37).toString().padStart(6, '0')}`),
        createdAt: new Date('2026-09-14T12:00:00Z'),
        updatedAt: new Date('2026-09-14T12:00:00Z')
      }
    }
  );

  // 7. Update Direct Customers for Abhishek Deshmukh
  const cust1Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c191');
  const cust2Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c192');
  const cust3Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c193');
  const cust4Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c201');
  const cust5Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c202');
  const cust6Id = new mongoose.Types.ObjectId('6aaced65564cba5eac69c203');

  // Customer 1: Ramesh Vilas Patil (Residential)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust1Id },
    {
      $set: {
        _id: cust1Id,
        customerId: 'CUST-20260914-001',
        fullName: 'Ramesh Vilas Patil',
        mobileNumber: '9820123456',
        email: 'ramesh.patil@gmail.com',
        customerType: 'RESIDENTIAL',
        address: {
          houseOrShopNumber: 'B-12, Green Park',
          street: 'Link Road',
          locality: 'Borivali West',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400092',
          fullAddress: 'B-12, Green Park, Link Road, Borivali West, Mumbai Suburban, Maharashtra - 400092'
        },
        electricityDetails: {
          connectedLoadKw: 5.5,
          monthlyElectricityBill: 6200,
          highestElectricityBill12Months: 7800,
          electricityBoard: 'MSEDCL (Mahavitaran)',
          consumerAccountNumber: '001928374612',
          meterNumber: 'MTR-982101',
          phase: 'SINGLE_PHASE'
        },
        createdByPartnerId: abhishekId,
        createdByPartnerType: 'DISTRICT_FRANCHISE',
        parentPartnerId: null,
        status: 'ACTIVE',
        installedCardCount: 2,
        lastInstallationDate: new Date('2026-09-14T11:00:00Z'),
        createdAt: new Date('2026-09-14T10:30:00Z'),
        updatedAt: new Date('2026-09-14T11:00:00Z')
      }
    },
    { upsert: true }
  );

  // Customer 2: Sunita Rajesh Sharma (Commercial)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust2Id },
    {
      $set: {
        _id: cust2Id,
        customerId: 'CUST-20260915-002',
        fullName: 'Sunita Rajesh Sharma',
        mobileNumber: '9820234567',
        email: 'sunita.sharma@sharmaenterprises.com',
        customerType: 'COMMERCIAL',
        address: {
          houseOrShopNumber: 'Shop 4, Sunrise Plaza',
          street: 'SV Road',
          locality: 'Kandivali West',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400067',
          fullAddress: 'Shop 4, Sunrise Plaza, SV Road, Kandivali West, Mumbai Suburban, Maharashtra - 400067'
        },
        electricityDetails: {
          connectedLoadKw: 12.0,
          monthlyElectricityBill: 16500,
          highestElectricityBill12Months: 19800,
          electricityBoard: 'Adani Electricity Mumbai Ltd',
          consumerAccountNumber: '152839401928',
          meterNumber: 'MTR-882910',
          phase: 'THREE_PHASE'
        },
        createdByPartnerId: abhishekId,
        createdByPartnerType: 'DISTRICT_FRANCHISE',
        parentPartnerId: null,
        status: 'ACTIVE',
        installedCardCount: 4,
        lastInstallationDate: new Date('2026-09-15T14:00:00Z'),
        createdAt: new Date('2026-09-15T13:30:00Z'),
        updatedAt: new Date('2026-09-15T14:00:00Z')
      }
    },
    { upsert: true }
  );

  // Customer 3: Ganesh Solar Dairy Farm & Agro (Industrial)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust3Id },
    {
      $set: {
        _id: cust3Id,
        customerId: 'CUST-20260916-003',
        fullName: 'Ganesh Solar Dairy Farm & Agro',
        mobileNumber: '9820345678',
        email: 'info@ganeshagroindustries.com',
        customerType: 'INDUSTRIAL',
        address: {
          houseOrShopNumber: 'Plot 102, MIDC Industrial Area',
          street: 'Western Express Highway',
          locality: 'Malad East',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400097',
          fullAddress: 'Plot 102, MIDC Industrial Area, Malad East, Mumbai Suburban, Maharashtra - 400097'
        },
        electricityDetails: {
          connectedLoadKw: 25.0,
          monthlyElectricityBill: 34500,
          highestElectricityBill12Months: 41200,
          electricityBoard: 'Tata Power Mumbai',
          consumerAccountNumber: '900293847510',
          meterNumber: 'MTR-772619',
          phase: 'THREE_PHASE'
        },
        createdByPartnerId: abhishekId,
        createdByPartnerType: 'DISTRICT_FRANCHISE',
        parentPartnerId: null,
        status: 'ACTIVE',
        installedCardCount: 6,
        lastInstallationDate: new Date('2026-09-16T16:00:00Z'),
        createdAt: new Date('2026-09-16T15:00:00Z'),
        updatedAt: new Date('2026-09-16T16:00:00Z')
      }
    },
    { upsert: true }
  );

  // Customer 4: Kalyan Organic Cold Storage (Sameer Sub-Franchise)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust4Id },
    {
      $set: {
        _id: cust4Id,
        customerId: 'CUST-20260914-004',
        fullName: 'Kalyan Organic Cold Storage & Agrotech',
        mobileNumber: '9820551122',
        email: 'kalyan.organic@gmail.com',
        customerType: 'INDUSTRIAL',
        address: {
          houseOrShopNumber: 'Gala 18, Agri Logistics Park',
          street: 'Kalyan Bypass Road',
          locality: 'Borivali East',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400066',
          fullAddress: 'Gala 18, Agri Logistics Park, Borivali East, Mumbai Suburban, Maharashtra - 400066'
        },
        electricityDetails: {
          connectedLoadKw: 18.0,
          monthlyElectricityBill: 22000,
          highestElectricityBill12Months: 26500,
          electricityBoard: 'MSEDCL (Mahavitaran)',
          consumerAccountNumber: '001928481920',
          meterNumber: 'MTR-339910',
          phase: 'THREE_PHASE'
        },
        createdByPartnerId: sameerId,
        createdByPartnerType: 'SUB_FRANCHISE',
        parentPartnerId: abhishekId,
        status: 'ACTIVE',
        installedCardCount: 4,
        lastInstallationDate: new Date('2026-09-14T16:30:00Z'),
        createdAt: new Date('2026-09-14T15:00:00Z'),
        updatedAt: new Date('2026-09-14T16:30:00Z')
      }
    },
    { upsert: true }
  );

  // Customer 5: Sanjay Auto Engineering & Works (Sameer Sub-Franchise)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust5Id },
    {
      $set: {
        _id: cust5Id,
        customerId: 'CUST-20260915-005',
        fullName: 'Sanjay Auto Engineering & Works',
        mobileNumber: '9820553344',
        email: 'sanjay.auto.engg@gmail.com',
        customerType: 'COMMERCIAL',
        address: {
          houseOrShopNumber: 'Workshop 5, Industrial Estate',
          street: 'MG Road',
          locality: 'Goregaon West',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400062',
          fullAddress: 'Workshop 5, Industrial Estate, MG Road, Goregaon West, Mumbai Suburban, Maharashtra - 400062'
        },
        electricityDetails: {
          connectedLoadKw: 15.0,
          monthlyElectricityBill: 19800,
          highestElectricityBill12Months: 24000,
          electricityBoard: 'Adani Electricity Mumbai Ltd',
          consumerAccountNumber: '152839409988',
          meterNumber: 'MTR-554411',
          phase: 'THREE_PHASE'
        },
        createdByPartnerId: sameerId,
        createdByPartnerType: 'SUB_FRANCHISE',
        parentPartnerId: abhishekId,
        status: 'ACTIVE',
        installedCardCount: 4,
        lastInstallationDate: new Date('2026-09-15T15:30:00Z'),
        createdAt: new Date('2026-09-15T14:00:00Z'),
        updatedAt: new Date('2026-09-15T15:30:00Z')
      }
    },
    { upsert: true }
  );

  // Customer 6: Milind Traders & Grain Packaging (Vikram Sub-Franchise)
  await mongoose.connection.db.collection('customers').updateOne(
    { _id: cust6Id },
    {
      $set: {
        _id: cust6Id,
        customerId: 'CUST-20260916-006',
        fullName: 'Milind Traders & Grain Packaging',
        mobileNumber: '9820994433',
        email: 'milind.traders@gmail.com',
        customerType: 'COMMERCIAL',
        address: {
          houseOrShopNumber: 'Shed 12, APMC Market',
          street: 'Akurli Road',
          locality: 'Kandivali East',
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400101',
          fullAddress: 'Shed 12, APMC Market, Akurli Road, Kandivali East, Mumbai Suburban, Maharashtra - 400101'
        },
        electricityDetails: {
          connectedLoadKw: 10.0,
          monthlyElectricityBill: 14200,
          highestElectricityBill12Months: 17500,
          electricityBoard: 'Tata Power Mumbai',
          consumerAccountNumber: '900293848821',
          meterNumber: 'MTR-665522',
          phase: 'THREE_PHASE'
        },
        createdByPartnerId: vikramId,
        createdByPartnerType: 'SUB_FRANCHISE',
        parentPartnerId: abhishekId,
        status: 'ACTIVE',
        installedCardCount: 4,
        lastInstallationDate: new Date('2026-09-16T17:00:00Z'),
        createdAt: new Date('2026-09-16T15:30:00Z'),
        updatedAt: new Date('2026-09-16T17:00:00Z')
      }
    },
    { upsert: true }
  );

  // 8. Update Installations customer details link
  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260914-101' },
    {
      $set: {
        customerName: 'Ramesh Vilas Patil',
        customerMobile: '9820123456',
        partnerId: abhishekId,
        createdByPartnerId: abhishekId,
        customerId: cust1Id,
        installedCardCount: 2,
        cardSerialNumbers: ['VS000025', 'VS000026'],
        cardIds: ['VS000025', 'VS000026'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400092',
          fullAddress: 'B-12, Green Park, Link Road, Borivali West, Mumbai Suburban, Maharashtra - 400092'
        },
        connectedLoadKw: 5.5,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-14T11:00:00Z'),
        createdAt: new Date('2026-09-14T10:30:00Z')
      }
    }
  );

  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260915-102' },
    {
      $set: {
        customerName: 'Sunita Rajesh Sharma',
        customerMobile: '9820234567',
        partnerId: abhishekId,
        createdByPartnerId: abhishekId,
        customerId: cust2Id,
        installedCardCount: 4,
        cardSerialNumbers: ['VS000027', 'VS000028', 'VS000029', 'VS000030'],
        cardIds: ['VS000027', 'VS000028', 'VS000029', 'VS000030'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400067',
          fullAddress: 'Shop 4, Sunrise Plaza, SV Road, Kandivali West, Mumbai Suburban, Maharashtra - 400067'
        },
        connectedLoadKw: 12.0,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-15T14:00:00Z'),
        createdAt: new Date('2026-09-15T13:30:00Z')
      }
    }
  );

  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260916-103' },
    {
      $set: {
        customerName: 'Ganesh Solar Dairy Farm & Agro',
        customerMobile: '9820345678',
        partnerId: abhishekId,
        createdByPartnerId: abhishekId,
        customerId: cust3Id,
        installedCardCount: 6,
        cardSerialNumbers: ['VS000031', 'VS000032', 'VS000033', 'VS000034', 'VS000035', 'VS000036'],
        cardIds: ['VS000031', 'VS000032', 'VS000033', 'VS000034', 'VS000035', 'VS000036'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400097',
          fullAddress: 'Plot 102, MIDC Industrial Area, Malad East, Mumbai Suburban, Maharashtra - 400097'
        },
        connectedLoadKw: 25.0,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-16T16:00:00Z'),
        createdAt: new Date('2026-09-16T15:00:00Z')
      }
    }
  );

  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260914-201' },
    {
      $set: {
        customerName: 'Kalyan Organic Cold Storage & Agrotech',
        customerMobile: '9820551122',
        partnerId: sameerId,
        createdByPartnerId: sameerId,
        customerId: cust4Id,
        installedCardCount: 4,
        cardSerialNumbers: ['VS000001', 'VS000002', 'VS000003', 'VS000004'],
        cardIds: ['VS000001', 'VS000002', 'VS000003', 'VS000004'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400066',
          fullAddress: 'Gala 18, Agri Logistics Park, Borivali East, Mumbai Suburban, Maharashtra - 400066'
        },
        connectedLoadKw: 18.0,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-14T16:30:00Z'),
        createdAt: new Date('2026-09-14T15:00:00Z')
      }
    }
  );

  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260915-202' },
    {
      $set: {
        customerName: 'Sanjay Auto Engineering & Works',
        customerMobile: '9820553344',
        partnerId: sameerId,
        createdByPartnerId: sameerId,
        customerId: cust5Id,
        installedCardCount: 4,
        cardSerialNumbers: ['VS000005', 'VS000006', 'VS000007', 'VS000008'],
        cardIds: ['VS000005', 'VS000006', 'VS000007', 'VS000008'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400062',
          fullAddress: 'Workshop 5, Industrial Estate, MG Road, Goregaon West, Mumbai Suburban, Maharashtra - 400062'
        },
        connectedLoadKw: 15.0,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-15T15:30:00Z'),
        createdAt: new Date('2026-09-15T14:00:00Z')
      }
    }
  );

  await mongoose.connection.db.collection('installations').updateOne(
    { installationId: 'INS-20260916-203' },
    {
      $set: {
        customerName: 'Milind Traders & Grain Packaging',
        customerMobile: '9820994433',
        partnerId: vikramId,
        createdByPartnerId: vikramId,
        customerId: cust6Id,
        installedCardCount: 4,
        cardSerialNumbers: ['VS000037', 'VS000038', 'VS000039', 'VS000040'],
        cardIds: ['VS000037', 'VS000038', 'VS000039', 'VS000040'],
        installationAddress: {
          city: 'Mumbai',
          district: 'Mumbai Suburban',
          state: 'Maharashtra',
          pinCode: '400101',
          fullAddress: 'Shed 12, APMC Market, Akurli Road, Kandivali East, Mumbai Suburban, Maharashtra - 400101'
        },
        connectedLoadKw: 10.0,
        status: 'COMPLETED',
        completedAt: new Date('2026-09-16T17:00:00Z'),
        createdAt: new Date('2026-09-16T15:30:00Z')
      }
    }
  );

  console.log('Successfully synchronized real partners, transactions, customers, and installations in MongoDB!');
  await mongoose.disconnect();
}

syncRealData().catch(console.error);
