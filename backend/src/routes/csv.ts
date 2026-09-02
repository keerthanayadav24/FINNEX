import { Router } from 'express';
import { CsvController } from '../controllers/csvController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.post('/preview', CsvController.previewCsv);
router.post('/confirm', CsvController.confirmImport);

export default router;
