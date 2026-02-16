'use client';

import { apiClient } from '@/lib/api/client';
import type { CirviaDetail, CirviaSummary, JoinPreview } from '@/lib/types';

export interface CreateCirviaInput {
  name: string;
  description: string;
  visibility: 'public' | 'private';
  requireApproval: boolean;
  maxMembers?: number;
}

export async function getMyCirvias(): Promise<CirviaSummary[]> {
  const { data } = await apiClient.get('/cirvias/my');
  return data;
}

export async function getDiscoverCirvias(): Promise<CirviaSummary[]> {
  const { data } = await apiClient.get('/cirvias/discover');
  return data;
}

export async function createCirvia(payload: CreateCirviaInput): Promise<{ id: string }> {
  const { data } = await apiClient.post('/cirvias', payload);
  return data;
}

export async function getCirviaDetail(cirviaId: string): Promise<CirviaDetail> {
  const { data } = await apiClient.get(`/cirvias/${cirviaId}`);
  return data;
}

export async function createInviteLink(cirviaId: string): Promise<{ inviteLink: string }> {
  const { data } = await apiClient.post(`/cirvias/${cirviaId}/invite`);
  return data;
}

export async function getJoinPreview(inviteCode: string): Promise<JoinPreview> {
  const { data } = await apiClient.get(`/cirvias/invites/${inviteCode}`);
  return data;
}

export async function joinByInvite(inviteCode: string): Promise<{ status: 'joined' | 'pending_approval' }> {
  const { data } = await apiClient.post(`/cirvias/invites/${inviteCode}/join`);
  return data;
}
