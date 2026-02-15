import { describe, expect, it } from 'vitest';
import { IdentityResolverService, NotFoundError } from '../../src/services/IdentityResolverService.js';
import {
  FixedSigner,
  InMemoryIdentityScopeRepository,
  InMemoryProfileRepository,
  makeProfile,
  makeScope,
  scopeStorageKey,
} from '../support/inMemory.js';

describe('IdentityResolverService', () => {
  it('returns FULL identity when viewer is subject', async () => {
    const profile = makeProfile('u1');
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(new Map()),
      new FixedSigner(),
    );

    const dto = await service.resolveIdentity('u1', 'u1', { scopeType: 'GROUP', scopeId: 'g1' });
    expect(dto.identityLevel).toBe('FULL');
    expect(dto.displayName).toBe('Real u1');
    expect(dto.avatarUrl).toContain('profile-u1');
    expect(dto.bio).toBe('Bio u1');
  });

  it('resolves ANONYMOUS with optional age/gender toggles', async () => {
    const profile = makeProfile('u1');
    const scope = makeScope('u1', { identityLevel: 'ANONYMOUS', showAgeRange: true, showGender: false });
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(new Map([[scopeStorageKey(scope), scope]])),
      new FixedSigner(),
    );

    const dto = await service.resolveIdentity('viewer', 'u1', { scopeType: 'GROUP', scopeId: 'g1' });
    expect(dto).toMatchObject({
      displayName: 'Abstract u1',
      identityLevel: 'ANONYMOUS',
      ageRange: '25-34',
      gender: undefined,
    });
    expect(dto.avatarUrl).toContain('abstract-u1');
  });

  it('resolves PARTIAL with chosen name + custom avatar + toggled fields', async () => {
    const profile = makeProfile('u1');
    const scope = makeScope('u1', {
      identityLevel: 'PARTIAL',
      customAvatarKey: 'custom-key',
      showAgeRange: true,
      showGender: true,
      showCity: true,
      showState: false,
    });
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(new Map([[scopeStorageKey(scope), scope]])),
      new FixedSigner(),
    );

    const dto = await service.resolveIdentity('viewer', 'u1', { scopeType: 'GROUP', scopeId: 'g1' });
    expect(dto).toMatchObject({
      displayName: 'Chosen u1',
      identityLevel: 'PARTIAL',
      ageRange: '25-34',
      gender: 'non-binary',
      city: 'Austin',
      state: undefined,
    });
    expect(dto.avatarUrl).toContain('custom-key');
  });

  it('resolves FULL level using configured toggles', async () => {
    const profile = makeProfile('u1');
    const scope = makeScope('u1', {
      identityLevel: 'FULL',
      showAgeRange: true,
      showGender: true,
      showCity: false,
      showState: true,
      showBio: true,
      showProfilePhoto: true,
    });
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      new InMemoryIdentityScopeRepository(new Map([[scopeStorageKey(scope), scope]])),
      new FixedSigner(),
    );

    const dto = await service.resolveIdentity('viewer', 'u1', { scopeType: 'GROUP', scopeId: 'g1' });
    expect(dto).toMatchObject({
      displayName: 'Real u1',
      identityLevel: 'FULL',
      ageRange: '25-34',
      gender: 'non-binary',
      city: undefined,
      state: 'TX',
      bio: 'Bio u1',
    });
    expect(dto.avatarUrl).toContain('profile-u1');
  });

  it('falls back exact -> global default -> auto-create', async () => {
    const profile = makeProfile('u1');
    const global = makeScope('u1', { scopeType: 'GLOBAL_DEFAULT', scopeId: null, identityLevel: 'PARTIAL' });
    const scopes = new Map([[scopeStorageKey(global), global]]);
    const repo = new InMemoryIdentityScopeRepository(scopes);
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map([[profile.userId, profile]])),
      repo,
      new FixedSigner(),
    );

    const dtoGlobal = await service.resolveIdentity('viewer', 'u1', { scopeType: 'GROUP', scopeId: 'missing' });
    expect(dtoGlobal.identityLevel).toBe('PARTIAL');

    scopes.clear();
    const dtoCreated = await service.resolveIdentity('viewer', 'u1', { scopeType: 'GROUP', scopeId: 'missing' });
    expect(dtoCreated.identityLevel).toBe('ANONYMOUS');
    expect(repo.createGlobalDefaultCalls).toBe(1);
  });

  it('bulk resolves identities and avoids per-user scope queries', async () => {
    const p1 = makeProfile('u1');
    const p2 = makeProfile('u2');
    const s1 = makeScope('u1', { identityLevel: 'PARTIAL' });
    const s2 = makeScope('u2', { identityLevel: 'ANONYMOUS' });
    const profileRepo = new InMemoryProfileRepository(
      new Map([
        [p1.userId, p1],
        [p2.userId, p2],
      ]),
    );
    const scopeRepo = new InMemoryIdentityScopeRepository(
      new Map([
        [scopeStorageKey(s1), s1],
        [scopeStorageKey(s2), s2],
      ]),
    );
    const service = new IdentityResolverService(profileRepo, scopeRepo, new FixedSigner());

    const dtos = await service.resolveIdentityBulk('viewer', ['u1', 'u2'], { scopeType: 'GROUP', scopeId: 'g1' });
    expect(dtos.size).toBe(2);
    expect(scopeRepo.getByUsersAndScopeCalls).toBe(1);
    expect(profileRepo.getByUserIdsCalls).toBe(1);
  });

  it('throws NotFoundError for missing users', async () => {
    const service = new IdentityResolverService(
      new InMemoryProfileRepository(new Map()),
      new InMemoryIdentityScopeRepository(new Map()),
      new FixedSigner(),
    );

    await expect(service.resolveIdentity('viewer', 'missing', { scopeType: 'GROUP', scopeId: 'g1' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
