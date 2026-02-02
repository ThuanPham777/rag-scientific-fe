import { Routes, Route, Navigate } from 'react-router-dom';
import AppChrome from './components/layout/AppChrome';
import HomeUpload from './pages/HomeUpload';
import ChatPage from './pages/ChatPage';
import MyLibraryPage from './pages/MyLibraryPage';
import ProtectedRoute from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      {/* Routes with layout */}
      <Route element={<AppChrome />}>
        {/* Public route - HomeUpload (login modal will show if needed) */}
        <Route
          path='/'
          element={<HomeUpload />}
        />

        {/* Protected route - My Library */}
        <Route
          path='/library'
          element={
            <ProtectedRoute>
              <MyLibraryPage />
            </ProtectedRoute>
          }
        />

        {/* Protected route - Chat with optional conversationId */}
        <Route
          path='/chat'
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path='/chat/:conversationId'
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
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
