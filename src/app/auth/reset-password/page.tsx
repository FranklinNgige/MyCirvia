import Link from 'next/link';

import { requestPasswordReset } from '@/app/auth/actions';

type ResetPasswordPageProps = {
  searchParams: { status?: string };
};

const statusCopy: Record<string, string> = {
  sent: 'If that email exists, a reset link has been sent.',
  rate_limited: 'Too many requests. Please wait before trying again.'
};

const ResetPasswordPage = ({ searchParams }: ResetPasswordPageProps) => (
  <>
    <h1>Reset your password</h1>
    <p>Enter your email to receive a reset link.</p>
    {searchParams.status && <div className="notice">{statusCopy[searchParams.status]}</div>}
    <form action={requestPasswordReset}>
      <input name="email" type="email" placeholder="you@example.com" required />
      <button type="submit">Send reset link</button>
    </form>
    <div className="auth-links">
      <Link href="/auth/sign-in">Back to sign in</Link>
    </div>
  </>
);

export default ResetPasswordPage;
