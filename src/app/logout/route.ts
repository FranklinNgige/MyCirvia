import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const GET = async (request: Request) => {
  const supabase = createClient();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);

  return NextResponse.redirect(`${origin}/auth/sign-in`);
};
