import { describe, expect, it } from 'vitest';
import { IdentityResolverService } from '../../src/services/IdentityResolverService.js';
import {
  FixedSigner,
  InMemoryIdentityScopeRepository,
  InMemoryProfileRepository,
  makeProfile,
  makeScope,
  scopeStorageKey,
} from '../support/inMemory.js';

describe('IdentityResolverService integration', () => {
  it('resolves different identities across scopes', async () => {
    const profile = makeProfile('user-1');
    const groupScope = makeScope('user-1', { scopeType: 'GROUP', scopeId: 'group-1', identityLevel: 'ANONYMOUS' });
    const eventScope = makeScope('user-1', {
      scopeType: 'EVENT',
      scopeId: 'event-1',
      identityLevel: 'FULL',
      showAgeRange: true,
      showGender: true,
      showCity: true,
      showState: true,
      showBio: true,
      showProfilePhoto: true,
    });

    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(
        new Map([
          [scopeStorageKey(groupScope), groupScope],
          [scopeStorageKey(eventScope), eventScope],
        ]),
      ),
      new FixedSigner(),
    );

    const groupView = await service.resolveIdentity('viewer', 'user-1', { scopeType: 'GROUP', scopeId: 'group-1' });
    const eventView = await service.resolveIdentity('viewer', 'user-1', { scopeType: 'EVENT', scopeId: 'event-1' });

    expect(groupView.identityLevel).toBe('ANONYMOUS');
    expect(groupView.displayName).toBe('Abstract user-1');
    expect(eventView.identityLevel).toBe('FULL');
    expect(eventView.displayName).toBe('Real user-1');
    expect(eventView.bio).toBe('Bio user-1');
  });

  it('scope changes are reflected immediately without cache staleness', async () => {
    const profile = makeProfile('user-2');
    const scope = makeScope('user-2', { scopeType: 'GROUP', scopeId: 'group-1', identityLevel: 'ANONYMOUS' });
    const scopes = new Map([[scopeStorageKey(scope), scope]]);

    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(scopes),
      new FixedSigner(),
    );

    const before = await service.resolveIdentity('viewer', 'user-2', { scopeType: 'GROUP', scopeId: 'group-1' });
    expect(before.identityLevel).toBe('ANONYMOUS');

    scopes.set(
      scopeStorageKey(scope),
      makeScope('user-2', {
        scopeType: 'GROUP',
        scopeId: 'group-1',
        identityLevel: 'PARTIAL',
        showAgeRange: true,
        showGender: true,
      }),
    );

    const after = await service.resolveIdentity('viewer', 'user-2', { scopeType: 'GROUP', scopeId: 'group-1' });
    expect(after.identityLevel).toBe('PARTIAL');
    expect(after.displayName).toBe('Chosen user-2');
    expect(after.ageRange).toBe('25-34');
  });
});
