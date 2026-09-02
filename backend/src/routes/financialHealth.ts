import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { FinancialHealthController } from '../controllers/financialHealthController.js';

const router = Router();

router.use(requireAuth);

router.get('/', FinancialHealthController.getHealth);
router.get('/runway', FinancialHealthController.getRunway);

export default router;
