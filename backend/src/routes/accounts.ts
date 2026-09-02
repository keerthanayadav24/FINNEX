import { Router } from 'express';
import { AccountController } from '../controllers/accountController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', AccountController.getAccounts);
router.post('/', AccountController.createAccount);
router.get('/:id', AccountController.getAccountById);
router.put('/:id', AccountController.updateAccount);
router.delete('/:id', AccountController.deleteAccount);

export default router;
