import FranchisePartner from '../models/FranchisePartner.model.js';
import User from '../models/User.model.js';
import Customer from '../models/Customer.model.js';
import Installation from '../models/Installation.model.js';
import Card from '../models/Card.model.js';
import Transaction from '../models/Transaction.model.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  ACCOUNT_STATUS,
  FRANCHISE_TYPES,
  USER_ROLES,
  CARD_STATUS,
  CONFIRMATION_STATUS,
  TRANSACTION_STATUS,
} from '../config/constants.js';

// Admin Dashboard Real-time Metrics (Aggregated from live MongoDB database)
export const getAdminMetrics = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalPartners,
      activePartners,
      inactivePartners,
      suspendedPartners,
      expiredPartners,
      pendingPartners,
      stateFranchises,
      districtFranchises,
      premiumExclusiveDistrictPartners,
      activePremiumExclusiveDistrictPartners,
      standardExclusiveDistrictPartners,
      activeStandardExclusiveDistrictPartners,
      nonExclusiveDistrictPartners,
      activeNonExclusiveDistrictPartners,
      subFranchises,
      activeSubFranchises,
      nonActiveSubFranchises,
      subFranchiseDistrictsAgg,
      subFranchiseCustomersCount,
      subFranchiseInstallationsCount,
      recentPartners,
      districtAllocations,
      totalCustomers,
      totalInstallations,
      installedCardsCount,
      monthlyRevenueAgg,
      totalRevenueAgg,
      todayPartners,
      todayPartnersCount,
      todayRevenueAgg,
      todayTransactions,
      recentSubFranchises,
      subFranchiseRevenueAgg,
      subFranchiseAllotments,
    ] = await Promise.all([
      FranchisePartner.countDocuments(),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.ACTIVE }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.INACTIVE }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.SUSPENDED }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.EXPIRED }),
      FranchisePartner.countDocuments({ accountStatus: ACCOUNT_STATUS.PENDING_APPROVAL }),
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.STATE_FRANCHISE }),
      FranchisePartner.countDocuments({
        franchiseType: {
          $in: [
            FRANCHISE_TYPES.DISTRICT_FRANCHISE,
            FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
            FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
            FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
          ],
        },
      }),
      // 1. Premium Exclusive District Franchise
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT }),
      FranchisePartner.countDocuments({
        franchiseType: FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      // 2. Standard Exclusive District Franchise
      FranchisePartner.countDocuments({
        franchiseType: {
          $in: [FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT, FRANCHISE_TYPES.DISTRICT_FRANCHISE],
        },
      }),
      FranchisePartner.countDocuments({
        franchiseType: {
          $in: [FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT, FRANCHISE_TYPES.DISTRICT_FRANCHISE],
        },
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      // 3. Non-Exclusive District Franchise
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT }),
      FranchisePartner.countDocuments({
        franchiseType: FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      // Sub-Franchises
      FranchisePartner.countDocuments({ franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE }),
      FranchisePartner.countDocuments({
        franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      FranchisePartner.countDocuments({
        franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
        accountStatus: { $ne: ACCOUNT_STATUS.ACTIVE },
      }),
      FranchisePartner.aggregate([
        {
          $match: {
            franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE,
          },
        },
        { $group: { _id: { state: '$state', district: '$district' }, count: { $sum: 1 } } },
      ]),
      Customer.countDocuments({ createdByPartnerType: 'SUB_FRANCHISE' }),
      Installation.countDocuments({ createdByPartnerType: 'SUB_FRANCHISE' }),
      FranchisePartner.find({ franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('parentPartnerId', 'fullName franchiseId')
        .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt parentPartnerId'),
      // Aggregate distinct active districts
      FranchisePartner.aggregate([
        {
          $match: {
            accountStatus: ACCOUNT_STATUS.ACTIVE,
            franchiseType: {
              $in: [
                FRANCHISE_TYPES.DISTRICT_FRANCHISE,
                FRANCHISE_TYPES.NON_EXCLUSIVE_DISTRICT,
                FRANCHISE_TYPES.STANDARD_EXCLUSIVE_DISTRICT,
                FRANCHISE_TYPES.PREMIUM_EXCLUSIVE_DISTRICT,
              ],
            },
          },
        },
        { $group: { _id: { state: '$state', district: '$district' }, count: { $sum: 1 } } },
      ]),
      Customer.countDocuments(),
      Installation.countDocuments(),
      Card.countDocuments({ status: CARD_STATUS.INSTALLED }),
      // 4. Total Monthly Card Revenue (Last 30 Days Card Transactions to Franchise Partners - excluding sub-franchises)
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $ne: TRANSACTION_STATUS.CANCELLED },
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'buyerPartnerId',
            foreignField: '_id',
            as: 'buyer',
          },
        },
        { $unwind: '$buyer' },
        {
          $match: {
            'buyer.franchiseType': { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
          },
        },
        {
          $group: {
            _id: null,
            monthlyRevenue: { $sum: '$totalAmount' },
            monthlyCardsTransferred: { $sum: '$quantity' },
            paidCardsCount: { $sum: '$paidQuantity' },
            freeCardsCount: { $sum: '$freeQuantity' },
            transactionCount: { $sum: 1 },
          },
        },
      ]),
      // Total All-time Card Revenue (excluding sub-franchises)
      Transaction.aggregate([
        {
          $match: {
            status: { $ne: TRANSACTION_STATUS.CANCELLED },
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'buyerPartnerId',
            foreignField: '_id',
            as: 'buyer',
          },
        },
        { $unwind: '$buyer' },
        {
          $match: {
            'buyer.franchiseType': { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalCardsTransferred: { $sum: '$quantity' },
          },
        },
      ]),
      // Today's Registered Franchise Partners (excluding sub-franchises)
      FranchisePartner.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
      })
        .sort({ createdAt: -1 })
        .populate('parentPartnerId', 'fullName franchiseId')
        .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt parentPartnerId'),
      FranchisePartner.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
      }),
      // Today's Total Revenue & Transactions (excluding sub-franchises)
      Transaction.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday, $lte: endOfToday },
            status: { $ne: TRANSACTION_STATUS.CANCELLED },
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'buyerPartnerId',
            foreignField: '_id',
            as: 'buyer',
          },
        },
        { $unwind: '$buyer' },
        {
          $match: {
            'buyer.franchiseType': { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
          },
        },
        {
          $group: {
            _id: null,
            todayRevenue: { $sum: '$totalAmount' },
            todayCardsTransferred: { $sum: '$quantity' },
            paidCardsCount: { $sum: '$paidQuantity' },
            freeCardsCount: { $sum: '$freeQuantity' },
            transactionCount: { $sum: 1 },
          },
        },
      ]),
      Transaction.find({ createdAt: { $gte: startOfToday, $lte: endOfToday }, status: { $ne: TRANSACTION_STATUS.CANCELLED } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('buyerPartnerId', 'fullName franchiseId franchiseType district state')
        .populate('sellerPartnerId', 'fullName franchiseId'),
      // 5. Recent Sub-Franchises added by Franchise Partners
      FranchisePartner.find({ franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE })
        .sort({ createdAt: -1 })
        .limit(12)
        .populate('parentPartnerId', 'fullName franchiseId franchiseType state district mobileNumber email')
        .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt parentPartnerId'),
      // 6. Sub-Franchise Card Allotment Total Revenue
      Transaction.aggregate([
        {
          $match: {
            status: { $ne: TRANSACTION_STATUS.CANCELLED },
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'buyerPartnerId',
            foreignField: '_id',
            as: 'buyer',
          },
        },
        { $unwind: '$buyer' },
        {
          $match: {
            'buyer.franchiseType': FRANCHISE_TYPES.SUB_FRANCHISE,
          },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalCards: { $sum: '$quantity' },
            paidCards: { $sum: '$paidQuantity' },
            freeCards: { $sum: '$freeQuantity' },
            totalAllotments: { $sum: 1 },
          },
        },
      ]),
      // 7. Sub-Franchise Card Allotments breakdown list (Seller -> Sub-Franchise)
      Transaction.aggregate([
        {
          $match: {
            status: { $ne: TRANSACTION_STATUS.CANCELLED },
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'buyerPartnerId',
            foreignField: '_id',
            as: 'buyerPartnerId',
          },
        },
        { $unwind: '$buyerPartnerId' },
        {
          $match: {
            'buyerPartnerId.franchiseType': FRANCHISE_TYPES.SUB_FRANCHISE,
          },
        },
        {
          $lookup: {
            from: 'franchisepartners',
            localField: 'sellerPartnerId',
            foreignField: '_id',
            as: 'sellerPartnerId',
          },
        },
        {
          $unwind: {
            path: '$sellerPartnerId',
            preserveNullAndEmptyArrays: true,
          },
        },
        { $sort: { createdAt: -1 } },
        { $limit: 25 },
      ]),
    ]);

    const monthlyRevenue = monthlyRevenueAgg[0]?.monthlyRevenue || 0;
    const monthlyCardsTransferred = monthlyRevenueAgg[0]?.monthlyCardsTransferred || 0;
    const totalRevenue = totalRevenueAgg[0]?.totalRevenue || 0;
    const totalCardsTransferred = totalRevenueAgg[0]?.totalCardsTransferred || 0;
    const todayRevenue = todayRevenueAgg[0]?.todayRevenue || 0;
    const todayCardsTransferred = todayRevenueAgg[0]?.todayCardsTransferred || 0;
    const todayPaidCards = todayRevenueAgg[0]?.paidCardsCount || 0;
    const todayFreeCards = todayRevenueAgg[0]?.freeCardsCount || 0;
    const todayTransactionCount = todayRevenueAgg[0]?.transactionCount || 0;
    const districtWiseSubFranchisesCount = subFranchiseDistrictsAgg?.length || 0;

    const subFranchiseTotalRevenue = subFranchiseRevenueAgg[0]?.totalRevenue || 0;
    const subFranchiseTotalCardsAllotted = subFranchiseRevenueAgg[0]?.totalCards || 0;
    const subFranchisePaidCardsAllotted = subFranchiseRevenueAgg[0]?.paidCards || 0;
    const subFranchiseFreeCardsAllotted = subFranchiseRevenueAgg[0]?.freeCards || 0;
    const subFranchiseTotalAllotmentsCount = subFranchiseRevenueAgg[0]?.totalAllotments || 0;

    // Sub-Franchise installed cards sum
    const subCardsInstalledAgg = await Installation.aggregate([
      { $match: { createdByPartnerType: 'SUB_FRANCHISE' } },
      { $group: { _id: null, totalCards: { $sum: '$installedCardCount' } } },
    ]);
    const subFranchiseCardsInstalledCount = subCardsInstalledAgg[0]?.totalCards || 0;

    // Aggregate state-wise partner distribution
    const stateDistribution = await FranchisePartner.aggregate([
      {
        $group: {
          _id: '$state',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$accountStatus', ACCOUNT_STATUS.ACTIVE] }, 1, 0] } },
          districts: { $addToSet: '$district' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]);

    // Sub-Franchise Individual & Total Profit Calculation
    const allSubPartners = await FranchisePartner.find({ franchiseType: FRANCHISE_TYPES.SUB_FRANCHISE })
      .populate('parentPartnerId', 'fullName franchiseId mobileNumber state district email')
      .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt parentPartnerId');

    const subPartnerIds = allSubPartners.map(s => s._id);

    // Get all transactions for sub-franchises
    const subTransactions = await Transaction.find({
      buyerPartnerId: { $in: subPartnerIds },
      status: { $ne: TRANSACTION_STATUS.CANCELLED },
    }).populate('sellerPartnerId', 'fullName franchiseId mobileNumber district state');

    // Get all installations created by sub-franchises
    const subInstallations = await Installation.find({
      $or: [
        { partnerId: { $in: subPartnerIds } },
        { createdByPartnerId: { $in: subPartnerIds } },
      ],
    });

    const subFranchiseProfits = allSubPartners.map((sub) => {
      const myTxns = subTransactions.filter(t => t.buyerPartnerId && t.buyerPartnerId.toString() === sub._id.toString());
      const totalPurchasedCards = myTxns.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const totalPaidCards = myTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
      const totalPurchaseCost = myTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const avgBuyPrice = totalPaidCards > 0 ? Math.round(totalPurchaseCost / totalPaidCards) : (myTxns[0]?.pricePerCard || 2000);

      const myInstalls = subInstallations.filter(i => 
        (i.partnerId && i.partnerId.toString() === sub._id.toString()) ||
        (i.createdByPartnerId && i.createdByPartnerId.toString() === sub._id.toString())
      );
      const totalInstalledCards = myInstalls.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
      const totalInstallationRevenue = myInstalls.reduce((sum, i) => sum + (i.totalAmount || ((i.installedCardCount || 1) * (i.pricePerCard || 3500))), 0);
      const avgSellPrice = totalInstalledCards > 0 ? Math.round(totalInstallationRevenue / totalInstalledCards) : 3500;

      const hasInstallations = totalInstalledCards > 0;
      const effectiveCardsSold = totalInstalledCards; // Revenue & Profit only update upon actual card installations!
      
      // Calculate profit from each actual customer installation
      let netProfit = 0;
      if (hasInstallations) {
        netProfit = myInstalls.reduce((sum, inst) => {
          const instCount = inst.installedCardCount || 1;
          const instSellPrice = inst.pricePerCard || (inst.totalAmount ? Math.round(inst.totalAmount / instCount) : 3500);
          const profitPerCardForThisInstall = Math.max(0, instSellPrice - avgBuyPrice);
          return sum + (profitPerCardForThisInstall * instCount);
        }, 0);
      }

      const profitPerCard = hasInstallations ? Math.max(0, avgSellPrice - avgBuyPrice) : 0;
      const totalRevenueGenerated = netProfit; // Revenue margin earned: (Sell Price - Buy Price) * Installed Cards
      const totalGrossSales = hasInstallations ? totalInstallationRevenue : 0;
      const marginPercent = (hasInstallations && avgBuyPrice > 0) ? Math.round(((avgSellPrice - avgBuyPrice) / avgBuyPrice) * 100) : 0;

      const resolvedParent = sub.parentPartnerId ? {
        fullName: sub.parentPartnerId.fullName,
        franchiseId: sub.parentPartnerId.franchiseId,
        mobileNumber: sub.parentPartnerId.mobileNumber,
        district: sub.parentPartnerId.district,
        state: sub.parentPartnerId.state,
      } : (myTxns[0]?.sellerPartnerId ? {
        fullName: myTxns[0].sellerPartnerId.fullName,
        franchiseId: myTxns[0].sellerPartnerId.franchiseId,
        mobileNumber: myTxns[0].sellerPartnerId.mobileNumber,
        district: myTxns[0].sellerPartnerId.district,
        state: myTxns[0].sellerPartnerId.state,
      } : null);

      return {
        subFranchiseId: sub._id,
        franchiseId: sub.franchiseId,
        fullName: sub.fullName,
        mobileNumber: sub.mobileNumber,
        email: sub.email,
        district: sub.district || sub.city || 'District',
        state: sub.state,
        accountStatus: sub.accountStatus,
        createdAt: sub.createdAt,
        parentPartner: resolvedParent,
        totalPurchasedCards,
        totalPurchaseCost,
        avgBuyPrice,
        totalInstalledCards,
        effectiveCardsSold,
        avgSellPrice,
        totalRevenueGenerated,
        totalGrossSales,
        profitPerCard,
        netProfit,
        marginPercent,
        hasInstallations,
        allotmentsCount: myTxns.length,
        installationsCount: myInstalls.length,
      };
    });

    const totalSubFranchiseProfit = subFranchiseProfits.reduce((sum, item) => sum + item.netProfit, 0);
    const totalSubFranchiseRevenue = subFranchiseProfits.reduce((sum, item) => sum + item.totalRevenueGenerated, 0);

    // =========================================================================
    // COMPANY PROFIT ENGINE (Card Base Cost: Rs 1,000 / card)
    // =========================================================================
    const COMPANY_BASE_CARD_COST = 1000;

    const companyTransactions = await Transaction.find({
      sellerPartnerId: null,
      status: { $ne: TRANSACTION_STATUS.CANCELLED },
    })
      .populate('buyerPartnerId', 'fullName franchiseId franchiseType state district mobileNumber email')
      .sort({ createdAt: -1 });

    const companyProfitByPartnerMap = {};
    let companyTotalRevenue = 0;
    let companyTotalCardsSold = 0;
    let companyTotalBaseCost = 0;
    let companyTotalNetProfit = 0;

    companyTransactions.forEach((txn) => {
      const buyer = txn.buyerPartnerId;
      if (!buyer) return;

      const buyerId = buyer._id.toString();
      const paidQty = txn.paidQuantity > 0 ? txn.paidQuantity : (txn.quantity || 0);
      const totalQty = txn.quantity || 0;
      const amount = txn.totalAmount || (paidQty * (txn.pricePerCard || 0));
      const cardCost = paidQty * COMPANY_BASE_CARD_COST;
      const profit = amount - cardCost;
      const pricePerCard = txn.pricePerCard || (paidQty > 0 ? Math.round(amount / paidQty) : 0);

      companyTotalRevenue += amount;
      companyTotalCardsSold += paidQty;
      companyTotalBaseCost += cardCost;
      companyTotalNetProfit += profit;

      if (!companyProfitByPartnerMap[buyerId]) {
        companyProfitByPartnerMap[buyerId] = {
          partnerId: buyer._id,
          franchiseId: buyer.franchiseId,
          fullName: buyer.fullName,
          franchiseType: buyer.franchiseType,
          district: buyer.district || '',
          state: buyer.state || '',
          mobileNumber: buyer.mobileNumber || '',
          email: buyer.email || '',
          totalCardsSold: 0,
          totalAllotmentCards: 0,
          totalRevenue: 0,
          companyTotalCost: 0,
          companyNetProfit: 0,
          transactionCount: 0,
          transactions: [],
        };
      }

      companyProfitByPartnerMap[buyerId].totalCardsSold += paidQty;
      companyProfitByPartnerMap[buyerId].totalAllotmentCards += totalQty;
      companyProfitByPartnerMap[buyerId].totalRevenue += amount;
      companyProfitByPartnerMap[buyerId].companyTotalCost += cardCost;
      companyProfitByPartnerMap[buyerId].companyNetProfit += profit;
      companyProfitByPartnerMap[buyerId].transactionCount += 1;
      companyProfitByPartnerMap[buyerId].transactions.push({
        transactionId: txn.transactionId,
        date: txn.createdAt,
        quantity: txn.quantity,
        paidQuantity: paidQty,
        freeQuantity: txn.freeQuantity || 0,
        pricePerCard: pricePerCard,
        totalAmount: amount,
        companyCost: cardCost,
        netProfit: profit,
        status: txn.status,
      });
    });

    const companyPartnerProfits = Object.values(companyProfitByPartnerMap).map((item) => {
      const avgSellingPrice = item.totalCardsSold > 0 ? Math.round(item.totalRevenue / item.totalCardsSold) : 0;
      const profitPerCard = avgSellingPrice - COMPANY_BASE_CARD_COST;
      const marginPercent = item.companyTotalCost > 0 ? Math.round((item.companyNetProfit / item.companyTotalCost) * 100) : 0;

      return {
        ...item,
        baseCostPerCard: COMPANY_BASE_CARD_COST,
        avgSellingPrice,
        profitPerCard,
        marginPercent,
      };
    }).sort((a, b) => b.companyNetProfit - a.companyNetProfit);

    const companyOverallMarginPercent = companyTotalBaseCost > 0 ? Math.round((companyTotalNetProfit / companyTotalBaseCost) * 100) : 0;

    // =========================================================================
    // FRANCHISE PARTNER REVENUE & PROFIT ENGINE (State & District Partners)
    // =========================================================================
    const allMainFranchisePartners = await FranchisePartner.find({
      franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
    }).select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt');

    const mainPartnerIds = allMainFranchisePartners.map(p => p._id);

    const allMainPartnerTxns = await Transaction.find({
      $or: [
        { buyerPartnerId: { $in: mainPartnerIds } },
        { sellerPartnerId: { $in: mainPartnerIds } },
      ],
      status: { $ne: TRANSACTION_STATUS.CANCELLED },
    }).populate('buyerPartnerId', 'fullName franchiseId franchiseType').populate('sellerPartnerId', 'fullName franchiseId');

    const allMainPartnerInstalls = await Installation.find({
      partnerId: { $in: mainPartnerIds },
      createdByPartnerType: { $ne: 'SUB_FRANCHISE' },
    });

    const franchisePartnerFinances = allMainFranchisePartners.map((partner) => {
      const partnerIdStr = partner._id.toString();

      // Purchases from HQ
      const myBuyTxns = allMainPartnerTxns.filter(t => t.buyerPartnerId && t.buyerPartnerId._id?.toString() === partnerIdStr && !t.sellerPartnerId);
      const totalBoughtCards = myBuyTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
      const totalBuyCost = myBuyTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const avgBuyPrice = totalBoughtCards > 0 ? Math.round(totalBuyCost / totalBoughtCards) : (myBuyTxns[0]?.pricePerCard || 1500);

      // Card Sales / Allotments to Sub-Franchises
      const mySellTxns = allMainPartnerTxns.filter(t => t.sellerPartnerId && t.sellerPartnerId._id?.toString() === partnerIdStr);
      const subAllottedCards = mySellTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
      const subAllotmentRevenue = mySellTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const subAllotmentProfit = mySellTxns.reduce((sum, t) => {
        const sellRate = t.pricePerCard || (t.paidQuantity > 0 ? Math.round(t.totalAmount / t.paidQuantity) : 2400);
        const marginPerCard = Math.max(0, sellRate - avgBuyPrice);
        const qty = t.paidQuantity || t.quantity || 0;
        return sum + (marginPerCard * qty);
      }, 0);

      // Direct Customer Installations (Retail Sales)
      const myInstalls = allMainPartnerInstalls.filter(i => i.partnerId && i.partnerId.toString() === partnerIdStr);
      const directInstalledCards = myInstalls.reduce((sum, i) => sum + (i.installedCardCount || 0), 0);
      const directInstallRevenue = myInstalls.reduce((sum, i) => sum + (i.totalAmount || (i.installedCardCount * (i.pricePerCard || 3500))), 0);
      const directInstallProfit = myInstalls.reduce((sum, i) => {
        const sellRate = i.pricePerCard || 3500;
        const marginPerCard = Math.max(0, sellRate - avgBuyPrice);
        return sum + (marginPerCard * (i.installedCardCount || 1));
      }, 0);

      const totalCardsSold = subAllottedCards + directInstalledCards;
      const totalRevenue = subAllotmentRevenue + directInstallRevenue;
      const netProfit = subAllotmentProfit + directInstallProfit;
      const avgSellingPrice = totalCardsSold > 0 ? Math.round(totalRevenue / totalCardsSold) : (mySellTxns[0]?.pricePerCard || 2400);
      const profitPerCard = Math.max(0, avgSellingPrice - avgBuyPrice);
      const costOfSoldCards = totalCardsSold * avgBuyPrice;
      const marginPercent = costOfSoldCards > 0 ? Math.round((netProfit / costOfSoldCards) * 100) : 0;

      return {
        partnerId: partner._id,
        franchiseId: partner.franchiseId,
        fullName: partner.fullName,
        franchiseType: partner.franchiseType,
        mobileNumber: partner.mobileNumber,
        email: partner.email,
        district: partner.district || partner.city || 'District',
        state: partner.state,
        accountStatus: partner.accountStatus,
        createdAt: partner.createdAt,
        totalBoughtCards,
        totalBuyCost,
        avgBuyPrice,
        subAllottedCards,
        subAllotmentRevenue,
        directInstalledCards,
        directInstallRevenue,
        totalCardsSold,
        totalRevenue,
        avgSellingPrice,
        profitPerCard,
        netProfit,
        marginPercent,
        salesCount: mySellTxns.length + myInstalls.length,
        subAllotments: mySellTxns.map(t => ({
          transactionId: t.transactionId,
          buyerName: t.buyerPartnerId?.fullName,
          buyerFranchiseId: t.buyerPartnerId?.franchiseId,
          quantity: t.quantity,
          paidQuantity: t.paidQuantity || t.quantity,
          pricePerCard: t.pricePerCard,
          totalAmount: t.totalAmount,
          date: t.createdAt,
        })),
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    const franchisePartnerTotalRevenue = franchisePartnerFinances.reduce((sum, item) => sum + item.totalRevenue, 0);
    const franchisePartnerTotalProfit = franchisePartnerFinances.reduce((sum, item) => sum + item.netProfit, 0);
    const franchisePartnerTotalCardsSold = franchisePartnerFinances.reduce((sum, item) => sum + item.totalCardsSold, 0);
    const franchisePartnerTotalAdminPurchase = franchisePartnerFinances.reduce((sum, item) => sum + item.totalBuyCost, 0);
    const franchisePartnerTotalAdminCards = franchisePartnerFinances.reduce((sum, item) => sum + item.totalBoughtCards, 0);

    res.status(200).json(
      new ApiResponse(
        200,
        {
          overview: {
            totalPartners,
            activePartners,
            inactivePartners,
            suspendedPartners,
            expiredPartners,
            pendingPartners,
            stateFranchises,
            districtFranchises,
            premiumExclusiveDistrictPartners,
            activePremiumExclusiveDistrictPartners,
            standardExclusiveDistrictPartners,
            activeStandardExclusiveDistrictPartners,
            nonExclusiveDistrictPartners,
            activeNonExclusiveDistrictPartners,
            monthlyRevenue,
            monthlyCardsTransferred,
            totalRevenue,
            totalCardsTransferred,
            todayRevenue,
            todayCardsTransferred,
            todayPaidCards,
            todayFreeCards,
            todayTransactionCount,
            todayPartnersCount,
            companyTotalRevenue,
            companyTotalCardsSold,
            companyTotalBaseCost,
            companyTotalNetProfit,
            companyOverallMarginPercent,
            companyBaseCostPerCard: COMPANY_BASE_CARD_COST,
            franchisePartnerTotalRevenue,
            franchisePartnerTotalProfit,
            franchisePartnerTotalCardsSold,
            subFranchises,
            activeSubFranchises,
            nonActiveSubFranchises,
            districtWiseSubFranchisesCount,
            subFranchiseTotalRevenue: totalSubFranchiseRevenue,
            totalSubFranchiseRevenue,
            subFranchiseTotalCardsAllotted,
            subFranchisePaidCardsAllotted,
            subFranchiseFreeCardsAllotted,
            subFranchiseTotalAllotmentsCount,
            totalSubFranchiseProfit,
            subFranchiseCustomersCount,
            subFranchiseInstallationsCount,
            subFranchiseCardsInstalledCount,
            activeDistrictsCovered: districtAllocations.length,
            totalCustomers,
            totalInstallations,
            installedCardsCount,
          },
          todayPartners,
          todayTransactions,
          companyPartnerProfits,
          franchisePartnerFinances,
          recentSubFranchises,
          subFranchiseAllotments,
          subFranchiseProfits,
          recentPartners,
          stateDistribution: stateDistribution.map((s) => ({
            state: s._id,
            totalPartners: s.total,
            activePartners: s.active,
            districtsCoveredCount: s.districts.length,
          })),
        },
        'Admin dashboard metrics retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

// Partner-Specific Dashboard Summary (Real DB statistics for logged-in Partner)
export const getPartnerSummary = async (req, res, next) => {
  try {
    const partner = await FranchisePartner.findOne({ userId: req.user._id })
      .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');

    if (!partner) {
      return res.status(200).json(
        new ApiResponse(200, null, 'No partner profile associated with this account.')
      );
    }

    const isSubFranchise = partner.franchiseType === 'SUB_FRANCHISE';

    // Real DB query for Sub-Franchise partners, customers, and installations
    const [
      totalSubFranchises,
      activeSubFranchises,
      inactiveSubFranchises,
      recentSubFranchises,
      partnerCustomersCount,
      partnerInstallationsCount,
      partnerInstalledCardsCount,
      currentCardInventoryCount,
      pendingVerificationsCount,
      subFranchisePartnersList,
    ] = await Promise.all([
      FranchisePartner.countDocuments({ parentPartnerId: partner._id }),
      FranchisePartner.countDocuments({
        parentPartnerId: partner._id,
        accountStatus: ACCOUNT_STATUS.ACTIVE,
      }),
      FranchisePartner.countDocuments({
        parentPartnerId: partner._id,
        accountStatus: { $ne: ACCOUNT_STATUS.ACTIVE },
      }),
      FranchisePartner.find({ parentPartnerId: partner._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('franchiseId fullName mobileNumber state district city accountStatus joiningDate'),
      Customer.countDocuments({ createdByPartnerId: partner._id }),
      Installation.countDocuments({ partnerId: partner._id }),
      Card.countDocuments({ currentOwnerId: partner._id, status: CARD_STATUS.INSTALLED }),
      Card.countDocuments({
        currentOwnerId: partner._id,
        status: {
          $in: [
            CARD_STATUS.ASSIGNED,
            CARD_STATUS.AVAILABLE,
            CARD_STATUS.TRANSFERRED,
            CARD_STATUS.PENDING_TRANSFER,
          ],
        },
      }),
      Installation.countDocuments({
        partnerId: partner._id,
        $or: [
          { customerConfirmationStatus: { $ne: CONFIRMATION_STATUS.CONFIRMED } },
          { verificationStatus: { $in: ['PENDING', 'REJECTED'] } },
        ],
      }),
      // Fetch all sub-franchises for District/State partners to compute real performance table
      !isSubFranchise
        ? FranchisePartner.find({ parentPartnerId: partner._id })
            .select('franchiseId fullName mobileNumber state district city accountStatus joiningDate')
            .lean()
        : Promise.resolve([]),
    ]);

    // Build Sub-Franchise Performance Breakdown for Parent Franchise
    let subFranchisePerformance = [];
    if (!isSubFranchise && subFranchisePartnersList.length > 0) {
      const subPartnerIds = subFranchisePartnersList.map((s) => s._id);

      // Aggregations per sub-franchise
      const [customersAgg, installationsAgg, cardsAgg, inventoryAgg] = await Promise.all([
        Customer.aggregate([
          { $match: { createdByPartnerId: { $in: subPartnerIds } } },
          { $group: { _id: '$createdByPartnerId', count: { $sum: 1 } } },
        ]),
        Installation.aggregate([
          { $match: { partnerId: { $in: subPartnerIds } } },
          { $group: { _id: '$partnerId', count: { $sum: 1 }, totalCards: { $sum: '$installedCardCount' } } },
        ]),
        Card.aggregate([
          { $match: { currentOwnerId: { $in: subPartnerIds }, status: CARD_STATUS.INSTALLED } },
          { $group: { _id: '$currentOwnerId', count: { $sum: 1 } } },
        ]),
        Card.aggregate([
          {
            $match: {
              currentOwnerId: { $in: subPartnerIds },
              status: {
                $in: [
                  CARD_STATUS.ASSIGNED,
                  CARD_STATUS.AVAILABLE,
                  CARD_STATUS.TRANSFERRED,
                  CARD_STATUS.PENDING_TRANSFER,
                ],
              },
            },
          },
          { $group: { _id: '$currentOwnerId', count: { $sum: 1 } } },
        ]),
      ]);

      const custMap = new Map(customersAgg.map((c) => [String(c._id), c.count]));
      const instMap = new Map(installationsAgg.map((i) => [String(i._id), { count: i.count, totalCards: i.totalCards }]));
      const cardMap = new Map(cardsAgg.map((c) => [String(c._id), c.count]));
      const invMap = new Map(inventoryAgg.map((v) => [String(v._id), v.count]));

      subFranchisePerformance = subFranchisePartnersList.map((sub) => {
        const idStr = String(sub._id);
        const instData = instMap.get(idStr) || { count: 0, totalCards: 0 };
        return {
          _id: sub._id,
          franchiseId: sub.franchiseId,
          fullName: sub.fullName,
          mobileNumber: sub.mobileNumber,
          state: sub.state,
          district: sub.district,
          city: sub.city,
          accountStatus: sub.accountStatus,
          joiningDate: sub.joiningDate,
          customersAdded: custMap.get(idStr) || 0,
          installationsCount: instData.count || 0,
          cardsInstalled: cardMap.get(idStr) || instData.totalCards || 0,
          currentInventory: invMap.get(idStr) || 0,
        };
      });
    }

    // Query latest card allotment batch for this partner
    const latestAssignedCard = await Card.findOne({
      currentOwnerId: partner._id,
      assignedAt: { $exists: true, $ne: null },
    })
      .sort({ assignedAt: -1 })
      .select('assignedAt serialNumber assignedBy notes')
      .populate('assignedBy', 'name role email');

    let latestAllotment = null;
    if (latestAssignedCard && latestAssignedCard.assignedAt) {
      const assignedTime = new Date(latestAssignedCard.assignedAt).getTime();
      const windowStart = new Date(assignedTime - 20000); // 20s window
      const windowEnd = new Date(assignedTime + 20000);

      const batchCards = await Card.find({
        currentOwnerId: partner._id,
        assignedAt: { $gte: windowStart, $lte: windowEnd },
      })
        .select('serialNumber assignedAt notes')
        .sort({ serialNumber: 1 });

      if (batchCards.length > 0) {
        latestAllotment = {
          allotmentId: `ALLOT_${partner._id}_${assignedTime}_${batchCards.length}`,
          cardCount: batchCards.length,
          firstSerial: batchCards[0].serialNumber,
          lastSerial: batchCards[batchCards.length - 1].serialNumber,
          assignedAt: latestAssignedCard.assignedAt,
          assignedBy: latestAssignedCard.assignedBy?.name || 'Central HQ Administrator',
          notes: batchCards[0].notes || 'Consignment allocation from Central Headquarters',
        };
      }
    }

    res.status(200).json(
      new ApiResponse(
        200,
        {
          partner,
          parentPartner: partner.parentPartnerId,
          subFranchises: {
            total: totalSubFranchises,
            active: activeSubFranchises,
            inactive: inactiveSubFranchises,
            recent: recentSubFranchises,
            performance: subFranchisePerformance,
          },
          customers: {
            totalCardsAllotted: partnerInstalledCardsCount + currentCardInventoryCount,
            totalCustomers: partnerCustomersCount,
            totalInstallations: partnerInstallationsCount,
            installedCardsCount: partnerInstalledCardsCount,
            currentCardInventory: currentCardInventoryCount,
            pendingVerifications: pendingVerificationsCount,
          },
          latestAllotment,
        },
        'Partner dashboard summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

