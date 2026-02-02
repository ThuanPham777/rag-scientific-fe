// src/hooks/queries/useAuthMutations.ts
// React Query hooks for authentication operations

import { useMutation } from '@tanstack/react-query';
import {
  login as apiLogin,
  signup as apiSignup,
  googleAuth,
  logout,
  logoutAll,
  refreshTokens,
} from '../../services';
import { useAuthStore } from '../../store/useAuthStore';

/**
 * Hook for login mutation
 */
export function useLogin() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiLogin(email, password),
    onSuccess: (data) => {
      if (data.success) {
        authLogin(data.data, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
    },
  });
}

/**
 * Hook for signup mutation
 */
export function useSignup() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: ({
      email,
      password,
      displayName,
    }: {
      email: string;
      password: string;
      displayName?: string;
    }) => apiSignup(email, password, displayName),
    onSuccess: (data) => {
      if (data.success && 'accessToken' in data) {
        authLogin(data.data, {
          accessToken: (data as any).accessToken,
          refreshToken: (data as any).refreshToken,
        });
      }
    },
  });
}

/**
 * Hook for Google OAuth mutation
 */
export function useGoogleAuth() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (idToken: string) => googleAuth(idToken),
    onSuccess: (data) => {
      if (data.success) {
        authLogin(data.data, {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
    },
  });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const authLogout = useAuthStore((s) => s.logout);
  const getRefreshToken = useAuthStore((s) => s.getRefreshToken);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await logout(refreshToken);
      }
    },
    onSettled: () => {
      // Always logout locally, even if API fails
      authLogout();
    },
  });
}

/**
 * Hook for logout from all devices mutation
 */
export function useLogoutAll() {
  const authLogout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: logoutAll,
    onSettled: () => {
      authLogout();
    },
  });
}

/**
 * Hook for refreshing tokens
 */
export function useRefreshTokens() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const getRefreshToken = useAuthStore((s) => s.getRefreshToken);

  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error('No refresh token');
      return refreshTokens(refreshToken);
    },
    onSuccess: (data) => {
      if (data.success) {
        setTokens({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        });
      }
    },
  });
}
