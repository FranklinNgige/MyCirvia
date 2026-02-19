'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getRevealStatus, requestMutualReveal, revealIdentity, revokeIdentity } from '@/lib/api/chats';

export function RevealControls({ chatId }: { chatId: string }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['reveal-status', chatId], queryFn: () => getRevealStatus(chatId) });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reveal-status', chatId] });
  };

  const revealMutation = useMutation({ mutationFn: () => revealIdentity(chatId), onSuccess: refresh });
  const requestMutation = useMutation({ mutationFn: () => requestMutualReveal(chatId), onSuccess: refresh });
  const revokeMutation = useMutation({ mutationFn: () => revokeIdentity(chatId), onSuccess: refresh });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">Reveal: {data?.status ?? 'unknown'}</span>
      <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => revealMutation.mutate()}>
        Reveal My Identity
      </button>
      <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={() => requestMutation.mutate()}>
        Request Mutual Reveal
      </button>
      <button type="button" className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-600" onClick={() => revokeMutation.mutate()}>
        Revoke
      </button>
    </div>
  );
}
