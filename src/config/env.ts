// API Base URL - NestJS Backend
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// RAG Service URL - Python FastAPI
export const RAG_API_URL =
  import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';
