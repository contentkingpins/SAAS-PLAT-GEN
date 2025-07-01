import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_URL: z.string().url().optional(),
  
  // UPS Integration Variables
  UPS_WEBHOOK_CREDENTIAL: z.string().min(32, 'UPS_WEBHOOK_CREDENTIAL must be at least 32 characters'),
  UPS_ACCESS_KEY: z.string().min(1, 'UPS_ACCESS_KEY is required for UPS API'),
  UPS_USERNAME: z.string().min(1, 'UPS_USERNAME is required for UPS API'),
  UPS_PASSWORD: z.string().min(1, 'UPS_PASSWORD is required for UPS API'),
  UPS_ACCOUNT_NUMBER: z.string().min(1, 'UPS_ACCOUNT_NUMBER is required (J22653)'),
});

export function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Environment validation failed');
    }
    throw error;
  }
}

export const env = validateEnv(); 