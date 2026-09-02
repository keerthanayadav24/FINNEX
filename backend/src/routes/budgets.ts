import { Router } from 'express';
import { BudgetController } from '../controllers/budgetController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', BudgetController.getBudgets);
router.post('/', BudgetController.createBudget);

export default router;
