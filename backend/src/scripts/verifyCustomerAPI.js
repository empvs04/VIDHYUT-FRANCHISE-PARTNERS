import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getCustomers } from '../services/customer.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const abhishekPartner = await mongoose.connection.db.collection('franchisepartners').findOne({ franchiseId: 'VS-MA-MUM-3382' });
  const abhishekUser = await mongoose.connection.db.collection('users').findOne({ _id: abhishekPartner.userId });

  console.log('Testing getCustomers with source: MY_CUSTOMERS');
  const myCustResult = await getCustomers(
    { page: 1, limit: 15, source: 'MY_CUSTOMERS' },
    abhishekUser,
    abhishekPartner
  );

  console.log('My Customers Count:', myCustResult.customers.length);
  console.log('My Customers List:', myCustResult.customers.map(c => ({
    customerId: c.customerId,
    fullName: c.fullName,
    customerType: c.customerType,
    mobileNumber: c.mobileNumber,
    installedCardCount: c.installedCardCount,
    createdBy: c.createdByPartnerId?.fullName
  })));

  console.log('\nTesting getCustomers with source: ALL (Direct + Sub)');
  const allCustResult = await getCustomers(
    { page: 1, limit: 15, source: 'ALL' },
    abhishekUser,
    abhishekPartner
  );

  console.log('All Customers Count:', allCustResult.customers.length);
  console.log('All Customers List:', allCustResult.customers.map(c => ({
    customerId: c.customerId,
    fullName: c.fullName,
    customerType: c.customerType,
    mobileNumber: c.mobileNumber,
    installedCardCount: c.installedCardCount,
    createdBy: c.createdByPartnerId?.fullName
  })));

  await mongoose.disconnect();
}

verify().catch(console.error);
