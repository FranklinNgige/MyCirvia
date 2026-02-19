import type { ResolvedIdentityDTO } from '@/lib/types';

export interface ChatParticipant {
  userId: string;
  identity: ResolvedIdentityDTO;
}

export interface ChatSummary {
  id: string;
  type: 'ONE_TO_ONE' | 'GROUP';
  participants: ChatParticipant[];
  lastMessage?: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderUserId: string;
  senderIdentity: ResolvedIdentityDTO;
  text: string;
  mediaUrls?: string[];
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
  clientId?: string;
}

export interface PaginatedMessages {
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface RevealStatusResponse {
  status: string;
  otherUserIdentity: ResolvedIdentityDTO;
}

export interface UserPreferences {
  lockScreenMessagePreview: boolean;
}
