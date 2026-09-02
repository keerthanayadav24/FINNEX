import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/accountService.js';
import { createAccountSchema, updateAccountSchema } from '../validators/schemas.js';

export class AccountController {
  static async getAccounts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const accounts = await AccountService.getUserAccounts(userId);
      res.json({
        success: true,
        data: accounts,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAccountById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const accountId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const account = await AccountService.getAccountById(userId, accountId);
      res.json({
        success: true,
        data: account,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedData = createAccountSchema.parse(req.body);
      const account = await AccountService.createAccount(userId, validatedData);
      res.status(201).json({
        success: true,
        data: account,
        message: 'Account created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const accountId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      const validatedData = updateAccountSchema.parse(req.body);
      const account = await AccountService.updateAccount(userId, accountId, validatedData);
      res.json({
        success: true,
        data: account,
        message: 'Account updated successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const accountId = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
      await AccountService.deleteAccount(userId, accountId);
      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
