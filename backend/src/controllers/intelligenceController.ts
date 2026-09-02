import { Request, Response, NextFunction } from 'express';
import { TrendAnalysisService } from '../services/intelligence/trendAnalysisService.js';
import { AnomalyDetectionService } from '../services/intelligence/anomalyDetectionService.js';
import { SpendingForecastService } from '../services/intelligence/spendingForecastService.js';

export class IntelligenceController {
  static async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const trends = await TrendAnalysisService.analyzeTrends(userId);
      res.json({
        success: true,
        data: trends,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAnomalies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const anomalies = await AnomalyDetectionService.detectAnomalies(userId);
      res.json({
        success: true,
        data: anomalies,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const forecast = await SpendingForecastService.generateForecast(userId);
      res.json({
        success: true,
        data: forecast,
      });
    } catch (err) {
      next(err);
    }
  }
}
