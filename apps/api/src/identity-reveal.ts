export type ChatType = 'ONE_TO_ONE' | 'GROUP';

export enum RevealStatus {
  NONE = 'NONE',
  ONE_SIDED_A_TO_B = 'ONE_SIDED_A_TO_B',
  ONE_SIDED_B_TO_A = 'ONE_SIDED_B_TO_A',
  MUTUAL_PENDING = 'MUTUAL_PENDING',
  MUTUAL_CONFIRMED = 'MUTUAL_CONFIRMED',
  REVOKED_BY_A = 'REVOKED_BY_A',
  REVOKED_BY_B = 'REVOKED_BY_B',
  REVOKED_MUTUAL = 'REVOKED_MUTUAL'
}

export type Scope = 'GLOBAL_DEFAULT' | 'FULL';

export interface ResolvedIdentityDTO {
  userId: string;
  displayName: string;
  scope: Scope;
}

export interface Chat {
  id: string;
  type: ChatType;
  participantAId: string;
  participantBId: string;
}

export interface ChatIdentityReveal {
  chatId: string;
  fromUserId: string;
  toUserId: string;
  status: RevealStatus;
  initiatedAt: Date;
  confirmedAt: Date | null;
  revokedAt: Date | null;
}

interface EventBus {
  emitToChat(chat: Chat, payload: Record<string, unknown>): void;
}

interface AuditLogger {
  log(action: string, payload: Record<string, unknown>): void;
}

interface Notifier {
  notifyUser(userId: string, payload: Record<string, unknown>): void;
}

export class InMemoryRevealStore {
  private reveals = new Map<string, ChatIdentityReveal>();
  private scopes = new Map<string, Scope>();
  private messages = new Map<string, string[]>();

  private key(chatId: string, fromUserId: string, toUserId: string): string {
    return `${chatId}:${fromUserId}:${toUserId}`;
  }

  getReveal(chatId: string, fromUserId: string, toUserId: string): ChatIdentityReveal | null {
    return this.reveals.get(this.key(chatId, fromUserId, toUserId)) ?? null;
  }

  upsertReveal(reveal: ChatIdentityReveal): ChatIdentityReveal {
    this.reveals.set(this.key(reveal.chatId, reveal.fromUserId, reveal.toUserId), reveal);
    return reveal;
  }

  setScope(chatId: string, viewerUserId: string, scope: Scope): void {
    this.scopes.set(`${chatId}:${viewerUserId}`, scope);
  }

  getScope(chatId: string, viewerUserId: string): Scope {
    return this.scopes.get(`${chatId}:${viewerUserId}`) ?? 'GLOBAL_DEFAULT';
  }

  addMessage(chatId: string, renderedName: string): void {
    const current = this.messages.get(chatId) ?? [];
    current.push(renderedName);
    this.messages.set(chatId, current);
  }

  getMessages(chatId: string): string[] {
    return this.messages.get(chatId) ?? [];
  }
}

export class IdentityResolverService {
  constructor(private readonly store: InMemoryRevealStore) {}

  resolveForChat1to1(chat: Chat, subjectUserId: string, viewerUserId: string): ResolvedIdentityDTO {
    const oneSided = this.store.getReveal(chat.id, subjectUserId, viewerUserId);
    const reverse = this.store.getReveal(chat.id, viewerUserId, subjectUserId);
    const full = this.isFullForViewer(oneSided?.status, reverse?.status, subjectUserId, viewerUserId, chat);

    return {
      userId: subjectUserId,
      displayName: full ? `full:${subjectUserId}` : `anon:${subjectUserId}`,
      scope: full ? 'FULL' : 'GLOBAL_DEFAULT'
    };
  }

  private isFullForViewer(
    directStatus: RevealStatus | undefined,
    reverseStatus: RevealStatus | undefined,
    subjectUserId: string,
    viewerUserId: string,
    chat: Chat
  ): boolean {
    if (directStatus === RevealStatus.ONE_SIDED_A_TO_B || directStatus === RevealStatus.ONE_SIDED_B_TO_A) {
      return true;
    }

    if (directStatus === RevealStatus.MUTUAL_CONFIRMED || reverseStatus === RevealStatus.MUTUAL_CONFIRMED) {
      return true;
    }

    if (
      directStatus === RevealStatus.REVOKED_BY_A ||
      directStatus === RevealStatus.REVOKED_BY_B ||
      directStatus === RevealStatus.REVOKED_MUTUAL
    ) {
      return false;
    }

    if (
      reverseStatus === RevealStatus.REVOKED_BY_A ||
      reverseStatus === RevealStatus.REVOKED_BY_B ||
      reverseStatus === RevealStatus.REVOKED_MUTUAL
    ) {
      return false;
    }

    const isSubjectA = chat.participantAId === subjectUserId;
    const isViewerB = chat.participantBId === viewerUserId;
    if (isSubjectA && isViewerB && directStatus === RevealStatus.MUTUAL_PENDING) {
      return false;
    }

    return false;
  }
}

