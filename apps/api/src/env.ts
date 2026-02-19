import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://mycirvia:mycirvia@localhost:5432/mycirvia?schema=public'),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_URL: z.string().url().optional(),
  AWS_ENDPOINT: z.string().url().default('http://localhost:4566')
});

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.parse(process.env);

export const env: Env = {
  ...parsedEnv,
  REDIS_URL: parsedEnv.REDIS_URL ?? `redis://${parsedEnv.REDIS_HOST}:${parsedEnv.REDIS_PORT}`,
};
