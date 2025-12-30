import Link from 'next/link';

import { confirmPasswordReset } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';

type ConfirmResetPageProps = {
  searchParams: { error?: string };
};

const errorCopy: Record<string, string> = {
  missing_fields: 'Please enter a new password.',
  rate_limited: 'Too many requests. Please wait before trying again.',
  unable_to_reset: 'We could not update your password. Please request a new link.'
};

const ConfirmResetPage = async ({ searchParams }: ConfirmResetPageProps) => {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  return (
    <>
      <h1>Set a new password</h1>
      <p>Choose a fresh password for your account.</p>
      {searchParams.error && <div className="notice">{errorCopy[searchParams.error]}</div>}
      {!user ? (
        <div className="notice">
          Reset links are time-limited. Please request another password reset email.
        </div>
      ) : (
        <form action={confirmPasswordReset}>
          <input name="password" type="password" placeholder="New password" required />
          <button type="submit">Update password</button>
        </form>
      )}
      <div className="auth-links">
        <Link href="/auth/sign-in">Back to sign in</Link>
      </div>
    </>
  );
};

export default ConfirmResetPage;
