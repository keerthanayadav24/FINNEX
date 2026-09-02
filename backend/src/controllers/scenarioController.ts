import { Request, Response } from 'express';
import { ScenarioEngine } from '../services/scenario/scenarioEngine.js';

export class ScenarioController {
  static async simulate(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const result = await ScenarioEngine.simulate(userId, req.body);
      res.json({ status: 'success', data: result });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
