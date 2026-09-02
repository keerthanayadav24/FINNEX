import { Request, Response } from 'express';
import { FinancialHealthService } from '../services/financialHealthService.js';
import { RunwayService } from '../services/runwayService.js';

export class FinancialHealthController {
  static async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const health = await FinancialHealthService.calculateHealth(userId);
      res.json({ status: 'success', data: health });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  static async getRunway(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const runway = await RunwayService.calculateRunway(userId);
      res.json({ status: 'success', data: runway });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
}
