// src/services/api/rag.api.ts
// RAG (Retrieval Augmented Generation) direct API calls
// These bypass the NestJS backend and go directly to the Python RAG service

import axios from 'axios';
import type { RelatedPapersResponse } from '../../utils/types';

const RAG_API_URL = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000';

/**
 * Get related papers for a document
 */
export async function getRelatedPapers(
  fileId: string,
): Promise<RelatedPapersResponse> {
  const { data } = await axios.post(`${RAG_API_URL}/related-papers`, {
    file_id: fileId,
  });
  return data;
}

/**
 * Generate brainstorm questions for a document
 */
export async function brainstormQuestions(fileId: string): Promise<string[]> {
  const { data } = await axios.post(`${RAG_API_URL}/brainstorm-questions`, {
    file_id: fileId,
  });
  return data.questions;
}
