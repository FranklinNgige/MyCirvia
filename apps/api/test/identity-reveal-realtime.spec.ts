import {
  Chat,
  ChatIdentityGateway,
  ChatRevealService,
  IdentityResolverService,
  InMemoryRevealStore
} from '../src/identity-reveal';

describe('identity reveal/revoke websocket integration', () => {
  const chat: Chat = {
    id: 'chat-rt-1',
    type: 'ONE_TO_ONE',
    participantAId: 'user-a',
    participantBId: 'user-b'
  };

  function createRealtimeHarness() {
    const store = new InMemoryRevealStore();
    const gateway = new ChatIdentityGateway();
    const service = new ChatRevealService(
      store,
      gateway,
      { log: () => undefined },
      { notifyUser: () => undefined }
    );

    const userAEvents: Record<string, unknown>[] = [];
    const userBEvents: Record<string, unknown>[] = [];

    gateway.subscribe(chat, 'user-a', (payload) => userAEvents.push(payload));
    gateway.subscribe(chat, 'user-b', (payload) => userBEvents.push(payload));

    return { service, userAEvents, userBEvents, resolver: new IdentityResolverService(store), gateway };
  }

  it('emits websocket reveal event', () => {
    const { service, userBEvents } = createRealtimeHarness();

    service.reveal(chat, 'user-a');

    expect(userBEvents).toContainEqual(
      expect.objectContaining({
        event: 'identity-revealed',
        revealedBy: 'user-a',
        newIdentity: expect.objectContaining({ userId: 'user-a', scope: 'FULL' })
      })
    );
  });

  it('emits websocket revoke event', () => {
    const { service, userBEvents } = createRealtimeHarness();

    service.reveal(chat, 'user-a');
    service.revokeReveal(chat, 'user-a');

    expect(userBEvents).toContainEqual(
      expect.objectContaining({
        event: 'identity-revoked',
        revokedBy: 'user-a',
        refreshMessages: true,
        newIdentity: expect.objectContaining({ userId: 'user-a', scope: 'GLOBAL_DEFAULT' })
      })
    );
  });

  it('propagates identity updates to all participants in chat room', () => {
    const { service, userAEvents, userBEvents } = createRealtimeHarness();

    service.reveal(chat, 'user-a');

    expect(userAEvents.some((event) => event.event === 'identity-revealed')).toBe(true);
    expect(userBEvents.some((event) => event.event === 'identity-revealed')).toBe(true);
    expect(userAEvents.some((event) => event.event === 'identity-changed')).toBe(true);
    expect(userBEvents.some((event) => event.event === 'identity-changed')).toBe(true);
  });

  it('prevents identity leakage to unauthorized listeners', () => {
    const { service, gateway } = createRealtimeHarness();

    expect(() => gateway.subscribe(chat, 'intruder', () => undefined)).toThrow('User is not authorized for chat room');

    expect(() => service.reveal(chat, 'user-a')).not.toThrow();
  });

  it('e2e: reveal then revoke updates viewer identity resolution and websocket events', () => {
    const { service, userBEvents, resolver } = createRealtimeHarness();

    service.reveal(chat, 'user-a');

    expect(userBEvents.some((event) => event.event === 'identity-revealed')).toBe(true);
    expect(resolver.resolveForChat1to1(chat, 'user-a', 'user-b').scope).toBe('FULL');

    service.revokeReveal(chat, 'user-a');

    expect(userBEvents.some((event) => event.event === 'identity-revoked')).toBe(true);
    expect(resolver.resolveForChat1to1(chat, 'user-a', 'user-b').scope).toBe('GLOBAL_DEFAULT');
  });
});
