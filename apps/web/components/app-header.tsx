'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth-store';

export function AppHeader() {
  const router = useRouter();
  const { user, clearSession } = useAuthStore();

  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/cirvias" className="text-lg font-semibold text-indigo-700">
            MyCirvia
          </Link>
          <Link href="/chats" className="text-sm font-medium text-slate-700 hover:text-indigo-700">
            Chats
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600">
            🔔
          </button>
          <div className="text-right text-xs text-slate-500">
            <div className="font-semibold text-slate-700">{user?.email ?? 'Account'}</div>
            <button type="button" className="text-rose-600" onClick={logout}>
              Log out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
