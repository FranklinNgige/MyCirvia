import Link from 'next/link';

import { resendVerification } from '@/app/auth/actions';
import { getUser } from '@/lib/auth';

type VerifyPageProps = {
  searchParams: { status?: string };
};

const statusCopy: Record<string, string> = {
  check_email: 'Check your email for a verification link.',
  resent: 'Verification email sent again.',
  rate_limited: 'Too many requests. Please wait before retrying.'
};

const VerifyPage = async ({ searchParams }: VerifyPageProps) => {
  const user = await getUser();
  const verified = Boolean(user?.email_confirmed_at);

  return (
    <>
      <h1>Verify your email</h1>
      <p>{verified ? 'Your email is verified.' : 'You must verify your email to continue.'}</p>
      {searchParams.status && <div className="notice">{statusCopy[searchParams.status]}</div>}
      {verified ? (
        <div className="auth-links">
          <Link href="/app">Continue to app</Link>
        </div>
      ) : (
        <form action={resendVerification}>
          <button type="submit">Resend verification email</button>
        </form>
      )}
      <div className="auth-links">
        <Link href="/auth/sign-in">Back to sign in</Link>
      </div>
    </>
  );
};

export default VerifyPage;
