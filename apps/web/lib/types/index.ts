export type AgeRange = '13-17' | '18-24' | '25-34' | '35-44' | '45+';
export type Gender = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export interface TokenPair {
  accessToken: string;
  refreshToken?: string;
}

export interface User {
  id: string;
  email: string;
}

export interface ResolvedIdentityDTO {
  avatarUrl?: string | null;
  displayName: string;
}

export interface CirviaMember {
  id: string;
  resolvedIdentity: ResolvedIdentityDTO;
}

export interface CirviaSummary {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  resolvedIdentity: ResolvedIdentityDTO;
}

export interface CirviaDetail extends CirviaSummary {
  visibility: 'public' | 'private';
  requireApproval: boolean;
  maxMembers?: number | null;
  members: CirviaMember[];
}

export interface JoinPreview {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  requiresApproval: boolean;
}
