import { Router } from 'express';
import { TransactionController } from '../controllers/transactionController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.get('/', TransactionController.getTransactions);
router.post('/', TransactionController.createTransaction);
router.get('/:id', TransactionController.getTransactionById);
router.put('/:id', TransactionController.updateTransaction);
router.delete('/:id', TransactionController.deleteTransaction);

export default router;
