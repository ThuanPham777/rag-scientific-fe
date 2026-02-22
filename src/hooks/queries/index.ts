// src/hooks/queries/index.ts
// Barrel export for all query hooks and keys

// Paper queries and keys
export {
  paperKeys,
  usePapers,
  usePaper,
  useDeletePaper,
} from './usePaperQueries';

// Conversation queries and keys
export {
  conversationKeys,
  suggestedQuestionKeys,
  useConversations,
  useMultiPaperConversations,
  useConversation,
  useStartSession,
  useDeleteConversation,
  useSuggestedQuestions,
  useGenerateSuggestedQuestions,
  useGenerateFollowUpQuestions,
} from './useConversationQueries';

// Chat queries and keys
export {
  chatKeys,
  useMessageHistory,
  useInfiniteMessageHistory,
  flattenMessagePages,
  useSendMessage,
  useSendMultiPaperMessage,
  useExplainRegion,
  useClearChatHistory,
  useToggleReaction,
  useReplyToMessage,
  useDeleteMessage,
  updateMessageReactionsInCache,
  markMessageDeletedInCache,
} from './useChatQueries';

// Highlight queries and keys
export {
  highlightKeys,
  useHighlights,
  useHighlightWithComments,
  useHighlightComments,
  useCreateHighlight,
  useUpdateHighlight,
  useDeleteHighlight,
  useAddComment,
} from './useHighlightQueries';

// Comment queries and keys
export { useUpdateComment, useDeleteComment } from './useCommentQueries';

// Auth mutations
export {
  useLogin,
  useSignup,
  useGoogleIdTokenAuth,
  useLogout,
  useLogoutAll,
  useRefreshTokens,
  useForgotPassword,
  useResetPassword,
} from './useAuthMutations';

// Session queries and keys
export {
  sessionKeys,
  useSessions,
  useSessionDetail,
  useCreateSession,
  useJoinSession,
  useLeaveSession,
  useEndSession,
  useRemoveMember,
  useCreateInvite,
  useRevokeInvite,
  useActiveInvite,
  useResetInvite,
  useDeleteInvite,
} from './useSessionQueries';

// Folder queries and keys
export {
  folderKeys,
  useFolders,
  useFolder,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMovePaper,
} from './useFolderQueries';
