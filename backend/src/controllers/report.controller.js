import { ApiResponse } from '../utils/apiResponse.js';
import * as reportService from '../services/report.service.js';

export const getCardMovements = async (req, res, next) => {
  try {
    const data = await reportService.getCardMovementsReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Card movement report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const getPartnerInventory = async (req, res, next) => {
  try {
    const data = await reportService.getPartnerInventoryReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Partner inventory report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const getInstallations = async (req, res, next) => {
  try {
    const data = await reportService.getInstallationsReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Installations report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const getP2PTransactions = async (req, res, next) => {
  try {
    const data = await reportService.getP2PTransactionsReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'P2P transactions report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const data = await reportService.getPaymentsReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Payments report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const getDisputes = async (req, res, next) => {
  try {
    const data = await reportService.getDisputesReport({
      ...req.query,
      user: req.user,
      partner: req.partner,
    });
    res.status(200).json(new ApiResponse(200, data, 'Disputes report retrieved'));
  } catch (err) {
    next(err);
  }
};

export const auditCardSerial = async (req, res, next) => {
  try {
    const { serialNumber } = req.params;
    const data = await reportService.getCardSerialAuditTracer(
      serialNumber,
      req.user,
      req.partner
    );
    if (!data) {
      return res
        .status(404)
        .json(new ApiResponse(404, null, `Card serial "${serialNumber}" not found`));
    }
    res.status(200).json(new ApiResponse(200, data, 'Card serial audit tracer retrieved'));
  } catch (err) {
    next(err);
  }
};

export const auditCustomerSearch = async (req, res, next) => {
  try {
    const { search } = req.query;
    const data = await reportService.getCustomerDeepAudit(
      search,
      req.user,
      req.partner
    );
    res.status(200).json(new ApiResponse(200, data, 'Customer audit results retrieved'));
  } catch (err) {
    next(err);
  }
};

export const exportReport = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    const csvData = await reportService.exportReportToCSV(reportType, {
      ...req.query,
      user: req.user,
      partner: req.partner,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="vidhyut-saathi-${reportType}-${Date.now()}.csv"`
    );
    res.status(200).send(csvData);
  } catch (err) {
    next(err);
  }
};

