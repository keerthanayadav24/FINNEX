import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

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
    let authProviderId: string | null = null;
    let email: string | null = null;
    let name: string | null = null;

    // 1. Primary Authentication: Managed Clerk JWT Verification
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (env.CLERK_SECRET_KEY) {
        try {
          const verifiedToken = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
          });
          authProviderId = verifiedToken.sub;
          email = (verifiedToken as any).email || (verifiedToken as any).primary_email_address || (verifiedToken as any).email_addresses?.[0]?.email_address || `${verifiedToken.sub}@clerk.user`;
          name = (verifiedToken as any).name || (verifiedToken as any).first_name || (verifiedToken as any).username || null;
        } catch (jwtErr) {
          res.status(401).json({
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Provided authentication token is invalid or expired.',
            },
          });
          return;
        }
      }
    }

    // 2. Development Fallback Auth Check (ONLY when Clerk token is not present)
    // STRICT RULE: x-dev-user-id is ONLY permitted when NODE_ENV === 'development' AND DEV_AUTH_ENABLED === true
    if (!authProviderId) {
      const devUserIdHeader = req.headers['x-dev-user-id'];
      if (devUserIdHeader && typeof devUserIdHeader === 'string') {
        if (env.NODE_ENV === 'development' && env.DEV_AUTH_ENABLED === true) {
          authProviderId = devUserIdHeader;
          email = `${devUserIdHeader}@dev.finnex.app`;
          name = `Dev User (${devUserIdHeader})`;
        } else {
          res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Development authentication headers are strictly disabled in this environment.',
            },
          });
          return;
        }
      }
    }

    // If no identity could be established
    if (!authProviderId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid authorization token.',
        },
      });
      return;
    }

    // 3. Resolve Internal PostgreSQL User Record
    let internalUser = await prisma.user.findUnique({
      where: { authProviderId },
    });

    // If not found by authProviderId, match by email to link existing user records (e.g. Rohan rohan@finnex.app)
    if (!internalUser && email) {
      const existingByEmail = await prisma.user.findFirst({
        where: { email: email.toLowerCase() },
      });
      if (existingByEmail) {
        internalUser = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { authProviderId },
        });
      }
    }

    // Auto-provision user record on first authenticated request if not existing
    if (!internalUser) {
      const defaultEmail = email || `${authProviderId}@user.finnex.app`;
      const defaultName = name || 'FINNEX User';

      internalUser = await prisma.user.upsert({
        where: { authProviderId },
        update: {},
        create: {
          authProviderId,
          email: defaultEmail,
          name: defaultName,
        },
      });
    }

    // Attach authenticated internal user to Express request object
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
