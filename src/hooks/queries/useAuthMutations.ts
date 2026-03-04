// src/hooks/queries/useAuthMutations.ts
// React Query hooks for authentication operations
//
// NOTE: These hooks are available for React Query-based authentication flows.
// Currently, the app uses direct API calls in AuthModal for login/signup.
// These hooks are provided for future migration to React Query patterns.

import { useMutation } from '@tanstack/react-query';
import {
  login as apiLogin,
  signup as apiSignup,
  googleAuth,
  logout,
  logoutAll,
  refreshTokens,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
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
        // Refresh token is set as HTTP-only cookie by the backend
        authLogin(data.data, data.accessToken);
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
        authLogin(data.data, (data as any).accessToken);
      }
    },
  });
}

/**
 * Hook for Google OAuth mutation using ID token (legacy flow)
 * @deprecated Use useGoogleAuth from hooks/useGoogleAuth.ts for PKCE flow instead
 */
export function useGoogleIdTokenAuth() {
  const authLogin = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: (idToken: string) => googleAuth(idToken),
    onSuccess: (data) => {
      if (data.success) {
        authLogin(data.data, data.accessToken);
      }
    },
  });
}

/**
 * Hook for logout mutation
 */
export function useLogout() {
  const authLogout = useAuthStore((s) => s.logout);

  return useMutation({
    mutationFn: async () => {
      // Refresh token cookie is sent automatically — no need to pass it
      await logout();
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
  const setAccessToken = useAuthStore((s) => s.setAccessToken);

  return useMutation({
    mutationFn: async () => {
      // Refresh token cookie is sent automatically
      return refreshTokens();
    },
    onSuccess: (data) => {
      if (data.success) {
        setAccessToken(data.accessToken);
      }
    },
  });
}

/**
 * Hook for forgot password mutation
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => apiForgotPassword(email),
  });
}

/**
 * Hook for reset password mutation
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => apiResetPassword(token, newPassword),
  });
}
