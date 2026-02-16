'use client';

import type { ReactNode } from 'react';
import { AppHeader } from '@/components/app-header';
import { ProtectedRoute } from '@/components/protected-route';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
