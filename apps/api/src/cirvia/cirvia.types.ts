export const roleRank: Record<string, number> = {
  MEMBER: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasRoleAtLeast(role: string, minimum: string): boolean {
  return roleRank[role] >= roleRank[minimum];
}
