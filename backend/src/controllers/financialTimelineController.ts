import { Request, Response } from 'express';
import { FinancialTimelineService } from '../services/financialTimelineService.js';

export class FinancialTimelineController {
  static async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const timeline = await FinancialTimelineService.getTimeline(userId);
      res.json({ status: 'success', data: timeline });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
}
