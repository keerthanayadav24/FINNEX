import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notificationService.js';

export class NotificationController {
  static async getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const notifications = await NotificationService.getUserNotifications(userId);
      res.json({
        success: true,
        data: notifications,
      });
    } catch (err) {
      next(err);
    }
  }
}
