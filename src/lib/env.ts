import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url()
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
});

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  const message = Object.entries(formatted)
    .map(([key, value]) => `${key}: ${value?.join(', ')}`)
    .join('\n');
  throw new Error(`Missing or invalid environment variables:\n${message}`);
}

export const env = parsed.data;
