"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MessageRow, PaginatedMessages } from "@/lib/types/messages";
import { subscribeToChatMessages } from "@/lib/realtime/subscribeToChatMessages";
import { subscribeToCirviaMessages } from "@/lib/realtime/subscribeToCirviaMessages";
import { MessageItem } from "@/components/messages/MessageItem";
import { ReportMessageButton } from "@/components/messages/ReportMessageButton";

const PAGE_SIZE = 30;

export const MessageThread = ({
  initialMessages,
  initialCursor,
  scope,
  scopeId,
  currentUserId,
}: {
  initialMessages: MessageRow[];
  initialCursor: string | null;
  scope: "chat" | "cirvia";
  scopeId: string;
  currentUserId: string;
  onReportMessage: (formData: FormData) => Promise<void>;
}) => {
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isLoadingMore, startTransition] = useTransition();

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const handleInsert = (message: MessageRow) => {
      setMessages((prev) => {
        if (prev.some((existing) => existing.id === message.id)) {
          return prev;
        }
        return [message, ...prev];
      });
    };

    const unsubscribe =
      scope === "chat"
        ? subscribeToChatMessages(supabase, scopeId, handleInsert)
        : subscribeToCirviaMessages(supabase, scopeId, handleInsert);

    return () => {
      unsubscribe();
    };
  }, [scope, scopeId, supabase]);

  const loadMore = () => {
    if (!cursor) {
      return;
    }

    startTransition(async () => {
      const response = await fetch(
        `/api/messages/${scope}/${scopeId}?cursor=${encodeURIComponent(cursor)}`
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as PaginatedMessages;
      setMessages((prev) => [...prev, ...payload.messages]);
      setCursor(payload.nextCursor);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between text-xs text-neutral-500">
        <span>Showing latest {PAGE_SIZE} messages</span>
        {cursor && (
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="text-neutral-700"
          >
            {isLoadingMore ? "Loading..." : "Load earlier"}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            <MessageItem
              message={message}
              isOwnMessage={message.senderId === currentUserId}
            />
            <ReportMessageButton
              action={onReportMessage}
              messageId={message.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
