import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { env } from '@/lib/env';

const publicPaths = [
  '/',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
  '/auth/verify',
  '/auth/callback'
];

const isPublicPath = (pathname: string) =>
  publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const middleware = async (request: NextRequest) => {
  let response = NextResponse.next({
    request
  });

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    if (user && user.email_confirmed_at && (pathname === '/auth/sign-in' || pathname === '/auth/sign-up')) {
      const url = request.nextUrl.clone();
      url.pathname = '/app';
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/sign-in';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  if (!user.email_confirmed_at && pathname !== '/auth/verify') {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/verify';
    return NextResponse.redirect(url);
  }

  return response;
};

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
