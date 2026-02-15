import { AvatarSigner, IdentityScopeRepository, ProfileRepository } from '../../src/repositories.js';
import { IdentityScope, Profile, ScopeType } from '../../src/types.js';

function scopeKey(userId: string, scopeType: ScopeType, scopeId: string | null): string {
  return `${userId}|${scopeType}|${scopeId ?? 'null'}`;
}

export class InMemoryProfileRepository implements ProfileRepository {
  public getByUserIdsCalls = 0;
  constructor(private readonly profiles: Map<string, Profile>) {}

  async getByUserId(userId: string): Promise<Profile | null> {
    return this.profiles.get(userId) ?? null;
  }

  async getByUserIds(userIds: string[]): Promise<Map<string, Profile>> {
    this.getByUserIdsCalls += 1;
    const result = new Map<string, Profile>();
    for (const id of userIds) {
      const profile = this.profiles.get(id);
      if (profile) {
        result.set(id, profile);
      }
    }
    return result;
  }
}

export class InMemoryIdentityScopeRepository implements IdentityScopeRepository {
  public createGlobalDefaultCalls = 0;
  public getByUsersAndScopeCalls = 0;

  constructor(private readonly scopes: Map<string, IdentityScope>) {}

  async getByUserAndScope(userId: string, scopeType: ScopeType, scopeId: string | null): Promise<IdentityScope | null> {
    return this.scopes.get(scopeKey(userId, scopeType, scopeId)) ?? null;
  }

  async getGlobalDefault(userId: string): Promise<IdentityScope | null> {
    return this.scopes.get(scopeKey(userId, 'GLOBAL_DEFAULT', null)) ?? null;
  }

  async createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope> {
    this.createGlobalDefaultCalls += 1;
    const created: IdentityScope = {
      userId,
      scopeType: 'GLOBAL_DEFAULT',
      scopeId: null,
      identityLevel: 'ANONYMOUS',
      showAgeRange: false,
      showGender: false,
      showCity: false,
      showState: false,
      showBio: false,
      showProfilePhoto: false,
    };
    this.scopes.set(scopeKey(userId, 'GLOBAL_DEFAULT', null), created);
    return created;
  }

  async getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>> {
    this.getByUsersAndScopeCalls += 1;
    const result = new Map<string, IdentityScope>();
    for (const id of userIds) {
      const scope = this.scopes.get(scopeKey(id, scopeType, scopeId));
      if (scope) {
        result.set(id, scope);
      }
    }
    return result;
  }

  async getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>> {
    const result = new Map<string, IdentityScope>();
    for (const id of userIds) {
      const scope = this.scopes.get(scopeKey(id, 'GLOBAL_DEFAULT', null));
      if (scope) {
        result.set(id, scope);
      }
    }
    return result;
  }
}

export class FixedSigner implements AvatarSigner {
  async toSignedUrl(key: string): Promise<string> {
    return `https://signed.example/${key}`;
  }
}

export function makeProfile(userId: string): Profile {
  return {
    userId,
    realName: `Real ${userId}`,
    chosenName: `Chosen ${userId}`,
    abstractName: `Abstract ${userId}`,
    abstractAvatarKey: `abstract-${userId}`,
    profilePhotoKey: `profile-${userId}`,
    ageRange: '25-34',
    gender: 'non-binary',
    city: 'Austin',
    state: 'TX',
    bio: `Bio ${userId}`,
  };
}

export function makeScope(userId: string, overrides: Partial<IdentityScope>): IdentityScope {
  return {
    userId,
    scopeType: 'GROUP',
    scopeId: 'g1',
    identityLevel: 'ANONYMOUS',
    showAgeRange: false,
    showGender: false,
    showCity: false,
    showState: false,
    showBio: false,
    showProfilePhoto: false,
    ...overrides,
  };
}

export function scopeStorageKey(scope: IdentityScope): string {
  return `${scope.userId}|${scope.scopeType}|${scope.scopeId ?? 'null'}`;
}
