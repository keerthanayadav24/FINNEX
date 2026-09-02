import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/categoryService.js';
import { createCategorySchema } from '../validators/schemas.js';

export class CategoryController {
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const categories = await CategoryService.getUserCategories(userId);
      res.json({
        success: true,
        data: categories,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const validatedData = createCategorySchema.parse(req.body);
      const category = await CategoryService.createCategory(userId, validatedData);
      res.status(201).json({
        success: true,
        data: category,
        message: 'Category created successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async suggestCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const merchant = String(req.query.merchant || '');
      const suggestion = await CategoryService.suggestCategory(userId, merchant);
      res.json({
        success: true,
        data: suggestion,
      });
    } catch (err) {
      next(err);
    }
  }
}
