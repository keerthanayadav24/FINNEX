import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { GoalController } from '../controllers/goalController.js';

const router = Router();

router.use(requireAuth);

router.get('/', GoalController.getGoals);
router.get('/:id', GoalController.getGoalById);
router.post('/', GoalController.createGoal);
router.put('/:id', GoalController.updateGoal);
router.delete('/:id', GoalController.deleteGoal);

router.post('/:id/contributions', GoalController.addContribution);
router.put('/:id/contributions/:contributionId', GoalController.updateContribution);
router.delete('/:id/contributions/:contributionId', GoalController.deleteContribution);

export default router;
