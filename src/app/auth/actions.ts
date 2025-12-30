'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { env } from '@/lib/env';
import { rateLimit } from '@/lib/rate-limit';
import { createClient } from '@/lib/supabase/server';

const getClientKey = () => {
  const forwardedFor = headers().get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
};

export const signUp = async (formData: FormData) => {
  const limit = rateLimit(`signup:${getClientKey()}`);
  if (!limit.allowed) {
    redirect('/auth/sign-up?error=rate_limited');
  }

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    redirect('/auth/sign-up?error=missing_fields');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/verify`
    }
  });

  if (error) {
    redirect('/auth/sign-up?error=unable_to_sign_up');
  }

  redirect('/auth/verify?status=check_email');
};

export const signIn = async (formData: FormData) => {
  const limit = rateLimit(`signin:${getClientKey()}`);
  if (!limit.allowed) {
    redirect('/auth/sign-in?error=rate_limited');
  }

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    redirect('/auth/sign-in?error=missing_fields');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirect('/auth/sign-in?error=invalid_credentials');
  }

  redirect('/onboarding');
};

export const requestPasswordReset = async (formData: FormData) => {
  const limit = rateLimit(`reset:${getClientKey()}`);
  if (!limit.allowed) {
    redirect('/auth/reset-password?status=rate_limited');
  }

  const email = String(formData.get('email') || '').trim();

  const supabase = createClient();
  if (email) {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/reset-password/confirm`
    });
  }

  redirect('/auth/reset-password?status=sent');
};

export const resendVerification = async () => {
  const limit = rateLimit(`resend:${getClientKey()}`);
  if (!limit.allowed) {
    redirect('/auth/verify?status=rate_limited');
  }

  const supabase = createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user?.email) {
    redirect('/auth/sign-in');
  }

  await supabase.auth.resend({
    type: 'signup',
    email: data.user.email,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/verify`
    }
  });

  redirect('/auth/verify?status=resent');
};

export const confirmPasswordReset = async (formData: FormData) => {
  const limit = rateLimit(`reset_confirm:${getClientKey()}`);
  if (!limit.allowed) {
    redirect('/auth/reset-password/confirm?error=rate_limited');
  }

  const password = String(formData.get('password') || '').trim();
  if (!password) {
    redirect('/auth/reset-password/confirm?error=missing_fields');
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect('/auth/reset-password/confirm?error=unable_to_reset');
  }

  redirect('/auth/sign-in?status=password_updated');
};
