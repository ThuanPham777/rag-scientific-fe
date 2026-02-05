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
  useConversations,
  useMultiPaperConversations,
  useConversation,
  useStartSession,
  useDeleteConversation,
} from './useConversationQueries';

// Chat queries and keys
export {
  chatKeys,
  useMessageHistory,
  useSendMessage,
  useSendMultiPaperMessage,
  useExplainRegion,
  useClearChatHistory,
} from './useChatQueries';

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
