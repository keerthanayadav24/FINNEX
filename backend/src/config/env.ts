import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z
  .object({
    DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string URL.'),
    PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    DEV_AUTH_ENABLED: z
      .string()
      .optional()
      .transform((val) => val === 'true'),
    FRONTEND_URL: z.string().optional().default('http://localhost:5173'),
  })
  .transform((data) => {
    // STRICT RULE: In production mode, DEV_AUTH_ENABLED is ALWAYS forced to false
    const isProduction = data.NODE_ENV === 'production';
    return {
      ...data,
      DEV_AUTH_ENABLED: isProduction ? false : Boolean(data.DEV_AUTH_ENABLED),
    };
  })
  .refine(
    (data) => {
      if (data.NODE_ENV === 'production') {
        return Boolean(data.FRONTEND_URL && data.FRONTEND_URL.trim() !== '' && !data.FRONTEND_URL.includes('localhost'));
      }
      return true;
    },
    {
      message: 'FRONTEND_URL environment variable is required and must be set to your live production frontend URL in production mode.',
      path: ['FRONTEND_URL'],
    }
  );

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid backend environment variables:', _env.error.format());
  throw new Error('Invalid backend environment variables');
}

export const env = _env.data;
