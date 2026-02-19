import { describe, expect, it } from 'vitest';
import {
  Chat,
  ChatIdentityGateway,
  ChatRevealService,
  IdentityResolverService,
  InMemoryRevealStore
} from '../src/identity-reveal.js';

describe('identity reveal/revoke realtime e2e flow', () => {
  it('delivers reveal then revoke events and updated identities to chat participants', () => {
    const store = new InMemoryRevealStore();
    const gateway = new ChatIdentityGateway();
    const resolver = new IdentityResolverService(store);
    const service = new ChatRevealService(
      store,
      gateway,
      { log: () => undefined },
      { notifyUser: () => undefined }
    );

    const chat: Chat = {
      id: 'chat-e2e-1',
      type: 'ONE_TO_ONE',
      participantAId: 'user-a',
      participantBId: 'user-b'
    };

    const userBEvents: Record<string, unknown>[] = [];
    gateway.subscribe(chat, 'user-b', (payload) => userBEvents.push(payload));

    service.reveal(chat, 'user-a');

    const revealedEvent = userBEvents.find((event) => event.event === 'identity-revealed');
    expect(revealedEvent).toEqual(
      expect.objectContaining({
        revealedBy: 'user-a',
        newIdentity: expect.objectContaining({ userId: 'user-a', scope: 'FULL' })
      })
    );
    expect(resolver.resolveForChat1to1(chat, 'user-a', 'user-b').scope).toBe('FULL');

    service.revokeReveal(chat, 'user-a');

    const revokedEvent = userBEvents.find((event) => event.event === 'identity-revoked');
    expect(revokedEvent).toEqual(
      expect.objectContaining({
        revokedBy: 'user-a',
        refreshMessages: true,
        newIdentity: expect.objectContaining({ userId: 'user-a', scope: 'GLOBAL_DEFAULT' })
      })
    );
    expect(resolver.resolveForChat1to1(chat, 'user-a', 'user-b').scope).toBe('GLOBAL_DEFAULT');
  });
});
