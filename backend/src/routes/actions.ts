import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { ActionController } from '../controllers/actionController.js';

const router = Router();

router.use(requireAuth);

router.get('/', ActionController.getActions);

export default router;
