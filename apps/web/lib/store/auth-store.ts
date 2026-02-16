'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenPair, User } from '@/lib/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setSession: (payload: TokenPair & { user?: User | null }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setSession: ({ accessToken, refreshToken, user }) => {
        set({
          accessToken,
          refreshToken: refreshToken ?? null,
          user: user ?? null,
          isAuthenticated: Boolean(accessToken)
        });
      },
      clearSession: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      }
    }),
    {
      name: 'mycirvia-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);
