import express from 'express';
import { protect } from '../../middlewares/auth.middleware.js';
import { uploadMedia } from '../../controllers/media.controller.js';

const router = express.Router();

router.use(protect);

router.post('/upload', uploadMedia);

export default router;
