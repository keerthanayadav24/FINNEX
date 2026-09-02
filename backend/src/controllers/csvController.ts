import { Request, Response, NextFunction } from 'express';
import { CsvService } from '../services/csvService.js';
import { AppError } from '../middleware/errorHandler.js';

export class CsvController {
  static async previewCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { accountId, csvContent } = req.body;

      if (!accountId || typeof accountId !== 'string') {
        throw new AppError('accountId is required', 400, 'BAD_REQUEST');
      }

      if (!csvContent || typeof csvContent !== 'string') {
        throw new AppError('csvContent string is required', 400, 'BAD_REQUEST');
      }

      const preview = await CsvService.previewCsv(userId, accountId, csvContent);
      res.json({
        success: true,
        data: preview,
      });
    } catch (err) {
      next(err);
    }
  }

  static async confirmImport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { accountId, importToken } = req.body;

      if (!accountId || typeof accountId !== 'string') {
        throw new AppError('accountId is required', 400, 'BAD_REQUEST');
      }

      if (!importToken || typeof importToken !== 'string') {
        throw new AppError('importToken is required', 400, 'BAD_REQUEST');
      }

      const result = await CsvService.confirmCsvImport(userId, accountId, importToken);
      res.json({
        success: true,
        data: result,
        message: `Successfully imported ${result.importedCount} transactions.`,
      });
    } catch (err) {
      next(err);
    }
  }
}
