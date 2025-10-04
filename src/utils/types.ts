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
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: Citation[];
  createdAt: string;
};

export type Session = {
  id: string; // chat session id returned by backend
  paperIds: string[];
  messages: ChatMessage[];
  activePaperId?: string;
};
