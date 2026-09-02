import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ScenarioController } from '../controllers/scenarioController.js';

const router = Router();

router.use(requireAuth);

router.post('/simulate', ScenarioController.simulate);

export default router;
