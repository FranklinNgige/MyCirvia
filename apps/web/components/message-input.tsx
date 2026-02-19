'use client';

import { useCallback, useMemo, useState } from 'react';
import { useChatSocket } from '@/lib/socket/chat-socket';

interface Props {
  chatId: string;
  onSend: (text: string, clientId: string) => void;
}

export function MessageInput({ chatId, onSend }: Props) {
  const socket = useChatSocket();
  const [text, setText] = useState('');

  const emitTyping = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return () => {
      if (!socket) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        socket.emit('typing-indicator', { chatId });
      }, 300);
    };
  }, [chatId, socket]);

  const submit = useCallback(() => {
    const value = text.trim();
    if (!value) return;

    const clientId = crypto.randomUUID();
    onSend(value, clientId);
    socket?.emit('send-message', { chatId, text: value, clientId });
    setText('');
  }, [chatId, onSend, socket, text]);

  return (
    <div className="border-t border-slate-200 bg-white p-3">
      <div className="flex items-end gap-2">
        <button type="button" className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600" aria-label="Upload media">
          📎
        </button>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            emitTyping();
          }}
          rows={2}
          placeholder="Type a message"
          className="min-h-[44px] flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-200 focus:ring"
        />
        <button
          type="button"
          onClick={submit}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          disabled={!text.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
