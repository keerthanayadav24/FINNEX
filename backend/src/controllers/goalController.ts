import { Request, Response } from 'express';
import { GoalService } from '../services/goalService.js';

export class GoalController {
  static async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const goals = await GoalService.getGoals(userId);
      res.json({ status: 'success', data: goals });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  static async getGoalById(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const goal = await GoalService.getGoalById(userId, id);
      if (!goal) {
        res.status(404).json({ status: 'error', message: 'Goal not found' });
        return;
      }
      res.json({ status: 'success', data: goal });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  }

  static async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const goal = await GoalService.createGoal(userId, req.body);
      res.status(201).json({ status: 'success', data: goal });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const goal = await GoalService.updateGoal(userId, id, req.body);
      res.json({ status: 'success', data: goal });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      await GoalService.deleteGoal(userId, id);
      res.json({ status: 'success', message: 'Goal deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async addContribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const contrib = await GoalService.addContribution(userId, id, req.body);
      res.status(201).json({ status: 'success', data: contrib });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async updateContribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const contributionId = req.params.contributionId as string;
      const contrib = await GoalService.updateContribution(userId, id, contributionId, req.body);
      res.json({ status: 'success', data: contrib });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }

  static async deleteContribution(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const id = req.params.id as string;
      const contributionId = req.params.contributionId as string;
      await GoalService.deleteContribution(userId, id, contributionId);
      res.json({ status: 'success', message: 'Contribution deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ status: 'error', message: err.message });
    }
  }
}
