import { ApiResponse } from '../utils/apiResponse.js';
import {
  getNextAvailableSerialRange,
  previewCardBatch,
  createBatchCards,
  createManualCards,
  deleteSingleCard,
  deleteBatchRange,
  getCards,
  getCardRanges,
  getCardById,
  getCardHistory,
  updateCardStatus,
  getCardStats,
  previewAssignCards,
  assignCardsToPartner,
  getPartnerDistributionBreakdown,
} from '../services/card.service.js';

// 0. Auto-Suggest Next Available Serial Range (Super Admin)
export const getNextSerial = async (req, res, next) => {
  try {
    const { prefix, paddingLength, count } = req.query;
    const result = await getNextAvailableSerialRange(prefix, paddingLength, count);
    res.status(200).json(
      new ApiResponse(200, result, 'Next available serial range retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 1. Preview Card Batch (Super Admin)
export const previewBatch = async (req, res, next) => {
  try {
    const result = await previewCardBatch(req.validatedBatch);
    res.status(200).json(
      new ApiResponse(200, result, 'Card batch preview calculated successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 2. Create Batch Cards (Super Admin)
export const createBatch = async (req, res, next) => {
  try {
    const result = await createBatchCards(req.validatedBatch, req.user);
    res.status(201).json(
      new ApiResponse(201, result, `Successfully generated ${result.totalCreated} cards in Batch ${result.batchId}`)
    );
  } catch (err) {
    next(err);
  }
};

// 3. Create Manual Cards (Super Admin)
export const createManual = async (req, res, next) => {
  try {
    const result = await createManualCards(req.validatedSerials, req.validatedNotes, req.user);
    res.status(201).json(
      new ApiResponse(201, result, `Successfully added ${result.totalCreated} cards`)
    );
  } catch (err) {
    next(err);
  }
};

// 3.5 Delete Single Card (Super Admin)
export const deleteCard = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const result = await deleteSingleCard(req.params.id, req.user, reason);
    res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err) {
    next(err);
  }
};

// 3.6 Batch Delete Cards by Range / Batch ID (Super Admin)
export const deleteBatchStock = async (req, res, next) => {
  try {
    const result = await deleteBatchRange(req.body, req.user);
    res.status(200).json(new ApiResponse(200, result, result.message));
  } catch (err) {
    next(err);
  }
};


// 4. Get Cards List (Search, Filter, Pagination)
export const getAllCards = async (req, res, next) => {
  try {
    const result = await getCards(req.query, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Cards retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 4.5 Get Grouped Card Ranges (Serial Range Summary)
export const getRanges = async (req, res, next) => {
  try {
    const result = await getCardRanges(req.query, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Card ranges retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 5. Get Single Card by ID
export const getSingleCard = async (req, res, next) => {
  try {
    const card = await getCardById(req.params.id, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, card, 'Card details retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 6. Get Card History / Audit Trail
export const getSingleCardHistory = async (req, res, next) => {
  try {
    const result = await getCardHistory(req.params.id, req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, result, 'Card audit history retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 7. Update Card Status (Super Admin)
export const changeCardStatus = async (req, res, next) => {
  try {
    const { newStatus, reason } = req.body;
    const card = await updateCardStatus(req.params.id, newStatus, reason, req.user);
    res.status(200).json(
      new ApiResponse(200, card, `Card status updated to ${newStatus}`)
    );
  } catch (err) {
    next(err);
  }
};

// 8. Get Card Statistics
export const getStats = async (req, res, next) => {
  try {
    const stats = await getCardStats(req.user, req.partner);
    res.status(200).json(
      new ApiResponse(200, stats, 'Card statistics retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 9. Preview Card Allocation before Assigning
export const previewAssign = async (req, res, next) => {
  try {
    const result = await previewAssignCards(req.body);
    res.status(200).json(
      new ApiResponse(200, result, 'Allocation preview checked successfully')
    );
  } catch (err) {
    next(err);
  }
};

// 10. Assign Cards Stock to Partner (Super Admin)
export const assignStock = async (req, res, next) => {
  try {
    const result = await assignCardsToPartner(req.body, req.user);
    res.status(200).json(
      new ApiResponse(
        200,
        result,
        `Successfully allocated ${result.assignedCount} cards to ${result.partner.fullName} (${result.partner.franchiseId})`
      )
    );
  } catch (err) {
    next(err);
  }
};

// 11. Partner-Wise Distribution Breakdown (Super Admin)
export const getPartnerDistribution = async (req, res, next) => {
  try {
    const result = await getPartnerDistributionBreakdown(req.query);
    res.status(200).json(
      new ApiResponse(200, result, 'Partner card distribution breakdown retrieved successfully')
    );
  } catch (err) {
    next(err);
  }
};

