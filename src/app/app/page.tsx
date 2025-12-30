import Link from 'next/link';

import { requireVerifiedUser } from '@/lib/auth';
import { getOnboardingState } from '@/lib/onboarding';

const AppPage = async () => {
  const user = await requireVerifiedUser();
  const { hasProfile, hasIdentityTemplate } = await getOnboardingState(user.id);

  if (!hasProfile || !hasIdentityTemplate) {
    return (
      <div className="auth-card">
        <h1>Finish onboarding</h1>
        <p>We still need to initialize your anonymous profile.</p>
        <Link href="/onboarding">Go to onboarding</Link>
      </div>
    );
  }

  return (
    <section>
      <h1>MyCirvia App</h1>
      <p>You are signed in and verified.</p>
      <div className="auth-links">
        <Link href="/logout">Log out</Link>
      </div>
    </section>
  );
};

export default AppPage;
