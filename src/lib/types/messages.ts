export type IdentityScopeType = "direct" | "cirvia";

export type IdentitySnapshot = {
  displayName: string;
  displayAvatarUrl: string | null;
  identityLevel: "anonymous" | "partial" | "full";
};

export type ChatThread = {
  id: string;
  participantA: string;
  participantB: string;
  status: "pending" | "active" | "blocked";
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
};

export type MessageRow = {
  id: string;
  chatId: string | null;
  cirviaId: string | null;
  senderId: string;
  content: string;
  createdAt: string;
  displayName: string;
  displayAvatarUrl: string | null;
  displayIdentityLevel: "anonymous" | "partial" | "full";
  isSystem: boolean;
};

export type PaginatedMessages = {
  messages: MessageRow[];
  nextCursor: string | null;
};
