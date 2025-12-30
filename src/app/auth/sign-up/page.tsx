import Link from 'next/link';

import { signUp } from '@/app/auth/actions';

type SignUpPageProps = {
  searchParams: { error?: string };
};

const errorCopy: Record<string, string> = {
  missing_fields: 'Please provide an email and password.',
  rate_limited: 'Too many attempts. Please wait and try again.',
  unable_to_sign_up: 'We could not create your account. Please try again.'
};

const SignUpPage = ({ searchParams }: SignUpPageProps) => (
  <>
    <h1>Create your account</h1>
    <p>Use your email and a strong password.</p>
    {searchParams.error && <div className="notice">{errorCopy[searchParams.error]}</div>}
    <form action={signUp}>
      <input name="email" type="email" placeholder="you@example.com" required />
      <input name="password" type="password" placeholder="Create a password" required />
      <button type="submit">Sign up</button>
    </form>
    <div className="auth-links">
      <Link href="/auth/sign-in">Already have an account?</Link>
    </div>
  </>
);

export default SignUpPage;
