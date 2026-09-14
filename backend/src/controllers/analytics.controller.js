import { ApiResponse } from '../utils/apiResponse.js';
import * as analyticsService from '../services/analytics.service.js';

export const getOverview = async (req, res, next) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const data = await analyticsService.getOverviewAnalytics({
      dateRange,
      startDate,
      endDate,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Overview analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getRevenue = async (req, res, next) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const data = await analyticsService.getRevenueAnalytics({
      dateRange,
      startDate,
      endDate,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Revenue analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getCardLifecycle = async (req, res, next) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const data = await analyticsService.getCardLifecycleAnalytics({
      dateRange,
      startDate,
      endDate,
      user: req.user,
      partner: req.partner,
    });
    res
      .status(200)
      .json(new ApiResponse(200, data, 'Card lifecycle analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getPartnersPerformance = async (req, res, next) => {
  try {
    const { sortBy, limit } = req.query;
    const data = await analyticsService.getPartnerPerformanceAnalytics({
      sortBy,
      limit,
      user: req.user,
      partner: req.partner,
    });
    res
      .status(200)
      .json(new ApiResponse(200, data, 'Partner performance analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getStates = async (req, res, next) => {
  try {
    const data = await analyticsService.getStateAnalytics({
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'State analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getDistricts = async (req, res, next) => {
  try {
    const { state } = req.query;
    const data = await analyticsService.getDistrictAnalytics({
      state,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'District analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getGPSQuality = async (req, res, next) => {
  try {
    const { dateRange, startDate, endDate } = req.query;
    const data = await analyticsService.getGPSQualityAnalytics({
      dateRange,
      startDate,
      endDate,
      user: req.user,
      partner: req.partner,
    });
    res
      .status(200)
      .json(new ApiResponse(200, data, 'GPS quality analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getCustomerElectricity = async (req, res, next) => {
  try {
    const data = await analyticsService.getCustomerElectricityAnalytics({
      user: req.user,
      partner: req.partner,
    });
    res
      .status(200)
      .json(new ApiResponse(200, data, 'Customer & load analytics retrieved successfully'));
  } catch (err) {
    next(err);
  }
};

export const getSubFranchiseDistribution = async (req, res, next) => {
  try {
    const { startDate, endDate, parentPartnerId, state, district, search } = req.query;
    const data = await analyticsService.getSubFranchiseDistributionTracking({
      startDate,
      endDate,
      parentPartnerId,
      state,
      district,
      search,
      user: req.user,
      partner: req.partner,
    });
    res
      .status(200)
      .json(new ApiResponse(200, data, 'Sub-Franchise card distribution audit retrieved successfully'));
  } catch (err) {
    next(err);
  }
};


