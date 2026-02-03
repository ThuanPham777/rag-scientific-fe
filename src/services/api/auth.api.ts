// src/services/api/auth.api.ts
// Authentication related API calls

import api from '../../config/axios';
import type { LoginResponse, SignupResponse } from '../../utils/types';

/**
 * Register a new user
 */
export async function signup(
  email: string,
  password: string,
  displayName?: string,
): Promise<SignupResponse> {
  const { data } = await api.post('/auth/signup', {
    email,
    password,
    displayName,
  });
  return data;
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

/**
 * Login/Register with Google OAuth (ID Token flow - legacy)
 */
export async function googleAuth(idToken: string): Promise<LoginResponse> {
  const { data } = await api.post('/auth/google', { idToken });
  return data;
}

/**
 * Login/Register with Google OAuth (Authorization Code flow - recommended)
 * More secure as the code exchange happens on the backend
 */
export async function googleCodeAuth(
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<LoginResponse> {
  const { data } = await api.post('/auth/google/code', {
    code,
    redirectUri,
    codeVerifier,
  });
  return data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshTokens(
  refreshToken: string,
): Promise<LoginResponse> {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data;
}

/**
 * Logout - revoke refresh token
 */
export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

/**
 * Logout from all devices
 */
export async function logoutAll(): Promise<void> {
  await api.post('/auth/logout-all');
}
