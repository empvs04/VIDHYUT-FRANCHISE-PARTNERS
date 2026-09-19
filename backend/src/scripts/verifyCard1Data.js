import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('--- MongoDB Data Verification for Card 1 ---');

  const abhishekId = new mongoose.Types.ObjectId('6aa3b752b15fc22929d462f3');
  
  const partner = await mongoose.connection.db.collection('franchisepartners').findOne({ _id: abhishekId });
  console.log('Abhishek Deshmukh Partner:', {
    fullName: partner?.fullName,
    franchiseId: partner?.franchiseId,
    installedCount: partner?.installedCount,
    assignedCount: partner?.assignedCount,
    subFranchisesCount: partner?.subFranchisesCount,
  });

  const subs = await mongoose.connection.db.collection('franchisepartners').find({ parentPartnerId: abhishekId }).toArray();
  console.log('Sub-Franchise Partners:', subs.map(s => ({
    _id: s._id,
    fullName: s.fullName,
    firmName: s.firmName,
    franchiseId: s.franchiseId,
    assignedCount: s.assignedCount,
    installedCount: s.installedCount,
    inHand: (s.assignedCount || 0) - (s.installedCount || 0)
  })));

  const txs = await mongoose.connection.db.collection('transactions').find({
    $or: [{ sellerPartnerId: abhishekId }, { buyerPartnerId: { $in: subs.map(s => s._id) } }]
  }).toArray();

  console.log('Transactions Count:', txs.length);
  console.log('Transactions Detail:', txs.map(t => ({
    transactionId: t.transactionId,
    buyerPartnerName: t.buyerPartnerName,
    quantity: t.quantity,
    pricePerCard: t.pricePerCard,
    totalAmount: t.totalAmount,
    paymentStatus: t.paymentStatus,
    status: t.status,
    cardSerialNumbers: `${t.cardSerialNumbers?.[0]} to ${t.cardSerialNumbers?.[t.cardSerialNumbers?.length - 1]} (${t.cardSerialNumbers?.length} Cards)`
  })));

  const totalCardsSold = txs.reduce((sum, t) => sum + (t.quantity || 0), 0);
  const totalRevenue = txs.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
  console.log('Total Cards Sold:', totalCardsSold);
  console.log('Total Sales Revenue:', `₹${totalRevenue.toLocaleString('en-IN')}`);
  console.log('Average Rate:', `₹${totalRevenue / totalCardsSold} / Card`);

  await mongoose.disconnect();
}

verify().catch(console.error);
