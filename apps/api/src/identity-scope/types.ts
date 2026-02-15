export type IdentityLevel = 'ANONYMOUS' | 'PARTIAL' | 'FULL';
export type ScopeType = 'GROUP' | 'EVENT' | 'CIRVIA' | 'GLOBAL_DEFAULT';

export interface IdentityContext {
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface Profile {
  userId: string;
  realName?: string;
  chosenName?: string;
  abstractName: string;
  abstractAvatarKey: string;
  profilePhotoKey?: string;
  ageRange?: string;
  gender?: string;
  city?: string;
  state?: string;
  bio?: string;
}

export interface IdentityScope {
  userId: string;
  scopeType: ScopeType;
  scopeId: string | null;
  identityLevel: IdentityLevel;
  showAgeRange: boolean;
  showGender: boolean;
  showCity: boolean;
  showState: boolean;
  showBio: boolean;
  showProfilePhoto: boolean;
  customAvatarKey?: string;
}

export interface ResolvedIdentityDTO {
  userId: string;
  displayName: string;
  avatarUrl: string;
  identityLevel: IdentityLevel;
  ageRange?: string;
  gender?: string;
  city?: string;
  state?: string;
  bio?: string;
}
