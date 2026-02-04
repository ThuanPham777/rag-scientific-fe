import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from './env';
import { useAuthStore } from '../store/useAuthStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 500000, // 500s
  headers: {
    'Content-Type': 'application/json',
  },
});

// =====================================================
// Token Refresh Queue Management
// Handles concurrent 401s - only one refresh request at a time
// =====================================================
let isRefreshing = false;
let refreshPromise: Promise<any> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

// Export for use in AuthInitializer to coordinate refresh
export const getRefreshState = () => ({ isRefreshing, refreshPromise });
export const setRefreshState = (
  refreshing: boolean,
  promise: Promise<any> | null = null,
) => {
  isRefreshing = refreshing;
  refreshPromise = promise;
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

/**
 * Force logout - clear all tokens and redirect to login
 */
const forceLogout = () => {
  const { logout } = useAuthStore.getState();
  logout();
  // Only redirect if not already on login page
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/';
  }
};

// =========================
// 🔹 Request Interceptor
// =========================
api.interceptors.request.use(
  (config) => {
    // Get access token from in-memory store (not localStorage)
    const token = useAuthStore.getState().getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// =========================
// 🔹 Response Interceptor
// =========================
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Skip token refresh for auth endpoints (login, signup, refresh, google)
    // These should just return the error directly without triggering logout
    const authEndpoints = [
      '/auth/login',
      '/auth/signup',
      '/auth/refresh',
      '/auth/google',
    ];
    const isAuthEndpoint = authEndpoints.some((ep) =>
      originalRequest?.url?.includes(ep),
    );
    if (isAuthEndpoint) {
      return Promise.reject(error);
    }

    // Handle 401 - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if auth is initialized - if not, let AuthInitializer handle it
      const { isInitialized } = useAuthStore.getState();
      if (!isInitialized) {
        // Auth not initialized yet, don't try to refresh here
        return Promise.reject(error);
      }

      // If already refreshing, queue this request
      if (isRefreshing && refreshPromise) {
        return refreshPromise
          .then(() => {
            const token = useAuthStore.getState().getAccessToken();
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            }
            return Promise.reject(error);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      // Get refresh token from store
      const refreshToken = useAuthStore.getState().getRefreshToken();

      if (!refreshToken) {
        // No refresh token - force logout
        isRefreshing = false;
        processQueue(new Error('No refresh token'), null);
        forceLogout();
        return Promise.reject(error);
      }

      try {
        // Call refresh endpoint
        refreshPromise = axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const response = await refreshPromise;

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in store (access token in memory, refresh in persisted store)
        useAuthStore.getState().setTokens({
          accessToken,
          refreshToken: newRefreshToken,
        });

        // Process queued requests with new token
        processQueue(null, accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - force logout
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    // Handle other errors
    if (error.response) {
      const { status, data } = error.response;

      if (status >= 500) {
        console.error('💥 Server error:', data);
      }
    } else if (error.request) {
      console.error('❌ No response from server:', error.message);
    } else {
      console.error('❌ Axios config error:', error.message);
    }

    return Promise.reject(error);
  },
);

export default api;
