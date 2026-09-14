import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import Card from '../src/models/Card.model.js';
import CardHistory from '../src/models/CardHistory.model.js';
import Transaction from '../src/models/Transaction.model.js';
import Installation from '../src/models/Installation.model.js';

async function clearAllCards() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is not defined in .env');
      process.exit(1);
    }

    console.log('[Clear Script] Connecting to MongoDB...');
    await mongoose.connect(mongoUri, { dbName: 'vidhyut_saathi' });
    console.log('[Clear Script] Connected successfully.');

    const cardCount = await Card.countDocuments();
    console.log(`[Clear Script] Found ${cardCount} cards in database.`);

    const deletedCards = await Card.deleteMany({});
    console.log(`[Clear Script] Deleted ${deletedCards.deletedCount} cards.`);

    const deletedHistory = await CardHistory.deleteMany({});
    console.log(`[Clear Script] Deleted ${deletedHistory.deletedCount} card history logs.`);

    // Also clear pending card transactions if any exist
    const deletedTransactions = await Transaction.deleteMany({});
    console.log(`[Clear Script] Deleted ${deletedTransactions.deletedCount} card distribution transactions.`);

    // Also clear installation test records if any exist
    const deletedInstallations = await Installation.deleteMany({});
    console.log(`[Clear Script] Deleted ${deletedInstallations.deletedCount} customer installation records.`);

    console.log('[Clear Script] ALL CARD DATA SUCCESSFULLY CLEARED! Stock is now 0. You can add fresh cards from start.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Clear Script] Error clearing card data:', error);
    process.exit(1);
  }
}

clearAllCards();
