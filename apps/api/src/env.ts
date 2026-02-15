import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://mycirvia:mycirvia@localhost:5432/mycirvia?schema=public'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  AWS_ENDPOINT: z.string().url().default('http://localhost:4566')
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
