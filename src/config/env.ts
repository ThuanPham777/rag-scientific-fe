// API Base URL - NestJS Backend
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// RAG Service URL - Python FastAPI
export const RAG_API_URL =
  import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';

// =====================================================
// Google OAuth 2.0 Configuration
// =====================================================
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// OAuth redirect URI - must match the one registered in Google Console
export const GOOGLE_REDIRECT_URI =
  import.meta.env.VITE_GOOGLE_REDIRECT_URI ||
  `${window.location.origin}/auth/google/callback`;
