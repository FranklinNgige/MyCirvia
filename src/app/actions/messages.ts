"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ChatThread,
  IdentityScopeType,
  MessageRow,
  PaginatedMessages,
} from "@/lib/types/messages";
import { getDisplayIdentitySnapshot } from "@/lib/identity/getDisplayIdentitySnapshot";

const MESSAGE_PAGE_SIZE = 30;

const requireUser = async () => {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { supabase, user };
};

export const getOrCreateChat = async (participantId: string) => {
  const { supabase, user } = await requireUser();

  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id, participant_a, participant_b, status")
    .or(
      `and(participant_a.eq.${user.id},participant_b.eq.${participantId}),and(participant_a.eq.${participantId},participant_b.eq.${user.id})`
    )
    .maybeSingle();

  if (existing?.id) {
    return existing.id as string;
  }

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      participant_a: user.id,
      participant_b: participantId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Unable to create chat: ${error.message}`);
  }

  return data.id as string;
};

export const listChatsForUser = async (): Promise<ChatThread[]> => {
  const { supabase, user } = await requireUser();

  const { data, error } = await supabase
    .from("chat_threads")
    .select(
      "id, participant_a, participant_b, status, last_message_at, last_message_preview"
    )
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load chats: ${error.message}`);
  }

  return (
    data?.map((row) => ({
      id: row.id,
      participantA: row.participant_a,
      participantB: row.participant_b,
      status: row.status,
      lastMessageAt: row.last_message_at,
      lastMessagePreview: row.last_message_preview,
    })) ?? []
  );
};

export const listMessagesForChat = async (
  chatId: string,
  cursor?: string | null
): Promise<PaginatedMessages> => {
  const { supabase } = await requireUser();

  let query = supabase
    .from("messages")
    .select(
      "id, chat_id, cirvia_id, sender_id, content, created_at, display_name, display_avatar_url, display_identity_level, is_system"
    )
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load messages: ${error.message}`);
  }

  const messages =
    data?.map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      cirviaId: row.cirvia_id,
      senderId: row.sender_id,
      content: row.content,
      createdAt: row.created_at,
      displayName: row.display_name,
      displayAvatarUrl: row.display_avatar_url,
      displayIdentityLevel: row.display_identity_level,
      isSystem: row.is_system,
    })) ?? [];

  const nextCursor =
    messages.length === MESSAGE_PAGE_SIZE
      ? messages[messages.length - 1].createdAt
      : null;

  return { messages, nextCursor };
};

export const sendMessageToChat = async (formData: FormData) => {
  const chatId = formData.get("chatId")?.toString();
  const content = formData.get("content")?.toString().trim();

  if (!chatId || !content) {
    throw new Error("Missing chatId or content");
  }

  const { supabase, user } = await requireUser();

  const snapshot = await getDisplayIdentitySnapshot({
    userId: user.id,
    scopeType: "direct",
    scopeId: chatId,
  });

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: user.id,
    content,
    display_name: snapshot.displayName,
    display_avatar_url: snapshot.displayAvatarUrl,
    display_identity_level: snapshot.identityLevel,
    is_system: false,
  });

  if (error) {
    throw new Error(`Unable to send message: ${error.message}`);
  }
};

export const listCirviaMessages = async (
  cirviaId: string,
  cursor?: string | null
): Promise<PaginatedMessages> => {
  const { supabase } = await requireUser();

  let query = supabase
    .from("messages")
    .select(
      "id, chat_id, cirvia_id, sender_id, content, created_at, display_name, display_avatar_url, display_identity_level, is_system"
    )
    .eq("cirvia_id", cirviaId)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_PAGE_SIZE);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load cirvia messages: ${error.message}`);
  }

  const messages =
    data?.map((row) => ({
      id: row.id,
      chatId: row.chat_id,
      cirviaId: row.cirvia_id,
      senderId: row.sender_id,
      content: row.content,
      createdAt: row.created_at,
      displayName: row.display_name,
      displayAvatarUrl: row.display_avatar_url,
      displayIdentityLevel: row.display_identity_level,
      isSystem: row.is_system,
    })) ?? [];

  const nextCursor =
    messages.length === MESSAGE_PAGE_SIZE
      ? messages[messages.length - 1].createdAt
      : null;

  return { messages, nextCursor };
};

export const sendMessageToCirvia = async (formData: FormData) => {
  const cirviaId = formData.get("cirviaId")?.toString();
  const content = formData.get("content")?.toString().trim();

  if (!cirviaId || !content) {
    throw new Error("Missing cirviaId or content");
  }

  const { supabase, user } = await requireUser();

  const snapshot = await getDisplayIdentitySnapshot({
    userId: user.id,
    scopeType: "cirvia",
    scopeId: cirviaId,
  });

  const { error } = await supabase.from("messages").insert({
    cirvia_id: cirviaId,
    sender_id: user.id,
    content,
    display_name: snapshot.displayName,
    display_avatar_url: snapshot.displayAvatarUrl,
    display_identity_level: snapshot.identityLevel,
    is_system: false,
  });

  if (error) {
    throw new Error(`Unable to send cirvia message: ${error.message}`);
  }
};

export const reportMessage = async (formData: FormData) => {
  const messageId = formData.get("messageId")?.toString();
  const reason = formData.get("reason")?.toString().trim();
  const context = formData.get("context")?.toString().trim() ?? null;

  if (!messageId || !reason) {
    throw new Error("Missing messageId or reason");
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    message_id: messageId,
    reason,
    context,
  });

  if (error) {
    throw new Error(`Unable to report message: ${error.message}`);
  }
};

export const deleteOwnMessage = async (formData: FormData) => {
  const messageId = formData.get("messageId")?.toString();

  if (!messageId) {
    throw new Error("Missing messageId");
  }

  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);

  if (error) {
    throw new Error(`Unable to delete message: ${error.message}`);
  }
};

export const acceptChatRequest = async (chatId: string) => {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("chat_threads")
    .update({ status: "active" })
    .eq("id", chatId)
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);

  if (error) {
    throw new Error(`Unable to accept chat: ${error.message}`);
  }
};
