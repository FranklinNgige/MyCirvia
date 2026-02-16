'use client';

import axios, { AxiosError, type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/lib/store/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RetryableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-CSRF-Token'
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, clearSession, setSession } = useAuthStore.getState();

  if (!refreshToken) {
    clearSession();
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
      {
        withCredentials: true,
        headers: {
          'X-CSRF-Token': Cookies.get('XSRF-TOKEN') ?? ''
        }
      }
    );

    const nextAccessToken = response.data?.accessToken as string | undefined;

    if (!nextAccessToken) {
      clearSession();
      return null;
    }

    setSession({
      accessToken: nextAccessToken,
      refreshToken: response.data?.refreshToken ?? refreshToken,
      user: response.data?.user
    });

    return nextAccessToken;
  } catch {
    clearSession();
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const csrfToken = Cookies.get('XSRF-TOKEN');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });

    const nextAccessToken = await refreshPromise;

    if (!nextAccessToken) {
      return Promise.reject(error);
    }

    originalRequest.headers = {
      ...originalRequest.headers,
      Authorization: `Bearer ${nextAccessToken}`
    };

    return apiClient(originalRequest);
  }
);
