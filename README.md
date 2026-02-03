# 🎨 RAG Scientific - Frontend

<div align="center">

![React](https://img.shields.io/badge/React-19.x-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF.svg)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Modern React Frontend for RAG Scientific - AI-Powered Research Paper Analysis Platform**

[Features](#-features) • [Installation](#-installation) • [Architecture](#-architecture) • [Screenshots](#-screenshots)

</div>

---

## 📋 Overview

Frontend application cho hệ thống RAG Scientific, cung cấp giao diện người dùng để:

- **Upload & View PDFs**: Drag-drop upload, interactive PDF viewer
- **AI Chat**: Hỏi đáp về nội dung papers với citations
- **Library Management**: Tổ chức papers trong folders
- **Multi-Paper Analysis**: So sánh và phân tích nhiều papers cùng lúc

## ✨ Features

| Feature                 | Description                                          |
| ----------------------- | ---------------------------------------------------- |
| 📄 **PDF Viewer**       | Interactive viewer với zoom, scroll, page navigation |
| 💬 **AI Chat**          | Real-time Q&A với markdown rendering và citations    |
| 🎯 **Region Selection** | Click-drag chọn vùng trong PDF để hỏi AI             |
| 📁 **Library**          | Organize papers trong folders với drag-drop          |
| 🔍 **Related Papers**   | Tìm papers liên quan từ arXiv                        |
| 💡 **Suggestions**      | AI-generated câu hỏi gợi ý                           |
| 🌙 **Dark Mode**        | Support dark/light theme                             |
| 📱 **Responsive**       | Mobile-friendly design                               |
| 🔐 **Auth**             | Google OAuth + Email/Password                        |
| 👤 **Guest Mode**       | Dùng thử không cần đăng ký                           |

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          React App                               │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                        Router                                ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐││
│  │  │  Home    │ │  Login   │ │ Library  │ │    ChatPage      │││
│  │  │  Upload  │ │  Signup  │ │   Page   │ │  (PDF + Chat)    │││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                     State Management                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │  │
│  │  │ Zustand  │  │  React   │  │ useAuth  │  │ usePaper  │  │  │
│  │  │  Stores  │  │  Query   │  │  Store   │  │   Store   │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────┴───────────────────────────────┐  │
│  │                      API Services                          │  │
│  │  auth.api │ paper.api │ chat.api │ folder.api │ rag.api   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  NestJS Backend │
                    │    (Port 3000)  │
                    └─────────────────┘
```

## 📁 Project Structure

```
rag-scientific-fe/
├── public/                     # Static assets
├── src/
│   ├── components/
│   │   ├── auth/              # 🔐 Auth components
│   │   │   ├── AuthModal.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   ├── GoogleButton.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   │
│   │   ├── chat/              # 💬 Chat components
│   │   │   ├── ChatDock.tsx       # Main chat panel
│   │   │   ├── ChatInput.tsx      # Message input
│   │   │   ├── ChatMessage.tsx    # Message bubble
│   │   │   ├── ChatSuggestions.tsx
│   │   │   └── message/           # Citation rendering
│   │   │
│   │   ├── pdf/               # 📄 PDF Viewer
│   │   │   ├── PdfViewer.tsx      # Main PDF component
│   │   │   ├── PdfPanel.tsx       # Container with toolbar
│   │   │   ├── PdfToolbar.tsx     # Zoom, page controls
│   │   │   ├── SelectionPopup.tsx # Region selection
│   │   │   ├── SummaryView.tsx    # Paper summary tab
│   │   │   └── RelatedPapersView.tsx
│   │   │
│   │   ├── library/           # 📁 Library management
│   │   │   ├── FolderSidebar.tsx
│   │   │   ├── FolderDialogs.tsx
│   │   │   ├── PaperTable.tsx
│   │   │   └── UploadDialog.tsx
│   │   │
│   │   ├── layout/            # 🎨 Layout components
│   │   │   ├── AppChrome.tsx
│   │   │   ├── TopNav.tsx
│   │   │   └── LeftDock.tsx
│   │   │
│   │   ├── uploader/          # ⬆️ File upload
│   │   │   ├── FileDropzone.tsx
│   │   │   └── FolderSelectModal.tsx
│   │   │
│   │   └── ui/                # 🧱 UI primitives (Radix)
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       └── ...
│   │
│   ├── pages/                 # 📄 Route pages
│   │   ├── HomeUpload.tsx         # Landing + upload
│   │   ├── ChatPage.tsx           # Main app (PDF + Chat)
│   │   ├── MyLibraryPage.tsx      # Paper management
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── GoogleCallbackPage.tsx
│   │
│   ├── hooks/                 # 🎣 Custom hooks
│   │   ├── useChat.ts             # Chat logic
│   │   ├── useUpload.ts           # Upload handling
│   │   ├── useIngestStatus.ts     # Polling RAG status
│   │   ├── useGoogleAuth.ts       # OAuth flow
│   │   └── queries/               # React Query hooks
│   │       ├── useAuthMutations.ts
│   │       ├── usePaperQueries.ts
│   │       ├── useChatQueries.ts
│   │       └── useFolderQueries.ts
│   │
│   ├── services/api/          # 🔌 API clients
│   │   ├── auth.api.ts
│   │   ├── paper.api.ts
│   │   ├── chat.api.ts
│   │   ├── folder.api.ts
│   │   ├── conversation.api.ts
│   │   ├── guest.api.ts
│   │   └── rag.api.ts
│   │
│   ├── store/                 # 🗃️ Zustand stores
│   │   ├── useAuthStore.ts
│   │   ├── usePaperStore.ts
│   │   ├── useFolderStore.ts
│   │   ├── useGuestStore.ts
│   │   └── useMultiPaperChatStore.ts
│   │
│   ├── config/                # ⚙️ Configuration
│   │   ├── axios.ts               # Axios instance
│   │   └── env.ts                 # Environment vars
│   │
│   ├── utils/                 # 🔧 Utilities
│   │   ├── types.ts               # Type definitions
│   │   ├── citation.ts            # Citation parsing
│   │   └── file.ts                # File helpers
│   │
│   ├── providers/             # 🎁 React providers
│   │   └── QueryProvider.tsx
│   │
│   ├── App.tsx                # Root component
│   ├── main.tsx               # Entry point
│   └── index.css              # Global styles
│
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

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
# Copy example config
cp .env.example .env
```

Edit `.env`:

```env
# API URL
VITE_API_URL=http://localhost:3000

# Google OAuth (optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
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

| Category           | Technology                        |
| ------------------ | --------------------------------- |
| **Framework**      | React 19.x                        |
| **Language**       | TypeScript 5.x                    |
| **Build Tool**     | Vite 6.x                          |
| **Styling**        | TailwindCSS 4.x                   |
| **UI Components**  | Radix UI                          |
| **State (Server)** | TanStack React Query              |
| **State (Client)** | Zustand                           |
| **Forms**          | React Hook Form + Zod             |
| **PDF Viewer**     | react-pdf + react-pdf-highlighter |
| **Routing**        | React Router 7.x                  |
| **HTTP Client**    | Axios                             |
| **Icons**          | Lucide React                      |
| **Markdown**       | react-markdown + remark-gfm       |

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## 🎯 Key Features Deep Dive

### PDF Viewer with Region Selection

```tsx
// Click-drag to select a region, then ask AI about it
<PdfViewer
  fileUrl={paper.fileUrl}
  onRegionSelect={(region, imageB64) => {
    // Opens popup to ask about selected region
    askAboutRegion(region, imageB64);
  }}
/>
```

### AI Chat with Citations

```tsx
// Citations are rendered as clickable links
<ChatMessage
  message={{
    content: 'The model uses attention [S1] mechanism...',
    citations: [{ sourceId: 'S1', pageNumber: 5, snippet: '...' }],
  }}
  onCitationClick={(citation) => {
    // Navigate PDF to citation location
    pdfViewer.scrollToPage(citation.pageNumber);
  }}
/>
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

## 🔗 Related Services

| Service               | Port | Description              |
| --------------------- | ---- | ------------------------ |
| **rag-scientific-fe** | 5173 | This service (React App) |
| **rag-scientific-be** | 3000 | NestJS Backend API       |
| **RAG_BE_02**         | 8000 | Python RAG Service       |

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**[⬆ Back to Top](#-rag-scientific---frontend)**

Made with ❤️ using React + Vite

</div>
