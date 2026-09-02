import { Router, Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    // Ping PostgreSQL via Prisma query
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      success: true,
      data: {
        status: 'UP',
        service: 'FINNEX Core Backend API',
        database: 'Connected (PostgreSQL 18)',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Database connection failed',
      },
    });
  }
});

export default router;
