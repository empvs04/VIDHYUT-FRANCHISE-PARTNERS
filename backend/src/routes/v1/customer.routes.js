import express from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import {
  getCustomers,
  getCustomerById,
  sendOTP,
  verifyOTP,
} from '../../controllers/customer.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);

export default router;
