// src/hooks/useGoogleAuth.ts
// Google OAuth 2.0 Authorization Code Flow with PKCE
import { useState, useCallback } from 'react';
import { GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI } from '../config/env';
import { googleCodeAuth } from '../services/api/auth.api';
import { useAuthStore } from '../store/useAuthStore';

// =====================================================
// PKCE Helper Functions
// =====================================================

/**
 * Generate a random code verifier for PKCE
 */
function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from verifier (S256 method)
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// =====================================================
// Google Auth State Keys (sessionStorage)
// =====================================================
const OAUTH_STATE_KEY = 'google_oauth_state';
const CODE_VERIFIER_KEY = 'google_code_verifier';

export type GoogleAuthStatus =
  | 'idle'
  | 'redirecting'
  | 'processing'
  | 'success'
  | 'error';

export interface UseGoogleAuthReturn {
  status: GoogleAuthStatus;
  error: string | null;
  initiateGoogleLogin: () => Promise<void>;
  handleCallback: (code: string, state: string) => Promise<boolean>;
}

/**
 * Hook for Google OAuth 2.0 Authorization Code Flow with PKCE
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [status, setStatus] = useState<GoogleAuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuthStore();

  /**
   * Generate random state for CSRF protection
   */
  const generateState = useCallback((): string => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return base64UrlEncode(array);
  }, []);

  /**
   * Initiate Google OAuth - redirect to Google
   */
  const initiateGoogleLogin = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google OAuth is not configured');
      setStatus('error');
      return;
    }

    setStatus('redirecting');
    setError(null);

    try {
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Generate state for CSRF protection
      const state = generateState();

      // Store verifier and state in sessionStorage (cleared on browser close)
      sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
      sessionStorage.setItem(OAUTH_STATE_KEY, state);

      // Build Google OAuth URL
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: GOOGLE_REDIRECT_URI,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        access_type: 'offline', // Request refresh token
        prompt: 'consent', // Always show consent screen
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

      // Redirect to Google
      window.location.href = authUrl;
    } catch (err) {
      console.error('Failed to initiate Google login:', err);
      setError('Failed to initiate Google login');
      setStatus('error');
    }
  }, [generateState]);

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  const handleCallback = useCallback(
    async (code: string, state: string): Promise<boolean> => {
      setStatus('processing');
      setError(null);

      try {
        // Verify state to prevent CSRF
        const savedState = sessionStorage.getItem(OAUTH_STATE_KEY);
        if (!savedState || savedState !== state) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Get code verifier for PKCE
        const codeVerifier = sessionStorage.getItem(CODE_VERIFIER_KEY);
        if (!codeVerifier) {
          throw new Error('Code verifier not found');
        }

        // Clean up sessionStorage
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        sessionStorage.removeItem(CODE_VERIFIER_KEY);

        // Exchange code for tokens via backend
        const response = await googleCodeAuth(
          code,
          GOOGLE_REDIRECT_URI,
          codeVerifier,
        );

        if (response.success) {
          // Login successful - store user and tokens
          login(response.data, {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
          });
          setStatus('success');
          return true;
        } else {
          throw new Error(response.message || 'Google login failed');
        }
      } catch (err: any) {
        console.error('Google OAuth callback error:', err);
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to complete Google login',
        );
        setStatus('error');
        // Clean up on error
        sessionStorage.removeItem(OAUTH_STATE_KEY);
        sessionStorage.removeItem(CODE_VERIFIER_KEY);
        return false;
      }
    },
    [login],
  );

  return {
    status,
    error,
    initiateGoogleLogin,
    handleCallback,
  };
}

export default useGoogleAuth;
