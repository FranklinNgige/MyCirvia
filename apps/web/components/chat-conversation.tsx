'use client';

import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getChatMessages, getMyChats, getUserPreferences } from '@/lib/api/chats';
import { useAuthStore } from '@/lib/store/auth-store';
import { useChatSocket } from '@/lib/socket/chat-socket';
import type { ChatMessage } from '@/lib/types/chat';
import { MessageInput } from './message-input';
import { RevealControls } from './reveal-controls';

function avatar(name: string, avatarUrl?: string | null) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className="h-8 w-8 rounded-full object-cover" />;
  }
  return <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{initials}</div>;
}

export function ChatConversation({ chatId }: { chatId: string }) {
  const socket = useChatSocket();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [typingText, setTypingText] = useState<string>('');
  const [optimistic, setOptimistic] = useState<ChatMessage[]>([]);

  const { data: chats } = useQuery({ queryKey: ['my-chats'], queryFn: getMyChats });
  const chat = chats?.find((item) => item.id === chatId);
  const { data: prefs } = useQuery({ queryKey: ['my-preferences'], queryFn: getUserPreferences, retry: false });

  const messagesQuery = useInfiniteQuery({
    queryKey: ['chat-messages', chatId],
    queryFn: ({ pageParam }) => getChatMessages(chatId, pageParam as string | null | undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor
  });

  const messages = useMemo(() => {
    const server = messagesQuery.data?.pages.flatMap((page) => page.items).reverse() ?? [];
    return [...server, ...optimistic];
  }, [messagesQuery.data?.pages, optimistic]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-chat', { chatId });

    const onNewMessage = (message: ChatMessage) => {
      if (message.chatId !== chatId) return;
      setOptimistic((prev) => prev.filter((item) => item.clientId !== message.clientId));
      queryClient.setQueryData(['chat-messages', chatId], (current: any) => {
        if (!current?.pages?.length) return current;
        current.pages[0].items.push(message);
        return { ...current };
      });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
      if (prefs?.lockScreenMessagePreview === false) {
        toast('New message');
      } else {
        toast.success(`New message: ${message.text.slice(0, 50)}`);
      }
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };

    const onMessageDeleted = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
    };

    const onTyping = (payload: { chatId: string; displayName: string }) => {
      if (payload.chatId !== chatId) return;
      setTypingText(`${payload.displayName} is typing...`);
      setTimeout(() => setTypingText(''), 1500);
    };

    const onIdentityChanged = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', chatId] });
      queryClient.invalidateQueries({ queryKey: ['my-chats'] });
      toast('Identity visibility updated');
    };

    socket.on('new-message', onNewMessage);
    socket.on('message-deleted', onMessageDeleted);
    socket.on('user-typing', onTyping);
    socket.on('identity-revealed', onIdentityChanged);
    socket.on('identity-revoked', onIdentityChanged);

    return () => {
      socket.emit('leave-chat', { chatId });
      socket.off('new-message', onNewMessage);
      socket.off('message-deleted', onMessageDeleted);
      socket.off('user-typing', onTyping);
      socket.off('identity-revealed', onIdentityChanged);
      socket.off('identity-revoked', onIdentityChanged);
    };
  }, [chatId, prefs?.lockScreenMessagePreview, queryClient, socket]);

  const onSend = (text: string, clientId: string) => {
    if (!user) return;
    setOptimistic((prev) => [
      ...prev,
      {
        id: clientId,
        clientId,
        chatId,
        text,
        createdAt: new Date().toISOString(),
        senderUserId: user.id,
        senderIdentity: { displayName: 'You', avatarUrl: null },
        status: 'sending',
        mediaUrls: []
      }
    ]);
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  };

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {chat?.participants.map((participant) => participant.identity.displayName).join(', ') ?? 'Conversation'}
          </h2>
          {typingText ? <p className="text-xs text-indigo-600">{typingText}</p> : null}
        </div>
        {chat?.type === 'ONE_TO_ONE' ? <RevealControls chatId={chatId} /> : null}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto p-4"
        onScroll={(event) => {
          const target = event.currentTarget;
          if (target.scrollTop < 80 && messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
            messagesQuery.fetchNextPage();
          }
        }}
      >
        {messages.map((message) => {
          const own = message.senderUserId === user?.id || message.senderIdentity.displayName === 'You';
          return (
            <div key={message.id} className={`flex ${own ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${own ? 'bg-indigo-600 text-white' : 'bg-white text-slate-900'}`}>
                <div className="mb-1 flex items-center gap-2 text-xs opacity-85">
                  {!own ? avatar(message.senderIdentity.displayName, message.senderIdentity.avatarUrl) : null}
                  <span>{message.senderIdentity.displayName}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                {message.mediaUrls?.length ? <p className="mt-1 text-xs">{message.mediaUrls.join(', ')}</p> : null}
                <p className="mt-1 text-right text-[11px] opacity-70">
                  {new Date(message.createdAt).toLocaleTimeString()} {message.status === 'sending' ? '• sending' : ''}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <MessageInput chatId={chatId} onSend={onSend} />
    </div>
  );
}
