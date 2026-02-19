'use client';

import { apiClient } from '@/lib/api/client';
import type { ChatSummary, PaginatedMessages, RevealStatusResponse, UserPreferences } from '@/lib/types/chat';

export async function getMyChats(): Promise<ChatSummary[]> {
  const { data } = await apiClient.get('/chats/my');
  return data;
}

export async function getChatMessages(chatId: string, cursor?: string | null): Promise<PaginatedMessages> {
  const params = new URLSearchParams();
  params.set('limit', '30');
  if (cursor) params.set('cursor', cursor);
  const { data } = await apiClient.get(`/chats/${chatId}/messages?${params.toString()}`);
  return data;
}

export async function revealIdentity(chatId: string): Promise<RevealStatusResponse> {
  const { data } = await apiClient.post(`/chats/${chatId}/identity/reveal`);
  return data;
}

export async function requestMutualReveal(chatId: string): Promise<RevealStatusResponse> {
  const { data } = await apiClient.post(`/chats/${chatId}/identity/request-mutual`);
  return data;
}

export async function revokeIdentity(chatId: string): Promise<RevealStatusResponse> {
  const { data } = await apiClient.post(`/chats/${chatId}/identity/revoke`);
  return data;
}

export async function getRevealStatus(chatId: string): Promise<RevealStatusResponse> {
  const { data } = await apiClient.get(`/chats/${chatId}/identity/status`);
  return data;
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const { data } = await apiClient.get('/users/me/preferences');
  return data;
}
