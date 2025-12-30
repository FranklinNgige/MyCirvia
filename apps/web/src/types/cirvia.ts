export type CirviaVisibility = "public" | "private";
export type CirviaRole = "owner" | "admin" | "moderator" | "member";
export type CirviaMemberStatus = "invited" | "pending" | "active" | "banned";

export interface Cirvia {
  id: string;
  name: string;
  description: string | null;
  visibility: CirviaVisibility;
  invite_only: boolean;
  auto_approve: boolean;
  owner_id: string;
  created_at: string;
}

export interface CirviaMember {
  id: string;
  cirvia_id: string;
  user_id: string;
  role: CirviaRole;
  status: CirviaMemberStatus;
  created_at: string;
  updated_at: string;
}

export interface CirviaInvite {
  id: string;
  cirvia_id: string;
  token: string;
  created_by: string;
  single_use: boolean;
  used_by: string | null;
  used_at: string | null;
  expires_at: string | null;
  created_at: string;
}
