import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import { createBatchCards } from '../services/card.service.js';
import { CARD_STATUS, CARD_OWNER_TYPES, CARD_ACTIONS, USER_ROLES } from '../config/constants.js';

dotenv.config();

const seedCards = async () => {
  await connectDB();

  try {
    const adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      throw new Error('Super Admin user not found.');
    }

    const partner = await FranchisePartner.findOne({ email: 'abhishek.partner@vidhyutsaathi.com' });

    const existingCount = await Card.countDocuments({ serialNumber: /^VS000/ });
    if (existingCount > 0) {
      console.log(`======================================================`);
      console.log(`⚡ INITIAL CARD STOCK ALREADY SEEDED (${existingCount} cards) ⚡`);
      console.log(`======================================================`);
      process.exit(0);
    }

    console.log('Generating initial batch of 100 cards (VS000001 - VS000100)...');
    const batchResult = await createBatchCards(
      {
        prefix: 'VS',
        startNumber: 1,
        endNumber: 100,
        paddingLength: 6,
        count: 100,
        notes: 'Initial Vidhyut Saathi Production Warehouse Batch',
      },
      adminUser
    );

    console.log(`✅ Batch created: ${batchResult.totalCreated} cards (${batchResult.firstSerial} to ${batchResult.lastSerial})`);

    if (partner) {
      // Allocate cards VS000001 to VS000020 to Abhishek Deshmukh
      console.log(`Allocating VS000001 - VS000020 to Partner: ${partner.fullName} (${partner.franchiseId})...`);
      const allocatedCards = await Card.find({
        serialNumber: { $in: Array.from({ length: 20 }, (_, i) => `VS${String(i + 1).padStart(6, '0')}`) },
      });

      for (let card of allocatedCards) {
        card.status = CARD_STATUS.ASSIGNED;
        card.currentOwnerType = CARD_OWNER_TYPES.FRANCHISE_PARTNER;
        card.currentOwnerId = partner._id;
        card.assignedBy = adminUser._id;
        card.assignedAt = new Date();
        await card.save();

        await CardHistory.create({
          cardId: card._id,
          serialNumber: card.serialNumber,
          action: CARD_ACTIONS.ASSIGNED,
          fromOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
          fromOwnerId: null,
          toOwnerType: CARD_OWNER_TYPES.FRANCHISE_PARTNER,
          toOwnerId: partner._id,
          previousStatus: CARD_STATUS.AVAILABLE,
          newStatus: CARD_STATUS.ASSIGNED,
          performedBy: adminUser._id,
          performedByRole: adminUser.role,
          reason: 'Initial territory stock allocation for Mumbai Suburban',
          timestamp: new Date(),
        });
      }
      console.log(`✅ 20 cards assigned to ${partner.fullName}`);

      // Block cards VS000096 to VS000100 for QC hold demo
      const blockedCards = await Card.find({
        serialNumber: { $in: ['VS000096', 'VS000097', 'VS000098', 'VS000099', 'VS000100'] },
      });

      for (let card of blockedCards) {
        card.status = CARD_STATUS.BLOCKED;
        card.blockedReason = 'Batch QC sample hold & packaging inspection';
        card.blockedAt = new Date();
        card.blockedBy = adminUser._id;
        await card.save();

        await CardHistory.create({
          cardId: card._id,
          serialNumber: card.serialNumber,
          action: CARD_ACTIONS.BLOCKED,
          fromOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
          fromOwnerId: null,
          toOwnerType: CARD_OWNER_TYPES.HEADQUARTERS,
          toOwnerId: null,
          previousStatus: CARD_STATUS.AVAILABLE,
          newStatus: CARD_STATUS.BLOCKED,
          performedBy: adminUser._id,
          performedByRole: adminUser.role,
          reason: 'Batch QC sample hold & packaging inspection',
          timestamp: new Date(),
        });
      }
      console.log(`✅ 5 cards marked as BLOCKED for QC demo`);
    }

    console.log('======================================================');
    console.log('⚡ CARD INVENTORY SEEDING COMPLETE ⚡');
    console.log('======================================================');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

seedCards();
