import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/summary', DashboardController.getSummary);
router.get('/spending-by-category', DashboardController.getSpendingByCategory);
router.get('/spending-trend', DashboardController.getSpendingTrend);

export default router;
