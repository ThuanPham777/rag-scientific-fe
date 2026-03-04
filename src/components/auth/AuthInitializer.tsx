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
 * but the refresh token persists in the HTTP-only cookie (managed by the browser).
 *
 * This component:
 * 1. Checks if user was previously authenticated (persisted flag in localStorage)
 * 2. Attempts to refresh the access token using the HTTP-only cookie
 * 3. Shows loading state while initializing
 * 4. Only renders children after auth is initialized
 */
export const AuthInitializer: React.FC<AuthInitializerProps> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const hasInitialized = useRef(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const logout = useAuthStore((state) => state.logout);
  const getAccessToken = useAuthStore((state) => state.getAccessToken);
  const setUser = useAuthStore((state) => state.setUser);

  useEffect(() => {
    // Prevent double initialization in StrictMode
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeAuth = async () => {
      // If user is authenticated but no access token (page reload scenario)
      // Try to refresh the access token using the HTTP-only cookie
      if (isAuthenticated && !getAccessToken()) {
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
            // Cookie is sent automatically with withCredentials: true
            const promise = axios.post(
              `${API_BASE_URL}/auth/refresh`,
              {},
              { withCredentials: true },
            );
            setRefreshState(true, promise);

            const response = await promise;

            const { accessToken, data: user } = response.data;

            // Update access token in memory
            setAccessToken(accessToken);

            // Update user data if returned (keeps profile in sync)
            if (user) {
              setUser(user);
            }

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
