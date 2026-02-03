import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/useAuthStore';
import { API_BASE_URL } from '../../config/env';
import { getRefreshState, setRefreshState } from '../../config/axios';
import { Loader2 } from 'lucide-react';

interface AuthInitializerProps {
  children: React.ReactNode;
}

/**
 * AuthInitializer Component
 *
 * This component handles the initialization of auth state on app load.
 * When the page is reloaded, the access token (stored in memory) is lost,
 * but the refresh token (stored in localStorage) persists.
 *
 * This component:
 * 1. Checks if user was previously authenticated (has refresh token)
 * 2. Attempts to refresh the access token using the stored refresh token
 * 3. Shows loading state while initializing
 * 4. Only renders children after auth is initialized
 */
export const AuthInitializer: React.FC<AuthInitializerProps> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const setTokens = useAuthStore((state) => state.setTokens);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const logout = useAuthStore((state) => state.logout);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAuth = async () => {
      // If user is authenticated but no access token (page reload scenario)
      // Try to refresh the access token
      if (isAuthenticated && refreshToken && !getAccessToken()) {
        const { isRefreshing, refreshPromise } = getRefreshState();

        // Check if already refreshing (shared with axios interceptor)
        if (isRefreshing && refreshPromise) {
          console.log('[AuthInitializer] Waiting for existing refresh...');
          try {
            await refreshPromise;
          } catch {
            // Ignore - will check token below
          }
        } else {
          try {
            console.log(
              '[AuthInitializer] Refreshing access token on app load...',
            );

            // Set shared refresh state
            const promise = axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken: refreshToken,
            });
            setRefreshState(true, promise);

            const response = await promise;

            const { accessToken, refreshToken: newRefreshToken } =
              response.data;

            // Update tokens in store
            setTokens({
              accessToken,
              refreshToken: newRefreshToken || refreshToken,
            });

            console.log(
              '[AuthInitializer] Access token refreshed successfully',
            );
          } catch (error) {
            console.error(
              '[AuthInitializer] Failed to refresh access token:',
              error,
            );
            // If refresh fails, log the user out
            logout();
          } finally {
            setRefreshState(false, null);
          }
        }
      }

      // Mark auth as initialized
      setInitialized(true);
      setIsLoading(false);
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Show loading while initializing
  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
          <p className='text-sm text-muted-foreground'>Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthInitializer;
