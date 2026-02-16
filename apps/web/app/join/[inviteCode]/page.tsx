'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getJoinPreview, joinByInvite } from '@/lib/api/cirvias';
import { useAuthStore } from '@/lib/store/auth-store';

export default function JoinPage() {
  const params = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const inviteCode = params.inviteCode;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/register');
    }
  }, [isAuthenticated, router]);

  const previewQuery = useQuery({
    queryKey: ['join-preview', inviteCode],
    queryFn: () => getJoinPreview(inviteCode),
    enabled: isAuthenticated
  });

  const joinMutation = useMutation({
    mutationFn: () => joinByInvite(inviteCode),
    onSuccess: ({ status }) => {
      if (status === 'pending_approval') {
        setMessage('Pending approval');
        return;
      }

      toast.success('Joined cirvia');
      router.push('/cirvias');
    }
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Join Cirvia</h1>
        {previewQuery.data && (
          <>
            <h2 className="mt-4 text-lg font-medium">{previewQuery.data.name}</h2>
            <p className="mt-2 text-sm text-slate-600">{previewQuery.data.description}</p>
            <p className="mt-2 text-sm text-slate-500">Members: {previewQuery.data.memberCount}</p>
            <button
              type="button"
              onClick={() => joinMutation.mutate()}
              className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
            >
              Join
            </button>
          </>
        )}
        {message && <p className="mt-4 rounded bg-amber-50 p-3 text-sm text-amber-700">{message}</p>}
        <Link href="/cirvias" className="mt-4 block text-sm text-indigo-700">
          Back to cirvias
        </Link>
      </div>
    </main>
  );
}
