import { IdentityScope, Profile, ScopeType } from './types.js';

export interface ProfileRepository {
  getByUserId(userId: string): Promise<Profile | null>;
  getByUserIds(userIds: string[]): Promise<Map<string, Profile>>;
}

export interface IdentityScopeRepository {
  getByUserAndScope(userId: string, scopeType: ScopeType, scopeId: string | null): Promise<IdentityScope | null>;
  getGlobalDefault(userId: string): Promise<IdentityScope | null>;
  createGlobalDefaultAnonymous(userId: string): Promise<IdentityScope>;
  getByUsersAndScope(userIds: string[], scopeType: ScopeType, scopeId: string | null): Promise<Map<string, IdentityScope>>;
  getGlobalDefaults(userIds: string[]): Promise<Map<string, IdentityScope>>;
}

export interface AvatarSigner {
  toSignedUrl(key: string): Promise<string>;
}
