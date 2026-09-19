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

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const startOfThisMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1, 0, 0, 0, 0);

    const startOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth() - 1, 1, 0, 0, 0, 0);
    const endOfLastMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 0, 23, 59, 59, 999);

    const getFranchiseRevenueAgg = (dateFilter) => {
      const match = { status: { $ne: TRANSACTION_STATUS.CANCELLED } };
      if (dateFilter) match.createdAt = dateFilter;
      return Transaction.aggregate([
        { $match: match },
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
            revenue: { $sum: '$totalAmount' },
            cardsTransferred: { $sum: '$quantity' },
            paidCardsCount: { $sum: '$paidQuantity' },
            freeCardsCount: { $sum: '$freeQuantity' },
            transactionCount: { $sum: 1 },
          },
        },
      ]);
    };

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
      yesterdayRevenueAgg,
      last7DaysRevenueAgg,
      thisMonthRevenueAgg,
      lastMonthRevenueAgg,
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
        .populate('userId', 'role status lastLoginAt')
        .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt lastLoginAt lastActiveAt parentPartnerId userId'),
      FranchisePartner.countDocuments({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
        franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE },
      }),
      // Today's Total Revenue (excluding sub-franchises)
      getFranchiseRevenueAgg({ $gte: startOfToday, $lte: endOfToday }),
      // Yesterday's Total Revenue (excluding sub-franchises)
      getFranchiseRevenueAgg({ $gte: startOfYesterday, $lte: endOfYesterday }),
      // Last 7 Days Total Revenue (excluding sub-franchises)
      getFranchiseRevenueAgg({ $gte: sevenDaysAgo, $lte: endOfToday }),
      // This Month Total Revenue (excluding sub-franchises)
      getFranchiseRevenueAgg({ $gte: startOfThisMonth, $lte: endOfToday }),
      // Last Month Total Revenue (excluding sub-franchises)
      getFranchiseRevenueAgg({ $gte: startOfLastMonth, $lte: endOfLastMonth }),
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
        .populate('userId', 'role status lastLoginAt')
        .select('franchiseId fullName mobileNumber email state district city franchiseType accountStatus createdAt lastLoginAt lastActiveAt parentPartnerId userId'),
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
    const todayRevenue = todayRevenueAgg[0]?.revenue || todayRevenueAgg[0]?.todayRevenue || 0;
    const todayCardsTransferred = todayRevenueAgg[0]?.cardsTransferred || todayRevenueAgg[0]?.todayCardsTransferred || 0;
    const todayPaidCards = todayRevenueAgg[0]?.paidCardsCount || 0;
    const todayFreeCards = todayRevenueAgg[0]?.freeCardsCount || 0;
    const todayTransactionCount = todayRevenueAgg[0]?.transactionCount || 0;

    const yesterdayRevenue = yesterdayRevenueAgg[0]?.revenue || 0;
    const yesterdayCardsTransferred = yesterdayRevenueAgg[0]?.cardsTransferred || 0;
    const last7DaysRevenue = last7DaysRevenueAgg[0]?.revenue || 0;
    const last7DaysCardsTransferred = last7DaysRevenueAgg[0]?.cardsTransferred || 0;
    const thisMonthRevenue = thisMonthRevenueAgg[0]?.revenue || 0;
    const thisMonthCardsTransferred = thisMonthRevenueAgg[0]?.cardsTransferred || 0;
    const lastMonthRevenue = lastMonthRevenueAgg[0]?.revenue || 0;
    const lastMonthCardsTransferred = lastMonthRevenueAgg[0]?.cardsTransferred || 0;
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
      
      // Calculate customer installation revenue and profit accurately (standard customer installation MRP: 3,500)
      const totalInstallationRevenue = myInstalls.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        const rate = (i.pricePerCard && i.pricePerCard > avgBuyPrice) ? i.pricePerCard : (i.totalAmount && Math.round(i.totalAmount / count) > avgBuyPrice ? Math.round(i.totalAmount / count) : 3500);
        return sum + (count * rate);
      }, 0);
      
      const avgSellPrice = totalInstalledCards > 0 ? Math.round(totalInstallationRevenue / totalInstalledCards) : 3500;
      const hasInstallations = totalInstalledCards > 0;
      const effectiveCardsSold = totalInstalledCards;
      
      // Profit per card = Customer Sell Price - Sub-Franchise Card Buy Price
      const profitPerCard = hasInstallations ? Math.max(0, avgSellPrice - avgBuyPrice) : 0;
      const netProfit = hasInstallations ? (totalInstalledCards * profitPerCard) : 0;
      const totalRevenueGenerated = hasInstallations ? totalInstallationRevenue : 0;
      const totalGrossSales = totalRevenueGenerated;
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
            revenuePeriods: {
              TODAY: {
                revenue: todayRevenue,
                cards: todayCardsTransferred,
                label: "Today's Revenue",
                subtitle: `${todayCardsTransferred.toLocaleString('en-IN')} Cards Allotted Today →`,
              },
              YESTERDAY: {
                revenue: yesterdayRevenue,
                cards: yesterdayCardsTransferred,
                label: "Yesterday's Revenue",
                subtitle: `${yesterdayCardsTransferred.toLocaleString('en-IN')} Cards Allotted Yesterday →`,
              },
              LAST_7_DAYS: {
                revenue: last7DaysRevenue,
                cards: last7DaysCardsTransferred,
                label: 'Last 7 Days Revenue',
                subtitle: `${last7DaysCardsTransferred.toLocaleString('en-IN')} Cards Allotted (Last 7 Days) →`,
              },
              THIS_MONTH: {
                revenue: thisMonthRevenue,
                cards: thisMonthCardsTransferred,
                label: 'This Month Revenue',
                subtitle: `${thisMonthCardsTransferred.toLocaleString('en-IN')} Cards Allotted This Month →`,
              },
              LAST_MONTH: {
                revenue: lastMonthRevenue,
                cards: lastMonthCardsTransferred,
                label: 'Last Month Revenue',
                subtitle: `${lastMonthCardsTransferred.toLocaleString('en-IN')} Cards Allotted Last Month →`,
              },
              ALL_TIME: {
                revenue: totalRevenue,
                cards: totalCardsTransferred,
                label: 'Total Revenue (All Time)',
                subtitle: `${totalCardsTransferred.toLocaleString('en-IN')} Cards Allotted to Franchise Partners →`,
              },
            },
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
    let partner = null;
    if (req.query.partnerId) {
      partner = await FranchisePartner.findById(req.query.partnerId)
        .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');
    } else {
      partner = await FranchisePartner.findOne({ userId: req.user._id })
        .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');
    }

    if (!partner && req.user.role === USER_ROLES.SUPER_ADMIN) {
      partner = await FranchisePartner.findOne({ franchiseType: { $ne: FRANCHISE_TYPES.SUB_FRANCHISE } })
        .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');
      if (!partner) {
        partner = await FranchisePartner.findOne()
          .populate('parentPartnerId', 'fullName franchiseId franchiseType mobileNumber email state district');
      }
    }

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

    // Query sub-franchise transfer transactions count
    let subTransfersCount = 0;
    if (!isSubFranchise) {
      subTransfersCount = await Transaction.countDocuments({
        sellerPartnerId: partner._id,
      });
    }

    // REAL REVENUE & REAL PROFIT CALCULATION (Live Database Records)
    const subPartnerIds = subFranchisePartnersList.map((s) => s._id);

    const [partnerBuyTxns, partnerSellTxns, partnerInstalls, subFranchiseInstalls] = await Promise.all([
      Transaction.find({
        buyerPartnerId: partner._id,
        status: { $ne: TRANSACTION_STATUS.CANCELLED },
      }),
      Transaction.find({
        sellerPartnerId: partner._id,
        status: { $ne: TRANSACTION_STATUS.CANCELLED },
      }).populate('buyerPartnerId', 'fullName franchiseId franchiseType mobileNumber district state city'),
      Installation.find({
        partnerId: partner._id,
      }).populate('customerId', 'fullName mobileNumber customerId customerType electricityDetails'),
      !isSubFranchise && subPartnerIds.length > 0
        ? Installation.find({
            partnerId: { $in: subPartnerIds },
          })
            .populate('partnerId', 'fullName franchiseId franchiseType mobileNumber district state city')
            .populate('customerId', 'fullName mobileNumber customerId customerType electricityDetails')
            .sort({ createdAt: -1 })
        : Promise.resolve([]),
    ]);

    const totalBoughtCards = partnerBuyTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
    const totalBuyCost = partnerBuyTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const avgBuyPrice = totalBoughtCards > 0 && totalBuyCost > 0 ? Math.round(totalBuyCost / totalBoughtCards) : 0;

    // Direct Customer Installations done by Active Franchise Partner
    const directInstalledCards = partnerInstalls.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
    const directInstallRevenue = partnerInstalls.reduce((sum, i) => {
      const count = i.installedCardCount || 1;
      return sum + (i.totalAmount || (count * (i.pricePerCard || 0)));
    }, 0);
    const directInstallProfit = partnerInstalls.reduce((sum, i) => {
      const count = i.installedCardCount || 1;
      const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
      const margin = Math.max(0, sellRate - avgBuyPrice);
      return sum + (margin * count);
    }, 0);

    // Cards Allotted by Active Partner to Sub-Franchises
    const subAllottedCards = partnerSellTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
    const subAllotmentRevenue = partnerSellTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const subAllotmentProfit = partnerSellTxns.reduce((sum, t) => {
      const sellRate = t.pricePerCard || (t.paidQuantity > 0 ? Math.round(t.totalAmount / t.paidQuantity) : 0);
      const margin = Math.max(0, sellRate - avgBuyPrice);
      const qty = t.paidQuantity || t.quantity || 0;
      return sum + (margin * qty);
    }, 0);

    // Retail Card Sales & Profit performed BY SUB-FRANCHISE PARTNERS (when viewed by parent partner)
    const subRetailCards = subFranchiseInstalls.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
    const subRetailRevenue = subFranchiseInstalls.reduce((sum, i) => {
      const count = i.installedCardCount || 1;
      return sum + (i.totalAmount || (count * (i.pricePerCard || 0)));
    }, 0);
    const subRetailProfit = subFranchiseInstalls.reduce((sum, i) => {
      const count = i.installedCardCount || 1;
      const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
      const buyCost = 2400; // Sub-franchise acquisition cost from district partner
      const margin = Math.max(0, sellRate - buyCost);
      return sum + (margin * count);
    }, 0);

    const totalCardsSold = isSubFranchise ? directInstalledCards : (subAllottedCards + directInstalledCards);
    const realizedRevenue = isSubFranchise ? directInstallRevenue : (subAllotmentRevenue + directInstallRevenue);
    const realizedProfit = isSubFranchise ? directInstallProfit : (subAllotmentProfit + directInstallProfit);

    const totalInHandStock = currentCardInventoryCount || Math.max(0, totalBoughtCards - totalCardsSold) || 0;

    // PERIODIC BREAKDOWN (Today / Per Day, Last 7 Days / Week, This Month, All Time)
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const calcPeriodMetrics = (sellTxns, installs, startDate) => {
      const filteredTxns = startDate ? sellTxns.filter(t => new Date(t.createdAt) >= startDate) : sellTxns;
      const filteredInstalls = startDate ? installs.filter(i => new Date(i.createdAt || i.installationDate || i.updatedAt) >= startDate) : installs;

      const subRev = filteredTxns.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
      const subCards = filteredTxns.reduce((sum, t) => sum + (t.paidQuantity || t.quantity || 0), 0);
      const subProfit = filteredTxns.reduce((sum, t) => {
        const sellRate = t.pricePerCard || (t.paidQuantity > 0 ? Math.round(t.totalAmount / t.paidQuantity) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        const qty = t.paidQuantity || t.quantity || 0;
        return sum + (margin * qty);
      }, 0);

      const instRev = filteredInstalls.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        return sum + (i.totalAmount || (count * (i.pricePerCard || 0)));
      }, 0);
      const instCards = filteredInstalls.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
      const instProfit = filteredInstalls.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        return sum + (margin * count);
      }, 0);

      const rev = subRev + instRev;
      const prof = subProfit + instProfit;
      const sold = subCards + instCards;

      // Group by Recipient to know exactly who received cards and how much profit was made
      const recipientMap = new Map();
      filteredTxns.forEach(t => {
        const name = t.buyerPartnerId?.fullName || 'Sub-Franchise Partner';
        const fid = t.buyerPartnerId?.franchiseId || '';
        const qty = t.paidQuantity || t.quantity || 0;
        const sellRate = t.pricePerCard || (t.paidQuantity > 0 ? Math.round(t.totalAmount / t.paidQuantity) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        const p = margin * qty;
        const r = t.totalAmount || (sellRate * qty);

        const key = `SUB_${t.buyerPartnerId?._id || name}`;
        if (!recipientMap.has(key)) {
          recipientMap.set(key, {
            name: fid ? `${name} (${fid})` : name,
            rawName: name,
            identifier: fid,
            type: 'Sub-Franchise',
            cards: 0,
            revenue: 0,
            profit: 0,
            rate: sellRate,
          });
        }
        const entry = recipientMap.get(key);
        entry.cards += qty;
        entry.revenue += r;
        entry.profit += p;
      });

      filteredInstalls.forEach(i => {
        const name = i.customerName || i.customerId?.fullName || 'Customer';
        const cid = i.customerId?.customerId || '';
        const count = i.installedCardCount || 1;
        const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        const p = margin * count;
        const r = i.totalAmount || (sellRate * count);

        const key = `CUST_${i.customerId?._id || name}`;
        if (!recipientMap.has(key)) {
          recipientMap.set(key, {
            name: cid ? `${name} (${cid})` : name,
            rawName: name,
            identifier: cid,
            type: 'Direct Customer',
            cards: 0,
            revenue: 0,
            profit: 0,
            rate: sellRate,
          });
        }
        const entry = recipientMap.get(key);
        entry.cards += count;
        entry.revenue += r;
        entry.profit += p;
      });

      const recipients = Array.from(recipientMap.values()).sort((a, b) => b.profit - a.profit);

      return {
        revenue: rev,
        profit: prof,
        cardsSold: sold,
        marginPercent: rev > 0 ? Math.round((prof / rev) * 100) : 0,
        recipients,
      };
    };

    // Sub-Franchise Network Retail Sales Period Metrics (Sub-Franchise card sales to customers)
    const calcSubRetailPeriodMetrics = (subInstalls, startDate) => {
      const filtered = startDate ? subInstalls.filter(i => new Date(i.createdAt || i.installationDate || i.updatedAt) >= startDate) : subInstalls;
      const rev = filtered.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        return sum + (i.totalAmount || (count * (i.pricePerCard || 0)));
      }, 0);
      const cards = filtered.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
      const profit = filtered.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
        const buyCost = 2400;
        const margin = Math.max(0, sellRate - buyCost);
        return sum + (margin * count);
      }, 0);
      return {
        revenue: rev,
        profit,
        cardsSold: cards,
        marginPercent: rev > 0 ? Math.round((profit / rev) * 100) : 0,
      };
    };

    // Direct Installations Period Metrics (Active Partner's own direct sales to consumers)
    const calcDirectPeriodMetrics = (installs, startDate) => {
      const filteredInstalls = startDate ? installs.filter(i => new Date(i.createdAt || i.installationDate || i.updatedAt) >= startDate) : installs;
      const instRev = filteredInstalls.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        return sum + (i.totalAmount || (count * (i.pricePerCard || 0)));
      }, 0);
      const instCards = filteredInstalls.reduce((sum, i) => sum + (i.installedCardCount || 1), 0);
      const instProfit = filteredInstalls.reduce((sum, i) => {
        const count = i.installedCardCount || 1;
        const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        return sum + (margin * count);
      }, 0);

      const recipientMap = new Map();
      filteredInstalls.forEach(i => {
        const name = i.customerName || i.customerId?.fullName || 'Customer';
        const cid = i.customerId?.customerId || '';
        const count = i.installedCardCount || 1;
        const sellRate = i.pricePerCard || (i.totalAmount ? Math.round(i.totalAmount / count) : 0);
        const margin = Math.max(0, sellRate - avgBuyPrice);
        const p = margin * count;
        const r = i.totalAmount || (sellRate * count);

        const key = `CUST_${i.customerId?._id || name}`;
        if (!recipientMap.has(key)) {
          recipientMap.set(key, {
            name: cid ? `${name} (${cid})` : name,
            rawName: name,
            identifier: cid,
            type: 'Consumer',
            cards: 0,
            revenue: 0,
            profit: 0,
            rate: sellRate,
          });
        }
        const entry = recipientMap.get(key);
        entry.cards += count;
        entry.revenue += r;
        entry.profit += p;
      });

      const recipients = Array.from(recipientMap.values()).sort((a, b) => b.profit - a.profit);

      return {
        revenue: instRev,
        profit: instProfit,
        cardsSold: instCards,
        marginPercent: instRev > 0 ? Math.round((instProfit / instRev) * 100) : 0,
        recipients,
      };
    };

    const todayPeriod = calcPeriodMetrics(partnerSellTxns, partnerInstalls, startOfToday);
    const last7DaysPeriod = calcPeriodMetrics(partnerSellTxns, partnerInstalls, sevenDaysAgo);
    const thisMonthPeriod = calcPeriodMetrics(partnerSellTxns, partnerInstalls, startOfMonth);
    const allTimePeriod = calcPeriodMetrics(partnerSellTxns, partnerInstalls, null);

    // Mapped Detail Records for Popup Modal (Sub-Franchise Card Allotments)
    const subAllotmentsList = partnerSellTxns.map((t) => {
      const sellRate = t.pricePerCard || (t.paidQuantity > 0 ? Math.round(t.totalAmount / t.paidQuantity) : 2400);
      const margin = Math.max(0, sellRate - avgBuyPrice);
      const qty = t.paidQuantity || t.quantity || 0;
      const serials = t.cardSerialNumbers || [];
      const serialRange = serials.length > 1 ? `${serials[0]} ➔ ${serials[serials.length - 1]}` : (serials[0] || 'N/A');
      return {
        _id: t._id,
        transactionId: t.transactionId,
        buyerName: t.buyerPartnerId?.fullName || 'Sub-Franchise Partner',
        buyerFranchiseId: t.buyerPartnerId?.franchiseId,
        mobileNumber: t.buyerPartnerId?.mobileNumber,
        district: t.buyerPartnerId?.district,
        city: t.buyerPartnerId?.city,
        state: t.buyerPartnerId?.state,
        quantity: qty,
        freeQuantity: t.freeQuantity || 0,
        paidQuantity: t.paidQuantity || qty,
        pricePerCard: sellRate,
        totalAmount: t.totalAmount,
        profit: margin * qty,
        profitPerCard: margin,
        avgBuyPrice,
        serialRange,
        serialNumbers: serials,
        status: t.status,
        paymentStatus: t.paymentStatus,
        paymentMode: t.paymentMode || 'BANK_TRANSFER',
        invoiceNumber: t.invoiceNumber,
        date: t.confirmedAt || t.createdAt,
      };
    });

    // Mapped Detail Records of Retail Sales performed BY SUB-FRANCHISES
    const subFranchiseInstallsList = subFranchiseInstalls.map((i) => {
      const sellRate = i.pricePerCard || 3500;
      const buyCost = 2400;
      const margin = Math.max(0, sellRate - buyCost);
      const count = i.installedCardCount || 1;
      return {
        _id: i._id,
        installationId: i.installationId || `INST-${i._id.toString().slice(-6).toUpperCase()}`,
        subPartnerName: i.partnerId?.fullName || 'Sub-Franchise Partner',
        subFranchiseId: i.partnerId?.franchiseId || 'Sub-Franchise',
        subMobile: i.partnerId?.mobileNumber,
        subTerritory: i.partnerId?.district || i.partnerId?.city || i.partnerId?.state,
        customerName: i.customerName || i.customerId?.fullName || 'Consumer',
        customerMobile: i.customerMobile || i.customerId?.mobileNumber,
        customerId: i.customerId?.customerId,
        loadKw: i.electricityDetails?.connectedLoadKw || 1,
        serialNumber: i.cardSerialNumber,
        quantity: count,
        pricePerCard: sellRate,
        buyCost,
        totalAmount: i.totalAmount || (count * sellRate),
        profit: margin * count,
        profitPerCard: margin,
        date: i.installationDate || i.createdAt,
      };
    });

    // Active Partner Direct Customer Installations
    const directInstallsList = partnerInstalls.map((i) => {
      const sellRate = i.pricePerCard || 3500;
      const margin = Math.max(0, sellRate - avgBuyPrice);
      const count = i.installedCardCount || 1;
      return {
        _id: i._id,
        installationId: i.installationId || `INST-${i._id.toString().slice(-6).toUpperCase()}`,
        customerName: i.customerName || i.customerId?.fullName || 'Consumer',
        customerMobile: i.customerMobile || i.customerId?.mobileNumber,
        customerId: i.customerId?.customerId,
        consumerCategory: i.customerType || i.customerId?.customerType || 'RESIDENTIAL',
        loadKw: i.electricityDetails?.connectedLoadKw || 1,
        serialNumber: i.cardSerialNumber || (i.cardSerialNumbers && i.cardSerialNumbers[0]) || 'CARD-SRL',
        quantity: count,
        pricePerCard: sellRate,
        totalAmount: i.totalAmount || (count * sellRate),
        profit: margin * count,
        profitPerCard: margin,
        date: i.installationDate || i.createdAt,
      };
    });

    // Strict Pure Realized Financials for Active Partner & Sub-Franchise Network
    const financials = {
      totalBoughtCards,
      totalBuyCost,
      avgBuyPrice,
      // Active Partner Direct Customer Sales
      directInstalledCards,
      directInstallRevenue,
      directInstallProfit,
      directPeriods: {
        TODAY: calcDirectPeriodMetrics(partnerInstalls, startOfToday),
        LAST_7_DAYS: calcDirectPeriodMetrics(partnerInstalls, sevenDaysAgo),
        THIS_MONTH: calcDirectPeriodMetrics(partnerInstalls, startOfMonth),
        ALL_TIME: calcDirectPeriodMetrics(partnerInstalls, null),
      },
      // Active Partner Allotments to Sub-Franchises
      subAllottedCards,
      subAllotmentRevenue,
      subAllotmentProfit,
      subAllotmentsList,
      // Sub-Franchise Network Retail Sales & Profit (What Sub-Franchises sold to their customers)
      subRetailCards,
      subRetailRevenue,
      subRetailProfit,
      subFranchiseInstallsList,
      subRetailPeriods: {
        TODAY: calcSubRetailPeriodMetrics(subFranchiseInstalls, startOfToday),
        LAST_7_DAYS: calcSubRetailPeriodMetrics(subFranchiseInstalls, sevenDaysAgo),
        THIS_MONTH: calcSubRetailPeriodMetrics(subFranchiseInstalls, startOfMonth),
        ALL_TIME: calcSubRetailPeriodMetrics(subFranchiseInstalls, null),
      },
      // Totals
      totalCardsSold,
      realizedRevenue,
      realizedProfit,
      totalInHandStock,
      totalRevenue: realizedRevenue,
      netProfit: realizedProfit,
      profitPerCard: totalCardsSold > 0 ? Math.round(realizedProfit / totalCardsSold) : 0,
      marginPercent: realizedRevenue > 0 ? Math.round((realizedProfit / realizedRevenue) * 100) : 0,
      directInstallsList,
      periods: {
        TODAY: todayPeriod,
        LAST_7_DAYS: last7DaysPeriod,
        THIS_MONTH: thisMonthPeriod,
        ALL_TIME: allTimePeriod,
      },
    };

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
            totalStock: subFranchisePerformance.reduce((acc, s) => acc + (s.currentInventory || 0) + (s.cardsInstalled || 0), 0),
            installedCards: subFranchisePerformance.reduce((acc, s) => acc + (s.cardsInstalled || 0), 0),
            pendingCards: subFranchisePerformance.reduce((acc, s) => acc + (s.currentInventory || 0), 0),
            transfersCount: subTransfersCount,
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
          financials,
        },
        'Partner dashboard summary retrieved successfully'
      )
    );
  } catch (err) {
    next(err);
  }
};

