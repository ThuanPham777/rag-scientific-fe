// src/services/api/search.api.ts
// Global search API

import api from '../../config/axios';
import type { ApiResponse, SearchResult } from '../../utils/types';

/**
 * Global search: returns matching sessions (by title or linked paper) and notebooks.
 * @param q - Search query string (min 2 chars recommended)
 */
export async function globalSearch(q: string): Promise<SearchResult> {
  const { data } = await api.get<ApiResponse<SearchResult>>('/search', {
    params: { q },
  });
  return data.data;
}
