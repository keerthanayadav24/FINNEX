import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transactionService.js';
import { createTransactionSchema, updateTransactionSchema } from '../validators/schemas.js';

export class TransactionController {
  static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { accountId, categoryId, type, source, startDate, endDate, tag, search, sortBy, sortOrder, page, limit } = req.query;

      const filters: any = {};
      if (accountId) filters.accountId = String(accountId);
      if (categoryId) filters.categoryId = String(categoryId);
      if (type) filters.type = String(type);
      if (source) filters.source = String(source);
      if (tag) filters.tag = String(tag);
      if (search) filters.search = String(search);
      if (sortBy) filters.sortBy = String(sortBy);
      if (sortOrder) filters.sortOrder = String(sortOrder);
      if (page) filters.page = parseInt(String(page), 10);
      if (limit) filters.limit = parseInt(String(limit), 10);
      if (startDate) filters.startDate = new Date(String(startDate));
      if (endDate) filters.endDate = new Date(String(endDate));

      const result = await TransactionService.getUserTransactions(userId, filters);
      res.json({
        success: true,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const transaction = await TransactionService.getTransactionById(userId, transactionId);
      res.json({
        success: true,
        data: transaction,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedData = createTransactionSchema.parse(req.body);
      const transaction = await TransactionService.createTransaction(userId, validatedData);
      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction recorded successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const validatedData = updateTransactionSchema.parse(req.body);
      const transaction = await TransactionService.updateTransaction(userId, transactionId, validatedData);
      res.json({
        success: true,
        data: transaction,
        message: 'Transaction updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const transactionId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      await TransactionService.deleteTransaction(userId, transactionId);
      res.json({
        success: true,
        message: 'Transaction deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
