import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';

dotenv.config();

const clearAllCards = async () => {
  await connectDB();

  try {
    const deletedCards = await Card.deleteMany({});
    const deletedHistories = await CardHistory.deleteMany({});

    console.log('======================================================');
    console.log('🧹 CARD INVENTORY CLEARED SUCCESSFULLY 🧹');
    console.log('======================================================');
    console.log(`🗑️ Deleted Cards:         ${deletedCards.deletedCount}`);
    console.log(`🗑️ Deleted Audit Records: ${deletedHistories.deletedCount}`);
    console.log(`📊 Total Cards in DB now: 0`);
    console.log('======================================================');
  } catch (err) {
    console.error('Failed to clear cards:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

clearAllCards();
