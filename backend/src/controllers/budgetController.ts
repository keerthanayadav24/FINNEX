import { Request, Response, NextFunction } from 'express';
import { BudgetService } from '../services/budgetService.js';
import { createBudgetSchema } from '../validators/schemas.js';

export class BudgetController {
  static async getBudgets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const budgets = await BudgetService.getUserBudgets(userId);
      res.json({
        success: true,
        data: budgets,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedData = createBudgetSchema.parse(req.body);
      const budget = await BudgetService.createBudget(userId, validatedData);
      res.status(201).json({
        success: true,
        data: budget,
        message: 'Budget created successfully',
      });
    } catch (err) {
      next(err);
    }
  }
}
