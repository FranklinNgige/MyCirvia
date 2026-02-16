'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { IdentityDisplay } from '@/components/identity-display';
import { createInviteLink, getCirviaDetail } from '@/lib/api/cirvias';

export default function CirviaDetailPage() {
  const params = useParams<{ id: string }>();
  const cirviaId = params.id;
  const detailQuery = useQuery({ queryKey: ['cirvia', cirviaId], queryFn: () => getCirviaDetail(cirviaId) });

  const inviteMutation = useMutation({
    mutationFn: () => createInviteLink(cirviaId),
    onSuccess: ({ inviteLink }) => {
      navigator.clipboard.writeText(inviteLink).catch(() => undefined);
      toast.success('Invite link generated and copied');
    }
  });

  if (detailQuery.isLoading) {
    return <p>Loading...</p>;
  }

  if (!detailQuery.data) {
    return <p>Cirvia not found.</p>;
  }

  const cirvia = detailQuery.data;

  return (
    <section className="space-y-6">
      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{cirvia.name}</h1>
            <p className="mt-2 text-sm text-slate-600">{cirvia.description}</p>
          </div>
          <button
            type="button"
            onClick={() => inviteMutation.mutate()}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Invite
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Members</h2>
        <div className="space-y-3">
          {cirvia.members.map((member) => (
            <IdentityDisplay key={member.id} identity={member.resolvedIdentity} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-dashed bg-white p-5">
        <h2 className="text-lg font-semibold">Feed</h2>
        <p className="mt-2 text-sm text-slate-500">Feed placeholder for next phase.</p>
      </div>
    </section>
  );
}
