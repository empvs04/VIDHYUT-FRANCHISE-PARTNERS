import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const customers = await mongoose.connection.db.collection('customers').find({}).toArray();
  console.log(`Total Customers in DB: ${customers.length}`);
  console.log(customers.map(c => ({
    _id: c._id,
    customerId: c.customerId,
    fullName: c.fullName,
    customerType: c.customerType,
    createdByPartnerId: c.createdByPartnerId,
    parentPartnerId: c.parentPartnerId,
    installedCardCount: c.installedCardCount
  })));

  const installations = await mongoose.connection.db.collection('installations').find({}).toArray();
  console.log(`Total Installations in DB: ${installations.length}`);
  console.log(installations.map(inst => ({
    _id: inst._id,
    installationId: inst.installationId,
    customerName: inst.customerName,
    partnerId: inst.partnerId,
    createdByPartnerId: inst.createdByPartnerId,
    customerId: inst.customerId,
    installedCardCount: inst.installedCardCount
  })));

  await mongoose.disconnect();
}

check().catch(console.error);
