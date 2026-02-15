export type CreateCirviaDto = {
  name: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  requireApproval: boolean;
  maxMembers?: number;
};

export type DiscoveryQueryDto = {
  page?: string;
  pageSize?: string;
  search?: string;
  joined?: 'joined' | 'not_joined';
};

export type CreateInviteDto = {
  expiresAt: string;
  maxUses?: number;
};

export type JoinCirviaDto = {
  inviteCode: string;
};

export type BanMemberDto = {
  reason: string;
  duration?: number | null;
};

export type MuteMemberDto = {
  duration: number;
};

export type UpdateMemberRoleDto = {
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER';
};
