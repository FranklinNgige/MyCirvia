import { describe, expect, it } from 'vitest';
import { Chat, ChatRevealService, IdentityResolverService, InMemoryRevealStore, RevealStatus } from '../src/identity-reveal.js';
import { ChatRevealController } from '../src/http.js';

const chat: Chat = { id: 'chat-1', type: 'ONE_TO_ONE', participantAId: 'user-a', participantBId: 'user-b' };

function setup() {
  const store = new InMemoryRevealStore();
  const events: Record<string, unknown>[] = [];
  const logs: Record<string, unknown>[] = [];
  const notifications: Record<string, unknown>[] = [];

  const service = new ChatRevealService(
    store,
    { emitToChat: (_chatId, payload) => events.push(payload) },
    { log: (action, payload) => logs.push({ action, ...payload }) },
    { notifyUser: (userId, payload) => notifications.push({ userId, ...payload }) }
  );

  const resolver = new IdentityResolverService(store);
  const controller = new ChatRevealController({ getChat: () => chat }, service, resolver);
  return { store, service, resolver, controller, events, logs, notifications };
}

describe('Chat identity reveal state machine', () => {
  it('transitions one-sided reveal into mutual confirmed', () => {
    const { controller, store } = setup();

    const aReveal = controller.postReveal({ params: { chatId: chat.id }, userId: 'user-a' });
    expect(aReveal.status).toBe(RevealStatus.ONE_SIDED_A_TO_B);

    const bReveal = controller.postReveal({ params: { chatId: chat.id }, userId: 'user-b' });
    expect(bReveal.status).toBe(RevealStatus.MUTUAL_CONFIRMED);
    expect(store.getReveal(chat.id, 'user-a', 'user-b')?.status).toBe(RevealStatus.MUTUAL_CONFIRMED);
  });

  it('supports mutual reveal request and acceptance', () => {
    const { controller, store, notifications } = setup();

    const pending = controller.postRequestMutualReveal({ params: { chatId: chat.id }, userId: 'user-a' });
    expect(pending.status).toBe(RevealStatus.MUTUAL_PENDING);
    expect(notifications).toHaveLength(1);

    const accepted = controller.postAcceptMutualReveal({ params: { chatId: chat.id }, userId: 'user-b' });
    expect(accepted.status).toBe(RevealStatus.MUTUAL_CONFIRMED);
    expect(store.getReveal(chat.id, 'user-b', 'user-a')?.status).toBe(RevealStatus.MUTUAL_CONFIRMED);
  });

  it('revoke immediately affects identity resolution but keeps messages intact', () => {
    const { controller, resolver, store } = setup();

    controller.postReveal({ params: { chatId: chat.id }, userId: 'user-a' });
    const before = resolver.resolveForChat1to1(chat, 'user-a', 'user-b');
    expect(before.scope).toBe('FULL');

    store.addMessage(chat.id, before.displayName);

    controller.postRevokeReveal({ params: { chatId: chat.id }, userId: 'user-a' });

    const after = resolver.resolveForChat1to1(chat, 'user-a', 'user-b');
    expect(after.scope).toBe('GLOBAL_DEFAULT');
    expect(store.getMessages(chat.id)).toEqual(['full:user-a']);
  });

  it('emits websocket events and writes audit logs for all actions', () => {
    const { controller, events, logs } = setup();

    controller.postReveal({ params: { chatId: chat.id }, userId: 'user-a' });
    controller.postRequestMutualReveal({ params: { chatId: chat.id }, userId: 'user-a' });
    controller.postAcceptMutualReveal({ params: { chatId: chat.id }, userId: 'user-b' });
    controller.postRevokeReveal({ params: { chatId: chat.id }, userId: 'user-a' });

    expect(events.some((e) => e.type === 'identity:revealed')).toBe(true);
    expect(events.some((e) => e.type === 'identity:mutual-confirmed')).toBe(true);
    expect(events.some((e) => e.type === 'identity:revoked')).toBe(true);

    expect(logs.map((l) => l.action)).toEqual([
      'chat.identity.reveal',
      'chat.identity.request_mutual_reveal',
      'chat.identity.accept_mutual_reveal',
      'chat.identity.revoke'
    ]);
  });

  it('cannot reveal in group chats', () => {
    const { service } = setup();
    const groupChat: Chat = { id: 'group-1', type: 'GROUP', participantAId: 'user-a', participantBId: 'user-b' };

    expect(() => service.reveal(groupChat, 'user-a')).toThrow('Identity reveal is only supported for 1:1 chats');
  });

  it('returns reveal status payload', () => {
    const { controller } = setup();
    controller.postReveal({ params: { chatId: chat.id }, userId: 'user-a' });

    const status = controller.getRevealStatus({ params: { chatId: chat.id }, userId: 'user-a' });
    expect(status.status).toBe(RevealStatus.ONE_SIDED_A_TO_B);
    expect(status.canRevoke).toBe(true);
    expect(status.otherUserIdentity).toBeDefined();
  });
});
