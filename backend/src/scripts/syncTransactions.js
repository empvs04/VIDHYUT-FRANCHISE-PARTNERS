import 'dotenv/config';
import mongoose from 'mongoose';

async function syncTransactions() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const Card = mongoose.connection.db.collection('cards');
  const Transaction = mongoose.connection.db.collection('transactions');
  const Partner = mongoose.connection.db.collection('franchisepartners');

  const txns = await Transaction.find({ status: { $ne: 'CANCELLED' } }).toArray();
  console.log('Found', txns.length, 'active transactions');

  for (const txn of txns) {
    const desiredQty = txn.quantity || ((txn.paidQuantity || 0) + (txn.freeQuantity || 0)) || 0;
    const currentCardCount = txn.cardIds ? txn.cardIds.length : 0;

    if (desiredQty > currentCardCount) {
      const shortage = desiredQty - currentCardCount;
      console.log(`Transaction ${txn.transactionId}: Desired=${desiredQty}, Current=${currentCardCount}, Shortage=${shortage}`);

      const buyer = await Partner.findOne({ _id: txn.buyerPartnerId });
      if (!buyer) {
        console.log('Buyer not found for txn', txn.transactionId);
        continue;
      }

      // Check available cards at HQ
      let availableCards = await Card.find({
        currentOwnerType: 'HEADQUARTERS',
        status: 'AVAILABLE'
      }).limit(shortage).toArray();

      if (availableCards.length < shortage) {
        const needed = shortage - availableCards.length;
        // Find highest serial
        const allVSCards = await Card.find({ serialNumber: /^VS\d+/i }, { projection: { serialNumber: 1 } }).toArray();
        let maxNum = 0;
        allVSCards.forEach(c => {
          const numPart = c.serialNumber.replace(/^VS/i, '');
          const p = parseInt(numPart, 10);
          if (!isNaN(p) && p > maxNum) maxNum = p;
        });

        const newDocs = [];
        for (let i = 1; i <= needed; i++) {
          const num = maxNum + i;
          newDocs.push({
            serialNumber: 'VS' + String(num).padStart(6, '0'),
            status: 'AVAILABLE',
            currentOwnerType: 'HEADQUARTERS',
            currentOwnerId: null,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        const insertRes = await Card.insertMany(newDocs);
        const insertedCards = await Card.find({ _id: { $in: Object.values(insertRes.insertedIds) } }).toArray();
        availableCards = availableCards.concat(insertedCards);
      }

      const cardStatus = txn.status === 'CONFIRMED' ? 'TRANSFERRED' : 'PENDING_TRANSFER';
      const cardIdsToAdd = availableCards.map(c => c._id);
      const serialsToAdd = availableCards.map(c => c.serialNumber);

      await Card.updateMany(
        { _id: { $in: cardIdsToAdd } },
        {
          $set: {
            currentOwnerType: 'FRANCHISE_PARTNER',
            currentOwnerId: buyer._id,
            status: cardStatus,
            assignedAt: new Date(),
            notes: `Assigned to ${buyer.fullName} (${buyer.franchiseId}) during sync repair. Txn: ${txn.transactionId}`,
            updatedAt: new Date()
          }
        }
      );

      const finalCardIds = (txn.cardIds || []).concat(cardIdsToAdd);
      const finalSerials = (txn.cardSerialNumbers || []).concat(serialsToAdd);

      await Transaction.updateOne(
        { _id: txn._id },
        {
          $set: {
            cardIds: finalCardIds,
            cardSerialNumbers: finalSerials,
            quantity: finalCardIds.length,
            updatedAt: new Date()
          }
        }
      );

      console.log(`Successfully synced ${txn.transactionId}: added ${shortage} cards. Total now = ${finalCardIds.length}`);
    }
  }

  // Verify Neha specifically
  const neha = await Partner.findOne({ fullName: /Neha/i });
  if (neha) {
    const nehaCards = await Card.countDocuments({ currentOwnerId: neha._id });
    console.log('Neha total cards in DB now:', nehaCards);
  }

  console.log('Sync finished successfully.');
  process.exit(0);
}

syncTransactions().catch(err => {
  console.error('Error syncing:', err);
  process.exit(1);
});
