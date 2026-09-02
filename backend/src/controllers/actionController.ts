import { Request, Response } from 'express';
import { RecommendationEngine } from '../services/action/recommendationEngine.js';

export class ActionController {
  static async getActions(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const actions = await RecommendationEngine.getActions(userId);
      res.json({ status: 'success', data: actions });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }
}
