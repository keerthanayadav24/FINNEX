import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { FinancialTimelineController } from '../controllers/financialTimelineController.js';

const router = Router();

router.use(requireAuth);

router.get('/', FinancialTimelineController.getTimeline);

export default router;
