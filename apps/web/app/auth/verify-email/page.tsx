import { Suspense } from 'react';
import VerifyEmailClient from './verify-email-client';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-md px-4 py-12 text-center">Loading...</main>}>
      <VerifyEmailClient />
    </Suspense>
  );
}
