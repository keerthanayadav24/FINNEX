import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboardService.js';

export class DashboardController {
  static async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const sDate = startDate ? new Date(String(startDate)) : undefined;
      const eDate = endDate ? new Date(String(endDate)) : undefined;

      const summary = await DashboardService.getSummary(userId, sDate, eDate);
      res.json({
        success: true,
        data: summary,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSpendingByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const sDate = startDate ? new Date(String(startDate)) : undefined;
      const eDate = endDate ? new Date(String(endDate)) : undefined;

      const categoryData = await DashboardService.getSpendingByCategory(userId, sDate, eDate);
      res.json({
        success: true,
        data: categoryData,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getSpendingTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const sDate = startDate ? new Date(String(startDate)) : undefined;
      const eDate = endDate ? new Date(String(endDate)) : undefined;

      const trendData = await DashboardService.getSpendingTrend(userId, sDate, eDate);
      res.json({
        success: true,
        data: trendData,
      });
    } catch (err) {
      next(err);
    }
  }
}
