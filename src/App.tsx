import { Routes, Route, Navigate } from 'react-router-dom';
import AppChrome from './components/layout/AppChrome';
import HomeUpload from './pages/HomeUpload';
import ChatPage from './pages/ChatPage';
import MyLibraryPage from './pages/MyLibraryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GoogleCallbackPage from './pages/GoogleCallbackPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import JoinSessionPage from './pages/JoinSessionPage';

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
        <Route
          path='/library/folder/:folderId'
          element={
            <ProtectedRoute>
              <MyLibraryPage />
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
      </Route>

      {/* Fallback */}
      <Route
        path='*'
        element={<Navigate to='/' />}
      />
    </Routes>
  );
}
