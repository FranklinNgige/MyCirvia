import { redirect } from 'next/navigation';

import { requireVerifiedUser } from '@/lib/auth';
import { completeOnboarding, getOnboardingState } from '@/lib/onboarding';

const OnboardingPage = async () => {
  const user = await requireVerifiedUser();
  const { hasProfile, hasIdentityTemplate } = await getOnboardingState(user.id);

  if (hasProfile && hasIdentityTemplate) {
    redirect('/app');
  }

  const handleOnboarding = async () => {
    'use server';
    await completeOnboarding(user.id, user.email);
    redirect('/app');
  };

  return (
    <div className="auth-card">
      <h1>Welcome to MyCirvia</h1>
      <p>We will create your anonymous profile and default identity template.</p>
      <form action={handleOnboarding}>
        <button type="submit">Finish setup</button>
      </form>
    </div>
  );
};

export default OnboardingPage;
