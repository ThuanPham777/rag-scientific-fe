import { Routes, Route, Navigate } from 'react-router-dom';
import AppChrome from './components/layout/AppChrome';
import HomeUpload from './pages/HomeUpload';
import ChatPage from './pages/ChatPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppChrome />}>
        <Route
          path='/'
          element={<HomeUpload />}
        />
        <Route
          path='/chat'
          element={<ChatPage />}
        />
      </Route>
      <Route
        path='*'
        element={<Navigate to='/' />}
      />
    </Routes>
  );
}
