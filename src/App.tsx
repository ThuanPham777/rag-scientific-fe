// src/App.tsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppChrome from './components/layout/AppChrome';
import HomeUpload from './pages/HomeUpload';
import ChatPage from './pages/ChatPage';
import MyLibraryPage from './pages/MyLibraryPage';
import NotebookPage from './pages/NotebookPage';
import NotebookViewerPage from './pages/NotebookViewerPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import JoinSessionPage from './pages/JoinSessionPage';
import JoinNotebookPage from './pages/JoinNotebookPage';
import ProfilePage from './pages/ProfilePage';
import ChatHistoryPage from './pages/ChatHistoryPage';

// Admin imports
import AdminRoute from './components/auth/AdminRoute';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';

export default function App() {
  return (
    <Routes>
      {/* Google OAuth callback - no layout needed */}
      <Route
        path='/auth/google/callback'
        element={<GoogleCallbackPage />}
      />

      {/* Password reset pages - no layout needed */}
      <Route
        path='/forgot-password'
        element={<ForgotPasswordPage />}
      />
      <Route
        path='/reset-password'
        element={<ResetPasswordPage />}
      />

      {/* Session invite join page - no layout needed */}
      <Route
        path='/session/join/:token'
        element={<JoinSessionPage />}
      />

      {/* Notebook collaboration join page */}
      <Route
        path='/notebook/join/:token'
        element={<JoinNotebookPage />}
      />

      {/* Routes with layout */}
      <Route element={<AppChrome />}>
        {/* Public route - HomeUpload (login modal will show if needed) */}
        <Route
          path='/'
          element={<HomeUpload />}
        />

        {/* Protected route - My Library (requires authentication) */}
        <Route
          path='/library'
          element={
            <ProtectedRoute>
              <MyLibraryPage />
            </ProtectedRoute>
          }
        />
        {/* Protected route - Notebooks */}
        <Route
          path='/notebooks'
          element={
            <ProtectedRoute>
              <NotebookPage />
            </ProtectedRoute>
          }
        />

        {/* Full-page notebook viewer (opens in new tab) */}
        <Route
          path='/notebooks/:id'
          element={
            <ProtectedRoute>
              <NotebookViewerPage />
            </ProtectedRoute>
          }
        />

        {/* Protected route - Folder View (folder-specific library view) */}
        <Route
          path='/library/folder/:folderId'
          element={
            <ProtectedRoute>
              <MyLibraryPage />
            </ProtectedRoute>
          }
        />

        {/* Protected route - User Profile */}
        <Route
          path='/profile'
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Protected route - Chat History */}
        <Route
          path='/history'
          element={
            <ProtectedRoute>
              <ChatHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Public route - Chat (allows both guest and authenticated users) */}
        <Route
          path='/chat'
          element={<ChatPage />}
        />
        <Route
          path='/chat/:conversationId'
          element={<ChatPage />}
        />

        {/* Admin routes - protected by AdminRoute guard */}
        <Route
          path='/admin'
          element={
            <AdminRoute>
              <Outlet />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to='/admin/dashboard' replace />} />
          <Route path='dashboard' element={<AdminDashboardPage />} />
          <Route path='users' element={<AdminUsersPage />} />
          <Route path='users/:id' element={<AdminUserDetailPage />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path='*'
        element={<Navigate to='/' />}
      />
    </Routes>
  );
}