export class ChatRevealService {
  constructor(
    private readonly store: InMemoryRevealStore,
    private readonly eventBus: EventBus,
    private readonly audit: AuditLogger,
    private readonly notifier: Notifier
  ) {}

  reveal(chat: Chat, currentUserId: string): ChatIdentityReveal {
    this.assertOneToOne(chat);
    const otherUserId = this.getOther(chat, currentUserId);
    const reverse = this.store.getReveal(chat.id, otherUserId, currentUserId);
    const now = new Date();

    const status = reverse && this.isOneSided(reverse.status) ? RevealStatus.MUTUAL_CONFIRMED : this.getDirectionalStatus(chat, currentUserId, otherUserId);

    const next: ChatIdentityReveal = {
      chatId: chat.id,
      fromUserId: currentUserId,
      toUserId: otherUserId,
      status,
      initiatedAt: reverse?.initiatedAt ?? now,
      confirmedAt: status === RevealStatus.MUTUAL_CONFIRMED ? now : null,
      revokedAt: null
    };

    this.store.upsertReveal(next);
    this.store.setScope(chat.id, otherUserId, 'FULL');
    const newIdentity = this.resolveIdentityFor(chat, currentUserId, otherUserId);

    if (reverse && this.isOneSided(reverse.status)) {
      this.store.upsertReveal({ ...reverse, status: RevealStatus.MUTUAL_CONFIRMED, confirmedAt: now, revokedAt: null });
      this.store.setScope(chat.id, currentUserId, 'FULL');
    }

    this.eventBus.emitToChat(chat, { event: 'identity-revealed', chatId: chat.id, revealedBy: currentUserId, newIdentity });
    this.eventBus.emitToChat(chat, {
      event: 'identity-changed',
      chatId: chat.id,
      changedBy: currentUserId,
      reason: 'reveal',
      newIdentity
    });
    this.audit.log('chat.identity.reveal', { chatId: chat.id, actorUserId: currentUserId, targetUserId: otherUserId, status });

    return next;
  }

  requestMutualReveal(chat: Chat, currentUserId: string): ChatIdentityReveal {
    this.assertOneToOne(chat);
    const otherUserId = this.getOther(chat, currentUserId);
    const now = new Date();

    const next: ChatIdentityReveal = {
      chatId: chat.id,
      fromUserId: currentUserId,
      toUserId: otherUserId,
      status: RevealStatus.MUTUAL_PENDING,
      initiatedAt: now,
      confirmedAt: null,
      revokedAt: null
    };

    this.store.upsertReveal(next);
    this.notifier.notifyUser(otherUserId, { type: 'identity:mutual-requested', chatId: chat.id, requestedByUserId: currentUserId });
    this.audit.log('chat.identity.request_mutual_reveal', { chatId: chat.id, actorUserId: currentUserId, targetUserId: otherUserId });

    return next;
  }

  acceptMutualReveal(chat: Chat, currentUserId: string): ChatIdentityReveal {
    this.assertOneToOne(chat);
    const otherUserId = this.getOther(chat, currentUserId);
    const existing = this.store.getReveal(chat.id, otherUserId, currentUserId);
    if (!existing || existing.status !== RevealStatus.MUTUAL_PENDING) {
      throw new Error('No pending mutual reveal request');
    }

    const now = new Date();
    const accepted: ChatIdentityReveal = { ...existing, status: RevealStatus.MUTUAL_CONFIRMED, confirmedAt: now, revokedAt: null };
    this.store.upsertReveal(accepted);
    this.store.upsertReveal({
      chatId: chat.id,
      fromUserId: currentUserId,
      toUserId: otherUserId,
      status: RevealStatus.MUTUAL_CONFIRMED,
      initiatedAt: existing.initiatedAt,
      confirmedAt: now,
      revokedAt: null
    });

    this.store.setScope(chat.id, currentUserId, 'FULL');
    this.store.setScope(chat.id, otherUserId, 'FULL');

    this.eventBus.emitToChat(chat, { type: 'identity:mutual-confirmed', chatId: chat.id, confirmedByUserId: currentUserId });
    this.audit.log('chat.identity.accept_mutual_reveal', { chatId: chat.id, actorUserId: currentUserId, targetUserId: otherUserId });

    return accepted;
  }

