'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { verifyEmail } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth-store';

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const token = searchParams.get('token');

  const mutation = useMutation({
    mutationFn: (verifyToken: string) => verifyEmail(verifyToken),
    onSuccess: (data) => {
      setSession(data);
      toast.success('Email verified');
      router.replace('/cirvias');
    },
    onError: () => toast.error('Verification failed')
  });

  useEffect(() => {
    if (token) {
      mutation.mutate(token);
    }
  }, [mutation, token]);

  return (
    <main className="mx-auto max-w-md px-4 py-12 text-center">
      <h1 className="text-2xl font-semibold">Verifying your email</h1>
      <p className="mt-2 text-slate-600">Please wait while we verify your token.</p>
    </main>
  );
}
