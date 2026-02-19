'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { getMyChats } from '@/lib/api/chats';
import type { ChatSummary } from '@/lib/types/chat';

function participantNames(chat: ChatSummary): string {
  return chat.participants.map((participant) => participant.identity.displayName).join(', ');
}

function InitialAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  }

  return <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{initials}</div>;
}

export function ChatList() {
  const { data, isLoading } = useQuery({ queryKey: ['my-chats'], queryFn: getMyChats });

  if (isLoading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading chats...</div>;
  }

  if (!data?.length) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">No chats yet.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {data.map((chat) => (
        <Link
          key={chat.id}
          href={`/chats/${chat.id}`}
          className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 transition hover:bg-slate-50"
        >
          <div className="flex min-w-0 flex-1 gap-3">
            <div className="flex -space-x-2">
              {chat.participants.slice(0, 2).map((participant) => (
                <InitialAvatar
                  key={participant.userId}
                  name={participant.identity.displayName}
                  avatarUrl={participant.identity.avatarUrl}
                />
              ))}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{participantNames(chat)}</p>
              <p className="truncate text-sm text-slate-600">{chat.lastMessage?.text?.slice(0, 50) ?? 'No messages yet'}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-500">{new Date(chat.updatedAt).toLocaleTimeString()}</span>
            {chat.unreadCount > 0 ? (
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">{chat.unreadCount}</span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
