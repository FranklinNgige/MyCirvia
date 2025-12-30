import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export const getUser = async () => {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
};

export const requireUser = async () => {
  const user = await getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  return user;
};

export const requireVerifiedUser = async () => {
  const user = await requireUser();

  if (!user.email_confirmed_at) {
    redirect('/auth/verify');
  }

  return user;
};
