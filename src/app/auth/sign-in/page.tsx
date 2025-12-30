import Link from 'next/link';

import { signIn } from '@/app/auth/actions';

type SignInPageProps = {
  searchParams: { error?: string; status?: string };
};

const errorCopy: Record<string, string> = {
  missing_fields: 'Please provide your email and password.',
  invalid_credentials: 'We could not sign you in with those credentials.',
  rate_limited: 'Too many attempts. Please wait and try again.'
};

const statusCopy: Record<string, string> = {
  password_updated: 'Password updated. Please sign in with your new password.'
};

const SignInPage = ({ searchParams }: SignInPageProps) => (
  <>
    <h1>Welcome back</h1>
    <p>Sign in to continue.</p>
    {searchParams.error && <div className="notice">{errorCopy[searchParams.error]}</div>}
    {searchParams.status && <div className="notice">{statusCopy[searchParams.status]}</div>}
    <form action={signIn}>
      <input name="email" type="email" placeholder="you@example.com" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign in</button>
    </form>
    <div className="auth-links">
      <Link href="/auth/reset-password">Forgot password?</Link>
      <Link href="/auth/sign-up">Create an account</Link>
    </div>
  </>
);

export default SignInPage;
