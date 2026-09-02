import { Router } from 'express';
import { IntelligenceController } from '../controllers/intelligenceController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/trends', IntelligenceController.getTrends);
router.get('/anomalies', IntelligenceController.getAnomalies);
router.get('/forecast', IntelligenceController.getForecast);

export default router;
