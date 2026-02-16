'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { IdentityDisplay } from '@/components/identity-display';
import { getDiscoverCirvias, getMyCirvias } from '@/lib/api/cirvias';

export default function CirviasPage() {
  const [tab, setTab] = useState<'my' | 'discover'>('my');
  const myQuery = useQuery({ queryKey: ['cirvias', 'my'], queryFn: getMyCirvias });
  const discoverQuery = useQuery({ queryKey: ['cirvias', 'discover'], queryFn: getDiscoverCirvias });

  const cirvias = tab === 'my' ? myQuery.data : discoverQuery.data;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Cirvias</h1>
        <Link href="/cirvias/new" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
          Create Cirvia
        </Link>
      </div>

      <div className="flex gap-2">
        <button
          className={`rounded-md px-4 py-2 text-sm ${tab === 'my' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          onClick={() => setTab('my')}
          type="button"
        >
          My Cirvias
        </button>
        <button
          className={`rounded-md px-4 py-2 text-sm ${tab === 'discover' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          onClick={() => setTab('discover')}
          type="button"
        >
          Discover
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cirvias?.map((cirvia) => (
          <Link key={cirvia.id} href={`/cirvias/${cirvia.id}`} className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">{cirvia.name}</h2>
            <p className="mt-1 text-sm text-slate-600">{cirvia.description}</p>
            <p className="mt-3 text-sm text-slate-500">Members: {cirvia.memberCount}</p>
            <div className="mt-3">
              <IdentityDisplay identity={cirvia.resolvedIdentity} />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
