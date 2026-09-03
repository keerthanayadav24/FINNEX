import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedUser {
  id: string;
  authProviderId: string;
  email: string;
  name: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let authIdentity: string | null = null;

    // Check Authorization Bearer header or x-user-id / x-dev-user-id header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authIdentity = authHeader.substring(7).trim();
    } else if (req.headers['x-user-id'] && typeof req.headers['x-user-id'] === 'string') {
      authIdentity = req.headers['x-user-id'].trim();
    } else if (req.headers['x-dev-user-id'] && typeof req.headers['x-dev-user-id'] === 'string') {
      authIdentity = req.headers['x-dev-user-id'].trim();
    }

    if (!authIdentity) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to access FINNEX.',
        },
      });
      return;
    }

    // Resolve internal PostgreSQL User Record
    // 1. Search by User ID, authProviderId, or email
    let internalUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: authIdentity },
          { authProviderId: authIdentity },
          { email: authIdentity.toLowerCase() },
        ],
      },
    });

    // 2. Fallback check for Rohan demo account
    if (!internalUser && (authIdentity === 'dev_user_demo_123' || authIdentity.toLowerCase() === 'rohan@finnex.app')) {
      internalUser = await prisma.user.findFirst({
        where: { email: 'rohan@finnex.app' },
      });
    }

    // 3. Auto-provision user record for new signups
    if (!internalUser) {
      const isEmail = authIdentity.includes('@');
      const email = isEmail ? authIdentity.toLowerCase() : `${authIdentity}@user.finnex.app`;
      const name = isEmail ? authIdentity.split('@')[0] : 'FINNEX User';

      internalUser = await prisma.user.create({
        data: {
          authProviderId: authIdentity,
          email,
          name,
        },
      });
    }

    req.user = {
      id: internalUser.id,
      authProviderId: internalUser.authProviderId,
      email: internalUser.email,
      name: internalUser.name,
    };

    next();
  } catch (error) {
    console.error('Auth middleware failure:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to process authentication',
      },
    });
  }
};
