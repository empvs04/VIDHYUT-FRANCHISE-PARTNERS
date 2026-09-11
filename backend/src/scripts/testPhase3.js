import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import User from '../models/User.model.js';
import FranchisePartner from '../models/FranchisePartner.model.js';
import Card from '../models/Card.model.js';
import CardHistory from '../models/CardHistory.model.js';
import {
  previewCardBatch,
  createBatchCards,
  createManualCards,
  getCards,
  getCardById,
  getCardHistory,
  updateCardStatus,
  getCardStats,
} from '../services/card.service.js';
import { CARD_STATUS, CARD_OWNER_TYPES, CARD_ACTIONS, USER_ROLES } from '../config/constants.js';

dotenv.config();

const runPhase3TestSuite = async () => {
  console.log('======================================================');
  console.log('🧪 RUNNING PHASE 3 CARD INVENTORY BACKEND TEST SUITE');
  console.log('======================================================');

  await connectDB();

  try {
    // 0. Ensure Admin User exists
    let adminUser = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (!adminUser) {
      adminUser = await User.create({
        fullName: 'Super Admin Test',
        email: 'superadmin.test@vidhyutsaathi.com',
        mobileNumber: '9999999999',
        role: USER_ROLES.SUPER_ADMIN,
        status: 'ACTIVE',
      });
    }

    // Clean up any previous test cards with TEST prefix
    await Card.deleteMany({ serialNumber: /^TEST/ });
    await CardHistory.deleteMany({ serialNumber: /^TEST/ });

    // TEST 1: Preview Batch before creation
    console.log('\n[TEST 1] Preview Card Batch (TEST000001 - TEST000020)...');
    const preview = await previewCardBatch({
      prefix: 'TEST',
      startNumber: 1,
      endNumber: 20,
      paddingLength: 6,
      count: 20,
    });
    if (preview.totalCount === 20 && preview.firstSerial === 'TEST000001' && preview.lastSerial === 'TEST000020' && preview.isValid) {
      console.log(`✅ [PASS] Batch preview valid: Total ${preview.totalCount} cards (${preview.firstSerial} to ${preview.lastSerial})`);
    } else {
      throw new Error(`Batch preview failed: ${JSON.stringify(preview)}`);
    }

    // TEST 2: Create Batch of 20 Cards
    console.log('\n[TEST 2] Super Admin creates Batch stock of 20 cards...');
    const batchResult = await createBatchCards(
      {
        prefix: 'TEST',
        startNumber: 1,
        endNumber: 20,
        paddingLength: 6,
        count: 20,
        notes: 'Initial warehouse batch test',
      },
      adminUser
    );

    if (batchResult.totalCreated === 20 && batchResult.firstSerial === 'TEST000001') {
      console.log(`✅ [PASS] Created 20 cards in ${batchResult.batchId}: ${batchResult.firstSerial} to ${batchResult.lastSerial}`);
    } else {
      throw new Error('Batch creation count mismatch');
    }

    // Verify initial audit trail was created
    const createdHistories = await CardHistory.countDocuments({ serialNumber: /^TEST0000/ });
    if (createdHistories >= 20) {
      console.log(`✅ [PASS] Created ${createdHistories} immutable audit history entries with action CREATED.`);
    } else {
      throw new Error(`Expected at least 20 history entries, got ${createdHistories}`);
    }

    // TEST 3: Duplicate Range Collision Prevention
    console.log('\n[TEST 3] Duplicate Range Collision Prevention (TEST000015 to TEST000030)...');
    try {
      await createBatchCards(
        {
          prefix: 'TEST',
          startNumber: 15,
          endNumber: 30,
          paddingLength: 6,
          count: 16,
          notes: 'Collision test',
        },
        adminUser
      );
      throw new Error('Duplicate batch creation was NOT prevented!');
    } catch (err) {
      if (err.statusCode === 409) {
        console.log(`✅ [PASS] Duplicate serial numbers caught & rejected: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // TEST 4: Manual Stock Creation
    console.log('\n[TEST 4] Manual List Creation (TEST000050, TEST000051, TEST000055)...');
    const manualResult = await createManualCards(
      ['TEST000050', 'TEST000051', 'TEST000055'],
      'Manual spare stock test',
      adminUser
    );
    if (manualResult.totalCreated === 3) {
      console.log(`✅ [PASS] Manually created 3 individual cards in ${manualResult.batchId}`);
    } else {
      throw new Error('Manual stock creation failed');
    }

    // TEST 5: Search Cards by Serial Number
    console.log('\n[TEST 5] Search by Serial Number (TEST000008)...');
    const searchRes = await getCards({ search: 'TEST000008' }, adminUser, null);
    if (searchRes.cards.length === 1 && searchRes.cards[0].serialNumber === 'TEST000008') {
      console.log(`✅ [PASS] Found card: ${searchRes.cards[0].serialNumber}, Status: ${searchRes.cards[0].status}, Owner: ${searchRes.cards[0].currentOwnerType}`);
    } else {
      throw new Error(`Search failed: expected 1 card, got ${searchRes.cards.length}`);
    }

    // TEST 6: Real-time Stats Aggregation
    console.log('\n[TEST 6] Aggregated Real-Time Card Statistics...');
    const stats = await getCardStats(adminUser, null);
    if (stats.total >= 23 && stats.available >= 23) {
      console.log(`✅ [PASS] Stats calculated: Total=${stats.total}, Available=${stats.available}, Blocked=${stats.blocked}`);
    } else {
      throw new Error(`Invalid stats: ${JSON.stringify(stats)}`);
    }

    // TEST 7: Block Card with Mandatory Reason
    console.log('\n[TEST 7] Super Admin Blocks Card (TEST000005)...');
    const cardToBlock = await Card.findOne({ serialNumber: 'TEST000005' });
    const blockedCard = await updateCardStatus(
      cardToBlock._id,
      CARD_STATUS.BLOCKED,
      'Damaged outer seal detected in QC inspect',
      adminUser
    );
    if (blockedCard.status === CARD_STATUS.BLOCKED && blockedCard.blockedReason.includes('Damaged outer seal')) {
      console.log(`✅ [PASS] Card blocked: ${blockedCard.serialNumber}, Reason: ${blockedCard.blockedReason}`);
    } else {
      throw new Error('Card blocking failed');
    }

    // TEST 8: Card History & Audit Trail Verification
    console.log('\n[TEST 8] Retrieve Card History Audit Trail for TEST000005...');
    const historyData = await getCardHistory(cardToBlock._id, adminUser, null);
    if (historyData.history.length === 2 && historyData.history[0].action === CARD_ACTIONS.BLOCKED && historyData.history[1].action === CARD_ACTIONS.CREATED) {
      console.log(`✅ [PASS] History Trail Verified (${historyData.history.length} events):`);
      historyData.history.forEach((h, idx) => {
        console.log(`   ${idx + 1}. [${h.action}] NewStatus: ${h.newStatus} | Reason: ${h.reason} | PerformedBy: ${h.performedBy?.fullName}`);
      });
    } else {
      throw new Error(`History trail invalid: ${JSON.stringify(historyData.history)}`);
    }

    // TEST 9: Super Admin Unblocks Card
    console.log('\n[TEST 9] Super Admin Unblocks Card (TEST000005)...');
    const unblockedCard = await updateCardStatus(
      cardToBlock._id,
      CARD_STATUS.AVAILABLE,
      'QC Re-inspection passed after replacement seal',
      adminUser
    );
    if (unblockedCard.status === CARD_STATUS.AVAILABLE && !unblockedCard.blockedReason) {
      console.log(`✅ [PASS] Card successfully unblocked to AVAILABLE.`);
    } else {
      throw new Error('Card unblocking failed');
    }

    // TEST 10: State Machine Lifecycle Guard (INSTALLED cannot be reset)
    console.log('\n[TEST 10] Lifecycle Guard: INSTALLED card cannot be transitioned to AVAILABLE...');
    // Simulate installed card
    const cardToInstall = await Card.findOne({ serialNumber: 'TEST000010' });
    cardToInstall.status = CARD_STATUS.INSTALLED;
    await cardToInstall.save();

    try {
      await updateCardStatus(cardToInstall._id, CARD_STATUS.AVAILABLE, 'Attempt illegal reset', adminUser);
      throw new Error('Installed card transition was NOT blocked!');
    } catch (err) {
      if (err.statusCode === 400) {
        console.log(`✅ [PASS] Illegal transition blocked: "${err.message}"`);
      } else {
        throw err;
      }
    }

    // Clean up test cards
    await Card.deleteMany({ serialNumber: /^TEST/ });
    await CardHistory.deleteMany({ serialNumber: /^TEST/ });
    console.log('\n🧹 Test cards cleaned up.');

    console.log('\n======================================================');
    console.log('🎉 ALL 10 PHASE 3 CARD INVENTORY TESTS PASSED 100%');
    console.log('======================================================');
  } catch (err) {
    console.error('❌ Test Suite Failure:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

runPhase3TestSuite();
