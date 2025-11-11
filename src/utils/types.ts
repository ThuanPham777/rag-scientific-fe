export type Paper = {
  id: string;
  name: string;
  size: number;
  pages?: number;
  createdAt?: string;

  // NEW: URL tạm để xem PDF (blob)
  localUrl?: string;
};

export type ChatRole = 'user' | 'assistant' | 'system';

export type Citation = {
  paperId: string;
  page?: number;
  title?: string;
  url?: string; // if backend gives a viewer link
  snippet?: string;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  imageDataUrl?: string;
  citations?: Citation[];
  createdAt: string;
};

export type Session = {
  id: string;
  paperIds: string[];
  messages: ChatMessage[];
};
