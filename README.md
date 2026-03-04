# 🎨 RAG Scientific - Frontend

<div align="center">

![React](https://img.shields.io/badge/React-19.1-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-06B6D4.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Modern React Frontend for RAG Scientific - AI-Powered Research Paper Analysis Platform**

[Features](#-features) • [Installation](#-installation) • [Architecture](#-architecture) • [Tech Stack](#️-tech-stack)

</div>

---

## 📋 Overview

Frontend application cho hệ thống RAG Scientific, cung cấp giao diện người dùng để:

- **Upload & View PDFs**: Drag-drop upload, interactive PDF viewer với zoom, search, fullscreen
- **AI Chat**: Hỏi đáp về nội dung papers với markdown rendering, LaTeX math, và citations
- **Collaborative Sessions**: Real-time multi-user chat, shared highlights, typing indicators via Socket.IO
- **Highlights & Comments**: Annotate PDFs với 5 màu highlights và threaded comments
- **Notebooks**: Rich-text editor (Tiptap) với collaborative editing qua Yjs CRDT
- **Library Management**: Tổ chức papers theo folders, search, bulk operations
- **Multi-Paper Analysis**: So sánh và phân tích nhiều papers cùng lúc
- **Guest Mode**: Dùng thử không cần đăng ký, migrate data khi tạo tài khoản

## ✨ Features

| Feature                       | Description                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| 📄 **PDF Viewer**             | Interactive viewer với zoom, search, keyboard shortcuts, fullscreen     |
| 💬 **AI Chat**                | Real-time Q&A với markdown, LaTeX/KaTeX, và citations có bounding boxes |
| 🤝 **Collaborative Sessions** | Real-time multi-user chat, shared highlights, cursor sync via Socket.IO |
| 🎯 **Region Selection**       | Click-drag chọn vùng trong PDF (hình/bảng) để hỏi AI multimodal         |
| 📁 **Library & Folders**      | Quản lý papers theo thư mục, drag-drop, search semantic                 |
| 📓 **Notebooks**              | Rich-text editor (Tiptap) với Ask AI và collaborative editing (Yjs)     |
| 🔍 **Related Papers**         | Tìm papers liên quan từ arXiv với AI re-ranking                         |
| 💡 **Suggestions**            | AI-generated câu hỏi gợi ý + follow-up questions                        |
| ✏️ **Highlights & Comments**  | Highlight text (5 colors) và threaded comments trên PDF                 |
| 💬 **Reactions & Replies**    | React với emoji và reply threaded messages                              |
| 📊 **Multi-Paper Chat**       | So sánh và phân tích cross-paper (tối đa 10 papers)                     |
| 📤 **Export**                 | Export notebooks ra DOCX, PDF                                           |
| 🌙 **Dark Mode**              | Support dark/light theme via OKLCH color system                         |
| 📱 **Responsive**             | Mobile-friendly design                                                  |
| 🔐 **Auth**                   | Google OAuth 2.0 + Email/Password với JWT token rotation                |
| 👤 **Guest Mode**             | Dùng thử không cần đăng ký (auto-migrate khi login)                     |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            React App                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                          Router                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │  Home    │ │  Library │ │ Notebook │ │    ChatPage      │  │  │
│  │  │  Upload  │ │  Folders │ │  Editor  │ │  (PDF + Chat)    │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                     State Management                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │  │
│  │  │ Zustand  │  │  React   │  │ useAuth  │  │ useSession   │  │  │
│  │  │ (8 stores)│ │  Query   │  │  Store   │  │   Store      │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┴───────────────────────────────────┐  │
│  │                      API Services                              │  │
│  │  auth │ paper │ chat │ conversation │ session │ highlight │    │  │
│  │  folder │ guest │ comment │ notebook                          │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │ HTTP (REST)     │ Socket.IO        │ Raw WebSocket
              ▼                 ▼                  ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌──────────────────┐
    │  NestJS Backend │ │  NestJS WS      │ │ Yjs WS Server    │
    │  (Port 3000)    │ │  /session ns    │ │ (Port 1234)      │
    └─────────────────┘ └─────────────────┘ └──────────────────┘
```

### State Management Pattern

| Layer           | Công nghệ                           | Dữ liệu                                                              |
| --------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Server State    | React Query (@tanstack/react-query) | Papers, conversations, messages, folders, highlights, sessions, etc. |
| Client/UI State | Zustand                             | Auth tokens, selected paper, typing indicators, UI toggles           |

**Key Design Decisions:**

- Access token giữ trong memory (không localStorage) → bảo mật hơn
- Refresh token persisted → automatic silent refresh với request queuing khi 401
- Guest data persisted → auto-migrate sang user account khi đăng nhập

## 📁 Project Structure

```
rag-scientific-fe/
├── public/                       # Static assets
├── src/
│   ├── components/
│   │   ├── auth/                # 🔐 Auth components
│   │   │   ├── AuthInitializer.tsx    # Auto-refresh tokens on app load
│   │   │   ├── AuthModal.tsx          # Login/Signup modal overlay
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── GoogleButton.tsx       # Google OAuth button
│   │   │   ├── ProtectedRoute.tsx     # Route guard
│   │   │   ├── Divider.tsx
│   │   │   └── SwitchModeText.tsx
│   │   │
│   │   ├── chat/                # 💬 Chat components
│   │   │   ├── ChatDock.tsx           # Main chat panel container
│   │   │   ├── ChatInput.tsx          # Message input with reply preview
│   │   │   ├── ChatMessage.tsx        # Message bubble wrapper
│   │   │   ├── ChatMessageLoading.tsx # Skeleton loading state
│   │   │   ├── ChatQuickActions.tsx   # Quick action buttons
│   │   │   ├── ChatSuggestions.tsx    # AI suggested questions
│   │   │   └── message/              # Message sub-components
│   │   │       ├── CitationLink.tsx       # Clickable citation [S1]
│   │   │       ├── DateSeparator.tsx      # Day boundary separator
│   │   │       ├── EmojiReactionPicker.tsx # Emoji picker popup
│   │   │       ├── HoverTimestamp.tsx     # Timestamp on hover
│   │   │       ├── MarkdownContent.tsx    # Markdown + LaTeX renderer
│   │   │       ├── MessageBubble.tsx      # Message layout & styling
│   │   │       ├── MessageHoverActions.tsx # Reply/react on hover
│   │   │       ├── NewMessageButton.tsx   # Scroll-to-bottom button
│   │   │       ├── ReactionBadges.tsx     # Emoji reaction badges
│   │   │       ├── ReactionTooltip.tsx    # Who reacted tooltip
│   │   │       ├── ReplyInputPreview.tsx  # Preview of message being replied to
│   │   │       ├── ReplyPreview.tsx       # Referenced reply in message
│   │   │       ├── SourcesModal.tsx       # Full citation details modal
│   │   │       ├── SourcesSection.tsx     # Citation list below message
│   │   │       └── SystemMessage.tsx      # System messages (join/leave)
│   │   │
│   │   ├── pdf/                 # 📄 PDF Viewer
│   │   │   ├── PdfViewer.tsx          # Main PDF render component
│   │   │   ├── PdfPanel.tsx           # Container with toolbar & tabs
│   │   │   ├── PdfPages.tsx           # Page rendering logic
│   │   │   ├── PdfToolbar.tsx         # Zoom, page, search controls
│   │   │   ├── SelectionActionMenu.tsx # Region selection popup menu
│   │   │   ├── SummaryView.tsx        # Paper summary tab
│   │   │   ├── RelatedPapersView.tsx  # Related papers tab
│   │   │   ├── HighlightEditor.tsx    # Highlight create/edit UI
│   │   │   └── HighlightPopup.tsx     # Highlight tooltip popup
│   │   │
│   │   ├── library/             # 📁 Library management
│   │   │   ├── PaperTable.tsx         # Paper list/table
│   │   │   ├── UploadDialog.tsx       # Upload progress dialog
│   │   │   ├── FolderSidebar.tsx      # Folder navigation sidebar
│   │   │   ├── FolderDialogs.tsx      # Create/rename folder dialogs
│   │   │   ├── DeletePaperDialog.tsx  # Delete paper confirmation
│   │   │   └── MovePaperDialog.tsx    # Move paper to folder
│   │   │
│   │   ├── notebook/            # 📓 Notebook components
│   │   │   ├── NotebookEditor.tsx         # Tiptap rich-text editor
│   │   │   ├── NotebookListTable.tsx      # Notebook list view
│   │   │   ├── NotebookPanel.tsx          # Side panel in ChatPage
│   │   │   └── CustomCollaborationCursor.ts # Yjs collaboration cursor extension
│   │   │
│   │   ├── session/             # 🤝 Collaborative session components
│   │   │   ├── SessionBar.tsx             # Session header bar
│   │   │   ├── MembersList.tsx            # Online members list
│   │   │   ├── MembersModal.tsx           # Full members management modal
│   │   │   ├── InviteModal.tsx            # Generate/copy invite link
│   │   │   ├── TypingIndicator.tsx        # "User is typing..." indicator
│   │   │   ├── StartSessionButton.tsx     # Start session CTA
│   │   │   └── ConfirmStartSessionModal.tsx # Confirm modal
│   │   │
│   │   ├── layout/              # 🎨 Layout components
│   │   │   ├── AppChrome.tsx          # App shell (sidebar + topnav + content)
│   │   │   ├── TopNav.tsx             # Top navigation bar
│   │   │   └── LeftDock.tsx           # Left sidebar navigation
│   │   │
│   │   ├── uploader/            # ⬆️ File upload
│   │   │   ├── FileDropzone.tsx       # Drag-drop upload zone
│   │   │   └── FolderSelectModal.tsx  # Select target folder on upload
│   │   │
│   │   ├── common/              # 🔧 Shared components
│   │   │   ├── ConfirmModal.tsx       # Reusable confirm dialog
│   │   │   ├── ProgressBar.tsx        # Progress indicator
│   │   │   └── UserAvatar.tsx         # User avatar with fallback
│   │   │
│   │   └── ui/                  # 🧱 UI primitives (shadcn/ui + Radix)
│   │       ├── button.tsx, checkbox.tsx, dialog.tsx
│   │       ├── dropdown-menu.tsx, input.tsx, label.tsx
│   │       ├── switch.tsx, textarea.tsx, tooltip.tsx
│   │       └── loading/loading.tsx
│   │
│   ├── pages/                   # 📄 Route pages
│   │   ├── HomeUpload.tsx             # Landing page + guest upload
│   │   ├── ChatPage.tsx               # Main app: PDF viewer + Chat + Notebook panel
│   │   ├── MyLibraryPage.tsx          # Library: papers + folders
│   │   ├── NotebookPage.tsx           # Notebook list page
│   │   ├── NotebookViewerPage.tsx     # Full-page notebook editor (Tiptap + Yjs)
│   │   ├── JoinSessionPage.tsx        # Join collaborative session via invite link
│   │   ├── JoinNotebookPage.tsx       # Join collaborative notebook via share token
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── ForgotPasswordPage.tsx
│   │   ├── ResetPasswordPage.tsx
│   │   └── GoogleCallbackPage.tsx     # Google OAuth callback handler
│   │
│   ├── hooks/                   # 🎣 Custom hooks
│   │   ├── useSessionSocket.ts        # Socket.IO connection management
│   │   ├── useGuestMigration.ts       # Migrate guest data on login
│   │   │
│   │   ├── auth/                      # Auth hooks
│   │   │   └── useGoogleAuth.ts       # Google OAuth flow
│   │   │
│   │   ├── queries/                   # React Query hooks
│   │   │   ├── useAuthMutations.ts    # Login, signup, logout mutations
│   │   │   ├── usePaperQueries.ts     # Papers CRUD + search
│   │   │   ├── useChatQueries.ts      # Chat messages + reactions
│   │   │   ├── useConversationQueries.ts # Conversations + suggestions
│   │   │   ├── useFolderQueries.ts    # Folders CRUD
│   │   │   ├── useHighlightQueries.ts # Highlights CRUD
│   │   │   ├── useCommentQueries.ts   # Comments on highlights
│   │   │   └── useSessionQueries.ts   # Session management
│   │   │
│   │   ├── pdf/                       # PDF viewer hooks
│   │   │   ├── usePdfState.ts         # PDF viewer state management
│   │   │   ├── usePdfZoom.ts          # Zoom controls
│   │   │   ├── usePdfSearch.ts        # Text search in PDF
│   │   │   ├── usePdfJump.ts          # Jump to page/citation
│   │   │   ├── usePdfCapture.ts       # Region capture for AI
│   │   │   ├── usePdfFullscreen.ts    # Fullscreen toggle
│   │   │   ├── usePdfKeyboard.ts      # Keyboard shortcuts
│   │   │   ├── usePdfHighlightsSync.ts # Sync highlights with backend
│   │   │   └── usePdfSelectionActionMenu.ts # Text selection popup
│   │   │
│   │   └── multi-chat/               # Multi-paper chat hooks
│   │       ├── useMultiPaperChat.ts   # Multi-paper Q&A orchestration
│   │       ├── usePaperActions.ts     # Paper selection actions
│   │       └── useUpload.ts           # Upload handling
│   │
│   ├── services/                # 🔌 API & services
│   │   ├── api/                       # REST API clients (Axios)
│   │   │   ├── auth.api.ts            # Auth endpoints
│   │   │   ├── paper.api.ts           # Paper CRUD + summary + search
│   │   │   ├── chat.api.ts            # Chat Q&A + reactions + replies
│   │   │   ├── conversation.api.ts    # Conversation CRUD + suggestions
│   │   │   ├── session.api.ts         # Session + invite management
│   │   │   ├── highlight.api.ts       # Highlights + comments
│   │   │   ├── comment.api.ts         # Comment update/delete
│   │   │   ├── folder.api.ts          # Folder CRUD + move paper
│   │   │   ├── guest.api.ts           # Guest upload/ask/status
│   │   │   └── rag.api.ts             # RAG direct calls (placeholder)
│   │   │
│   │   ├── notebookService.ts         # Notebook CRUD + share + collab
│   │   └── socket.ts                  # Socket.IO client (/session namespace)
│   │
│   ├── store/                   # 🗃️ Zustand stores
│   │   ├── useAuthStore.ts            # Auth state (persisted: refresh token + user)
│   │   ├── usePaperStore.ts           # Current paper, conversation, chat state
│   │   ├── useMultiPaperChatStore.ts  # Multi-paper selection UI
│   │   ├── useGuestStore.ts           # Guest session data (persisted)
│   │   ├── useGuestLimitStore.ts      # Guest usage limits (persisted)
│   │   ├── useFolderStore.ts          # Selected folder in library
│   │   ├── useSessionStore.ts         # Session members, typing, modals
│   │   └── useUiStore.ts              # Notebook panel, pending actions
│   │
│   ├── config/                  # ⚙️ Configuration
│   │   ├── axios.ts                   # Axios instance + JWT interceptors + 401 refresh
│   │   └── env.ts                     # Environment variable exports
│   │
│   ├── lib/                     # 📚 Shared libraries
│   │   └── utils.ts                   # cn() helper (clsx + tailwind-merge)
│   │
│   ├── utils/                   # 🔧 Utilities
│   │   ├── types.ts                   # All shared TypeScript types (406 lines)
│   │   ├── citation.ts               # Parse RAG citations with bbox normalization
│   │   ├── file.ts                    # PDF validation (max 100MB)
│   │   ├── formatSmartDate.ts         # Smart date: today → time, else → "Feb 12"
│   │   ├── formatTimestamp.ts         # Chat timestamps + day separators
│   │   └── latexSanitizer.ts          # Sanitize malformed LaTeX from AI responses
│   │
│   ├── types/                   # 📋 Additional types
│   │   └── upload.ts                  # Upload status & item types
│   │
│   ├── styles/                  # 🎨 Design tokens
│   │   └── theme.ts                   # JS design tokens (colors, spacing, etc.)
│   │
│   ├── providers/               # 🎁 React providers
│   │   └── QueryProvider.tsx          # TanStack QueryClient (5min stale, 10min GC)
│   │
│   ├── App.tsx                  # Root component with routing
│   ├── main.tsx                 # Entry point (providers stack)
│   └── index.css                # TailwindCSS v4 config + theme + dark mode
│
├── index.html
├── vite.config.ts               # Vite + React + TailwindCSS plugin, @ alias
├── components.json              # shadcn/ui config (new-york style)
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── eslint.config.js
└── package.json
```

## 🗺️ Routes

### Standalone Routes (no layout)

| Path                    | Page                 | Auth   | Description                   |
| ----------------------- | -------------------- | ------ | ----------------------------- |
| `/auth/google/callback` | `GoogleCallbackPage` | Public | Google OAuth redirect handler |
| `/forgot-password`      | `ForgotPasswordPage` | Public | Password recovery form        |
| `/reset-password`       | `ResetPasswordPage`  | Public | Reset password with token     |
| `/session/join/:token`  | `JoinSessionPage`    | Public | Join collaborative session    |
| `/notebook/join/:token` | `JoinNotebookPage`   | Public | Join collaborative notebook   |

### Routes with Layout (AppChrome)

| Path                        | Page                 | Auth      | Description                     |
| --------------------------- | -------------------- | --------- | ------------------------------- |
| `/`                         | `HomeUpload`         | Public    | Landing page + guest upload     |
| `/library`                  | `MyLibraryPage`      | Protected | Library: papers + folders       |
| `/library/folder/:folderId` | `MyLibraryPage`      | Protected | Library filtered by folder      |
| `/notebooks`                | `NotebookPage`       | Protected | Notebook list                   |
| `/notebooks/:id`            | `NotebookViewerPage` | Protected | Notebook editor (Tiptap + Yjs)  |
| `/chat`                     | `ChatPage`           | Public    | Chat page (guest or auth)       |
| `/chat/:conversationId`     | `ChatPage`           | Public    | Chat with specific conversation |

## 🚀 Installation

### Prerequisites

- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0

### 1. Install Dependencies

```bash
cd rag-scientific-fe
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# NestJS Backend API
VITE_API_BASE_URL=http://localhost:3000

# Python RAG Service (direct calls, optional)
VITE_RAG_API_URL=http://localhost:8000

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
```

### 3. Start Development Server

```bash
npm run dev
```

App sẽ chạy tại: `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
npm run preview
```

## 🛠️ Tech Stack

| Category               | Technology                                                        |
| ---------------------- | ----------------------------------------------------------------- |
| **Framework**          | React 19.1                                                        |
| **Language**           | TypeScript 5.9                                                    |
| **Build Tool**         | Vite 7.1 + @vitejs/plugin-react                                   |
| **Styling**            | TailwindCSS 4.1 (CSS-first config, OKLCH colors, `@theme inline`) |
| **UI Components**      | shadcn/ui (new-york) + Radix UI primitives                        |
| **State (Server)**     | TanStack React Query 5.90                                         |
| **State (Client)**     | Zustand 5.0                                                       |
| **Forms**              | React Hook Form 7.71 + Zod 4.3                                    |
| **Rich-Text Editor**   | Tiptap 3.x (full suite)                                           |
| **Real-time (Chat)**   | Socket.IO Client 4.8                                              |
| **Real-time (Collab)** | Yjs 13.6 + y-websocket 3.0 (CRDT collaborative editing)           |
| **PDF Viewer**         | react-pdf 10.1 + react-pdf-highlighter 8.0-rc.0                   |
| **Routing**            | React Router DOM 7.9                                              |
| **HTTP Client**        | Axios 1.12                                                        |
| **Markdown**           | react-markdown 10.1 + remark-gfm + remark-math + rehype-katex     |
| **Math Rendering**     | KaTeX 0.16                                                        |
| **Icons**              | Lucide React                                                      |
| **Toasts**             | Sonner 2.0                                                        |
| **Export**             | docx + html-to-docx + html2canvas + html2pdf.js                   |

## 🔧 Available Scripts

```bash
npm run dev          # Start development server (Vite HMR)
npm run build        # TypeScript check + Vite production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

## 🎯 Key Features Deep Dive

### PDF Viewer with Region Selection

```tsx
// Click-drag to select a region, then ask AI about it
// AI responds in the same language as your query
<PdfViewer
  fileUrl={paper.fileUrl}
  onRegionSelect={(region, imageB64) => {
    askAboutRegion(region, imageB64);
  }}
/>
```

**PDF Hooks ecosystem:** `usePdfState`, `usePdfZoom`, `usePdfSearch`, `usePdfJump`, `usePdfCapture`, `usePdfFullscreen`, `usePdfKeyboard`, `usePdfHighlightsSync`, `usePdfSelectionActionMenu`

### AI Chat with Citations & LaTeX

```tsx
// Citations rendered as clickable [S1] links with bounding boxes
// LaTeX equations rendered via KaTeX
// Malformed LaTeX auto-sanitized by latexSanitizer.ts
<ChatMessage
  message={{
    content: 'The loss function $L = -\\sum p \\log q$ uses [S1]...',
    citations: [{ sourceId: 'S1', pageNumber: 5, bbox: {...} }],
  }}
  onCitationClick={(citation) => {
    // Navigate PDF to exact citation location (page + bbox)
    pdfViewer.scrollToPage(citation.pageNumber);
  }}
/>
```

### Collaborative Sessions (Socket.IO)

```tsx
// Real-time collaborative chat on /session namespace
import { useSessionSocket } from '@/hooks/useSessionSocket';

// Auto-connects with JWT auth, joins room
const { socket } = useSessionSocket(conversationId);

// Events: new-message, typing, highlight-added/updated/deleted,
// comment-added/updated/deleted, reaction-update, message-deleted,
// user-joined/left, member-removed, assistant-thinking, cursor-move
```

### Collaborative Notebooks (Yjs CRDT)

```tsx
// Real-time collaborative editing via Yjs + y-websocket
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Collaboration } from '@tiptap/extension-collaboration';

const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:1234',
  notebookId, // room = notebook UUID
  ydoc,
);

const editor = new Editor({
  extensions: [
    Collaboration.configure({ document: ydoc }),
    // ... Tiptap extensions
  ],
});
```

### Multi-Paper Chat

```tsx
// Compare multiple papers in one conversation
const { askMultiPaper } = useMultiPaperChat();

askMultiPaper({
  paperIds: ['paper-1-id', 'paper-2-id'],
  question: 'Compare the methodologies used',
});
```

### Guest Mode with Migration

```tsx
// Guest can upload 1 PDF + ask 1 question without account
// On login/signup, guest data auto-migrates to user account
import { useGuestMigration } from '@/hooks/useGuestMigration';
```

## 🔗 Related Services

| Service                  | Port | Description                                  |
| ------------------------ | ---- | -------------------------------------------- |
| **rag-scientific-fe**    | 5173 | This service (React SPA)                     |
| **rag-scientific-be**    | 3000 | NestJS Backend API + Socket.IO (/session ns) |
| **Pipeline_RAG**         | 8000 | Python FastAPI RAG Service                   |
| **Yjs WebSocket Server** | 1234 | Collaborative notebook editing (y-websocket) |

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**[⬆ Back to Top](#-rag-scientific---frontend)**

Made with ❤️ using React + Vite

</div>
