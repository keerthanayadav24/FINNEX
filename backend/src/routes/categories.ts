import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', CategoryController.getCategories);
router.get('/suggest', CategoryController.suggestCategory);
router.post('/', CategoryController.createCategory);

export default router;
