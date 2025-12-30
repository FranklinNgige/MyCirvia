export type IdentityLevel = "anonymous" | "partial" | "full";

export type IdentityScopeType = "DEFAULT_TEMPLATE" | "CHAT" | "CIRVIA";

export type IdentityScopeContext =
  | { type: "DEFAULT_TEMPLATE" }
  | { type: "CHAT"; chatId: string }
  | { type: "CIRVIA"; cirviaId: string };

export interface IdentityBaseFields {
  anonDisplayName: string;
  anonAvatarUrl: string;
  ageRange: string | null;
  gender: string | null;
}

export interface IdentityPartialFields {
  nickname?: string | null;
  city?: string | null;
  state?: string | null;
  abstractAvatarUrl?: string | null;
}

export interface IdentityFullFields {
  realName?: string | null;
  profilePhotoUrl?: string | null;
}

export type IdentityScopeFields = IdentityPartialFields & IdentityFullFields;

export interface IdentityScopeSetting {
  userId: string;
  scopeType: IdentityScopeType;
  scopeId: string | null;
  identityLevel: IdentityLevel;
  fields: IdentityScopeFields;
}

export interface IdentityProfile extends IdentityBaseFields {
  userId: string;
  fullName: string | null;
  profilePhotoUrl: string | null;
}

export interface DisplayIdentity {
  identityLevel: IdentityLevel;
  displayName: string;
  avatarUrl: string;
  ageRange: string | null;
  gender: string | null;
  city?: string | null;
  state?: string | null;
  profilePhotoUrl?: string | null;
}

export interface IdentitySnapshot {
  identityLevel: IdentityLevel;
  displayName: string;
  avatarUrl: string;
  ageRange: string | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  profilePhotoUrl: string | null;
}

export interface IdentityChangeNotice {
  scope: IdentityScopeContext;
  systemMessage: string;
}
