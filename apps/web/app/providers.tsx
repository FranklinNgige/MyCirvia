'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { ChatSocketProvider } from '@/lib/socket/chat-socket';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30000 }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ChatSocketProvider>
        {children}
        <Toaster position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} />
      </ChatSocketProvider>
    </QueryClientProvider>
  );
}
