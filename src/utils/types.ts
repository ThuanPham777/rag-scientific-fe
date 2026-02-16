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
  type?: 'SINGLE_PAPER' | 'MULTI_PAPER' | 'GROUP';
  isCollaborative?: boolean;
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

export type ReactionAggregate = {
  emoji: string;
  count: number;
  hasReacted: boolean;
  reactedBy?: Array<{ userId: string; displayName: string }>;
};

export type ReplyToMessage = {
  id: string;
  content: string;
  role: string;
  displayName?: string;
  isDeleted?: boolean;
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
  createdAt: string; // Collaborative session fields
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  // Reaction, reply, delete fields
  reactions?: ReactionAggregate[];
  replyTo?: ReplyToMessage;
  replyToMessageId?: string;
  isDeleted?: boolean;
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
  // Collaborative session: author info
  user?: {
    displayName?: string;
    avatarUrl?: string;
  };
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
  // Collaborative session: author info
  user?: {
    displayName?: string;
    avatarUrl?: string;
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

// ============================
// 🔹 Cursor Pagination Types
// ============================
export interface CursorPaginationMeta {
  limit: number;
  nextCursor?: string;
  prevCursor?: string;
  hasNext: boolean;
  hasPrev: boolean;
  count: number;
}

export interface CursorPaginatedResponse<T> {
  items: T[];
  pagination: CursorPaginationMeta;
}

// ============================
// 🔹 Collaborative Session Types
// ============================
export type SessionRole = 'OWNER' | 'MEMBER';

export type SessionMember = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: SessionRole;
  joinedAt: string;
};

export type SessionDetail = {
  conversationId: string;
  sessionCode: string;
  isCollaborative: boolean;
  maxMembers: number;
  memberCount: number;
  members: SessionMember[];
  paperId?: string;
  paperTitle?: string;
  paperFileName?: string;
  paperUrl?: string;
  createdAt: string;
};

// Result returned from POST /sessions (createSession)
export type CreateSessionResult = {
  conversationId: string;
  paperId: string;
  sessionCode: string;
  inviteLink: string;
  inviteToken: string;
  expiresAt: string;
  maxMembers: number;
};

export type SessionInvite = {
  inviteToken: string;
  inviteLink: string;
  expiresAt: string;
  maxUses: number;
};

export type OnlineMember = {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
};

export type TypingIndicator = {
  userId: string;
  displayName: string;
  isTyping: boolean;
};

export type SessionMessageEvent = {
  id: string;
  role: string;
  content: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string;
  imageUrl?: string;
  context?: any;
  replyToMessageId?: string;
  replyTo?: ReplyToMessage;
  createdAt: string;
};

export type ReactionUpdateEvent = {
  messageId: string;
  reactions: ReactionAggregate[];
  action: 'added' | 'removed' | 'updated';
  userId: string;
  emoji: string;
};

export type MessageDeletedEvent = {
  messageId: string;
  userId: string;
};
