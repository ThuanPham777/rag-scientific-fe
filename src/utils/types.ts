// ============================
// 🔹 Auth Types
// ============================
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export type User = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider: AuthProvider;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  data: User;
  accessToken: string;
  refreshToken: string;
};

export type SignupResponse = {
  success: boolean;
  message: string;
  data: User;
};

// ============================
// 🔹 Forgot / Reset Password Types
// ============================
export type ForgotPasswordResponse = {
  success: boolean;
  message: string;
};

export type ResetPasswordResponse = {
  success: boolean;
  message: string;
};

// ============================
// 🔹 Paper Types
// ============================
export type PaperStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type Paper = {
  id: string;
  ragFileId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  title?: string;
  abstract?: string;
  status: PaperStatus;
  nodeCount?: number;
  tableCount?: number;
  imageCount?: number;
  createdAt: string;
  processedAt?: string;
  // Local only - for PDF preview
  localUrl?: string;
};

// ============================
// 🔹 Conversation Types
// ============================
export type Conversation = {
  id: string;
  paperId: string;
  userId: string;
  title?: string;
  ragFileId?: string;
  paperTitle?: string;
  createdAt: string;
  updatedAt: string;
};

// ============================
// 🔹 Chat Types
// ============================
export type ChatRole = 'user' | 'assistant' | 'system';
export type MessageRole = 'USER' | 'ASSISTANT';

export type Citation = {
  paperId: string;
  page?: number;
  title?: string;
  url?: string;
  snippet?: string;
  sourceId?: string;
  rect?: { top: number; left: number; width: number; height: number };
  rawBBox?: any;
  layoutWidth?: number;
  layoutHeight?: number;
  // Multi-paper citation fields
  sourcePaperId?: string; // Paper ID this citation belongs to
  sourcePaperTitle?: string; // Paper title for display
  sourceFileUrl?: string; // PDF URL for navigation
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string;
  imageDataUrl?: string; // For local display
  citations?: Citation[];
  modelName?: string;
  tokenCount?: number;
  createdAt: string;
};

export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  imageUrl?: string;
  modelName?: string;
  tokenCount?: number;
  createdAt: string;
};

export type ChatSession = {
  id: string; // conversationId
  paperId: string;
  ragFileId?: string;
  title?: string;
  messages: ChatMessage[];
};

// Backward compatibility alias
/** @deprecated Use ChatSession instead */
export type Session = ChatSession;

// ============================
// 🔹 Related Papers Types
// ============================
export interface RelatedPaperItem {
  arxivId: string;
  title: string;
  abstract: string;
  authors: string[];
  url: string;
  score: number;
  reason: string;
  categories?: string[];
  orderIndex?: number;
}

export interface RelatedPapersResponse {
  paperId: string;
  results: RelatedPaperItem[];
  fromCache: boolean;
}

export interface BrainstormQuestionsResponse {
  questions: string[];
}

// ============================
// 🔹 Suggested Questions (conversation-level)
// ============================
export interface SuggestedQuestionItem {
  id: string;
  question: string;
}

export interface SuggestedQuestionsResult {
  conversationId: string;
  questions: SuggestedQuestionItem[];
}

// ============================
// 🔹 Follow-Up Questions (message-level, ephemeral)
// ============================
export interface FollowUpQuestionsResult {
  messageId: string;
  questions: string[];
}

export interface SummaryResult {
  paperId: string;
  summary: string;
}

// ============================
// 🔹 Folder Types (My Library)
// ============================
export type Folder = {
  id: string;
  userId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    papers: number;
  };
};

export type FolderWithPapers = Folder & {
  papers: Paper[];
};

// ============================
// 🔹 API Response Highlight
// ============================

export type HighlightColor =
  | 'YELLOW'
  | 'RED'
  | 'GREEN'
  | 'BLUE'
  | 'PURPLE'
  | 'ORANGE'
  | 'PINK';

export type SelectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HighlightComment = {
  id: string;
  highlightId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type HighlightItem = {
  id: string;
  paperId: string;
  userId: string;
  pageNumber: number;
  selectionRects: SelectionRect[];
  selectedText: string;
  textPrefix?: string;
  textSuffix?: string;
  color: HighlightColor;
  createdAt: string;
  updatedAt: string;
  _count: {
    comments: number;
  };
};

export type HighlightItemWithComments = HighlightItem & {
  comments: HighlightComment[];
};

// ============================
// 🔹 API Response Types
// ============================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
