'use client';

import { apiClient } from '@/lib/api/client';
import type { AgeRange, Gender, TokenPair, User } from '@/lib/types';

export interface RegisterInput {
  email: string;
  password: string;
  ageRange: AgeRange;
  gender: Gender;
}

export interface LoginInput {
  email: string;
  password: string;
}

type AuthResponse = TokenPair & { user: User };

export async function registerUser(payload: RegisterInput): Promise<void> {
  await apiClient.post('/auth/register', payload);
}

export async function verifyEmail(token: string): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/verify-email', { token });
  return data;
}

export async function loginUser(payload: LoginInput): Promise<AuthResponse> {
  const { data } = await apiClient.post('/auth/login', payload);
  return data;
}

export async function forgotPassword(email: string): Promise<void> {
  await apiClient.post('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiClient.post('/auth/reset-password', { token, password });
}