  revokeReveal(chat: Chat, currentUserId: string): ChatIdentityReveal {
    this.assertOneToOne(chat);
    const otherUserId = this.getOther(chat, currentUserId);
    const existing = this.store.getReveal(chat.id, currentUserId, otherUserId);
    if (!existing) {
      throw new Error('No reveal exists to revoke');
    }

    const isA = chat.participantAId === currentUserId;
    const revoked = existing.status === RevealStatus.MUTUAL_CONFIRMED
      ? (isA ? RevealStatus.REVOKED_BY_A : RevealStatus.REVOKED_BY_B)
      : (isA ? RevealStatus.REVOKED_BY_A : RevealStatus.REVOKED_BY_B);

    const now = new Date();
    const next: ChatIdentityReveal = { ...existing, status: revoked, revokedAt: now };
    this.store.upsertReveal(next);

    const reverse = this.store.getReveal(chat.id, otherUserId, currentUserId);
    if (reverse && reverse.status === RevealStatus.MUTUAL_CONFIRMED) {
      this.store.upsertReveal({ ...reverse, status: RevealStatus.REVOKED_MUTUAL, revokedAt: now });
    }

    this.store.setScope(chat.id, otherUserId, 'GLOBAL_DEFAULT');
    const newIdentity = this.resolveIdentityFor(chat, currentUserId, otherUserId);

    this.eventBus.emitToChat(chat, {
      event: 'identity-revoked',
      chatId: chat.id,
      revokedBy: currentUserId,
      newIdentity,
      refreshMessages: true
    });
    this.eventBus.emitToChat(chat, {
      event: 'identity-changed',
      chatId: chat.id,
      changedBy: currentUserId,
      reason: 'revoke',
      newIdentity
    });
    this.audit.log('chat.identity.revoke', { chatId: chat.id, actorUserId: currentUserId, targetUserId: otherUserId, status: revoked });

    return next;
  }

  getRevealStatus(chat: Chat, currentUserId: string, resolver: IdentityResolverService) {
    this.assertOneToOne(chat);
    const otherUserId = this.getOther(chat, currentUserId);
    const current = this.store.getReveal(chat.id, currentUserId, otherUserId);

    return {
      status: current?.status ?? RevealStatus.NONE,
      canReveal: !current || current.status === RevealStatus.NONE || current.status.startsWith('REVOKED'),
      canRevoke: !!current && ![RevealStatus.NONE, RevealStatus.REVOKED_BY_A, RevealStatus.REVOKED_BY_B, RevealStatus.REVOKED_MUTUAL].includes(current.status),
      otherUserIdentity: resolver.resolveForChat1to1(chat, otherUserId, currentUserId)
    };
  }

  private assertOneToOne(chat: Chat): void {
    if (chat.type !== 'ONE_TO_ONE') {
      throw new Error('Identity reveal is only supported for 1:1 chats');
    }
  }

  private getOther(chat: Chat, currentUserId: string): string {
    if (chat.participantAId === currentUserId) return chat.participantBId;
    if (chat.participantBId === currentUserId) return chat.participantAId;
    throw new Error('User is not in chat');
  }

  private isOneSided(status: RevealStatus): boolean {
    return status === RevealStatus.ONE_SIDED_A_TO_B || status === RevealStatus.ONE_SIDED_B_TO_A;
  }

  private getDirectionalStatus(chat: Chat, fromUserId: string, toUserId: string): RevealStatus {
    const isAtoB = chat.participantAId === fromUserId && chat.participantBId === toUserId;
    return isAtoB ? RevealStatus.ONE_SIDED_A_TO_B : RevealStatus.ONE_SIDED_B_TO_A;
  }

  private resolveIdentityFor(chat: Chat, subjectUserId: string, viewerUserId: string): ResolvedIdentityDTO {
    const resolver = new IdentityResolverService(this.store);
    return resolver.resolveForChat1to1(chat, subjectUserId, viewerUserId);
  }
}

type Listener = (payload: Record<string, unknown>) => void;

export class ChatIdentityGateway implements EventBus {
  private readonly listenersByChat = new Map<string, Map<string, Set<Listener>>>();

  subscribe(chat: Chat, userId: string, listener: Listener): () => void {
    if (userId !== chat.participantAId && userId !== chat.participantBId) {
      throw new Error('User is not authorized for chat room');
    }

    const chatListeners = this.listenersByChat.get(chat.id) ?? new Map<string, Set<Listener>>();
    const userListeners = chatListeners.get(userId) ?? new Set<Listener>();
    userListeners.add(listener);
    chatListeners.set(userId, userListeners);
    this.listenersByChat.set(chat.id, chatListeners);

    return () => {
      this.listenersByChat.get(chat.id)?.get(userId)?.delete(listener);
    };
  }

  emitToChat(chat: Chat, payload: Record<string, unknown>): void {
    const chatListeners = this.listenersByChat.get(chat.id);
    if (!chatListeners) {
      return;
    }

    [chat.participantAId, chat.participantBId].forEach((participantId) => {
      chatListeners.get(participantId)?.forEach((listener) => listener(payload));
    });
  }
}
