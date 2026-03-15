# Frontend Architecture (rag-scientific-fe)

The frontend for RAG Scientific is a modern Single Page Application (SPA) built with React 19.1 and Vite. It provides an interactive interface for reading PDFs, asking AI questions, and real-time collaboration.

## 1. Overview
- **Tech Stack**: React 19.1, TypeScript 5.9, Vite 7.1, TailwindCSS 4.1.
- **Port**: `5173`.
- **UI Architecture**: Component-based UI using `shadcn/ui` and Radix primitives. Organized into feature-specific directories under `src/components`.

## 2. State Management
The application employs a dual-state management pattern:
- **Server State**: Managed by `@tanstack/react-query` to handle fetching, caching, and updating server data (e.g., papers, chat history, folders). Hooks are located in `src/hooks/queries`.
- **Client State**: Managed by `Zustand` for local, synchronous UI state, authentication tokens, and user preferences. Stores are located in `src/store`.

## 3. Communication and APIs
- **REST API Modules**: Located in `src/services/api/` using `axios`. They handle standard CRUD operations against the NestJS backend on port `3000`.
- **WebSocket (Socket.IO)**: Used for real-time collaborative sessions (chat, PDF cursors, live highlights). Connects to `/session` namespace on the NestJS backend. Managed via `src/hooks/useSessionSocket.ts`.
- **CRDT / Yjs**: Connects to the standalone Y-websocket server on port `1234` for conflict-free replicated data type editing in Notebooks (Tiptap editor).

## 4. Key Subsystems
- **PDF Viewer (`src/components/pdf`)**: Uses `react-pdf` and `react-pdf-highlighter`. Supports drawing regions, selecting text, highlighting, and keeping track of zoom/scroll state.
- **Chat (`src/components/chat`)**: Complex messaging UI with markdown rendering (`react-markdown`), mathematical equation rendering (`KaTeX`), and citation linking that can navigate the PDF viewer.
  - *Multi-PDF UI*: Features a "Browser-like Tab Bar" overlay in the chat page to visualize and hot-swap between multiple active papers in a given conversation. It seamlessly connects with concurrent background uploading for an optimistic uploading experience.
- **Library (`src/components/library`)**: Folder and document management interfaces.
- **Auth / Guest System**: Supports Google OAuth, standard Email/Password, and a "Guest Mode" where temporary functionality is allowed and data is migrated upon signup.

## 5. User Profile Page (Added)
- **Route**: `GET /profile` (protected, requires authentication).
- **Entry point**: `TopNav.tsx` avatar dropdown → **"My Account"** link.
- **Page**: `src/pages/ProfilePage.tsx` — two tabs:
  - **Profile tab**: Edit display name and avatar URL. Change password form (shown only for LOCAL accounts).
  - **Dashboard tab**: Stat cards (papers uploaded, conversations, collaborative sessions) and account timeline (member since, last login).
- **API service**: `src/services/api/user.api.ts` — `getMe`, `updateProfile`, `changePassword`.
- **Hooks**: `src/hooks/queries/useUserQueries.ts` — `useGetMe`, `useUpdateProfile` (syncs Zustand on success), `useChangePassword`.
- **Layout change**: Removed redundant `User` icon from the bottom of `LeftDock.tsx`.

## 6. Admin UI (Added)
- **Routes**: `/admin/dashboard`, `/admin/users`, `/admin/users/:id` protected by `AdminRoute` wrapper which verifies `SUPERADMIN` role.
- **Integration**: Integrated into the main `AppChrome` layout. Admin navigation icons appear conditionally in `LeftDock.tsx` for superadmins with a distinct orange highlight.
- **Pages**: Standardized light mode UI matching the rest of the application.
- **Hooks**: Located in `src/hooks/useAdmin.ts` wrapping `react-query` mutations/queries over `src/services/api/admin.api.ts`.
- **Capabilities**: View system-wide statistics, list users, manage users (activate, deactivate, reset passwords, delete), and create new users.

Overall, the frontend strictly separates UI layout, global state, API definitions, and custom hooks for concise and maintainable React code.

## 7. Session History (Added)

### Access Points
- **Left Sidebar** (`LeftDock.tsx`): A `History` icon above My Library links to `/history`.
- **My Library** (`MyLibraryPage.tsx` + `FolderSidebar.tsx`): A "Session History" tab is available within the library view.

### Route
- `/history` — protected route → `ChatHistoryPage.tsx`

### Components
- **`ChatHistoryPage.tsx`** (`src/pages/`): Standalone page wrapper with header.
- **`ChatHistoryTable.tsx`** (`src/components/chat/`): Full-featured table showing all user sessions.

### Table Columns
| Column | Details |
|--------|---------|
| Title | Inline-editable (✏️ pencil button). Locked sessions show a 🔒 icon |
| Started | `createdAt` formatted as `dd/MM/yyyy HH:mm` |
| Last Active | Relative time (e.g. `3h ago`) |
| Msgs | Count of non-system messages |
| Papers | Each paper shown as a truncated chip (`LongNam….pdf`) |
| Type | `Personal` (green) or `Collab` (purple). Collab shows stacked member avatars |
| Actions | Rename ✏️ · Share 🔗 (Personal only) · Close 🔒 · Delete 🗑️ |

### Share Flow
The **Share** action creates a new collaborative session from any Personal session using `useCreateSession()` (same hook as the chat window's "Start Collaboration" button), then navigates to the new session and opens the invite modal.

### API & Hooks
- **`src/services/api/conversation.api.ts`**: `getConversationHistory`, `updateConversation`, `closeConversation`
- **`src/hooks/queries/useConversationQueries.ts`**: `useConversationHistory`, `useUpdateConversation`, `useCloseConversation`

### Cache Invalidation Fix
`TopNav.handleLogout` now calls `queryClient.clear()` before `logout()` — ensuring React Query cache is fully wiped when switching accounts, preventing stale history data from appearing for a newly logged-in user.
