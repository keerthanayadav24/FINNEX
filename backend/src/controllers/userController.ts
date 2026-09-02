import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/userService.js';

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const user = await UserService.getUserProfile(userId);
      res.json({
        success: true,
        data: user,
      });
    } catch (err) {
      next(err);
    }
  }
}
