// src/pages/JoinNotebookPage.tsx
// Landing page when a user clicks a notebook share link.
// Calls the join API, then navigates to the collaborative notebook.

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import notebookService from '../services/notebookService';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import AuthModal from '../components/auth/AuthModal';

export default function JoinNotebookPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      sessionStorage.setItem('pendingInvite', `/notebook/join/${token}`);
      return;
    }

    if (!token || joiningRef.current) return;
    joiningRef.current = true;
    setJoining(true);

    notebookService
      .joinByToken(token)
      .then((result) => {
        sessionStorage.removeItem('pendingInvite');
        navigate(`/notebooks/${result.notebookId}`, { replace: true });
      })
      .catch((err) => {
        joiningRef.current = false;
        setJoining(false);
        const msg =
          err?.response?.data?.message ||
          'Failed to join notebook. The share link may be invalid.';
        setError(msg);
      });
  }, [isInitialized, isAuthenticated, token]);

  if (!isInitialized) {
    return (
      <CenterScreen>
        <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        <p className='text-gray-500 mt-3'>Loading...</p>
      </CenterScreen>
    );
  }

  if (!isAuthenticated) {
    return (
      <CenterScreen>
        <div className='bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center'>
          <Users className='w-12 h-12 text-indigo-600 mx-auto mb-4' />
          <h2 className='text-lg font-semibold text-gray-800 mb-2'>
            Join Collaborative Notebook
          </h2>
          <p className='text-sm text-gray-500 mb-6'>
            You need to sign in before joining this shared notebook.
          </p>
          <button
            onClick={() => setShowAuth(true)}
            className='flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors'
          >
            Sign In
          </button>
        </div>
        <AuthModal
          isOpen={showAuth}
          onClose={() => setShowAuth(false)}
        />
      </CenterScreen>
    );
  }

  if (joining) {
    return (
      <CenterScreen>
        <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        <p className='text-gray-500 mt-3'>Joining notebook...</p>
      </CenterScreen>
    );
  }

  if (error) {
    return (
      <CenterScreen>
        <div className='bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center'>
          <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-lg font-semibold text-gray-800 mb-2'>
            Unable to Join
          </h2>
          <p className='text-sm text-gray-600 mb-6'>
            Notebook này không còn tồn tại hoặc đường dẫn chia sẻ đã hết hạn.
          </p>
          <button
            onClick={() => navigate('/library')}
            className='w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors'
          >
            Về My Library
          </button>
        </div>
      </CenterScreen>
    );
  }

  return (
    <CenterScreen>
      <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
    </CenterScreen>
  );
}

function CenterScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4'>
      {children}
    </div>
  );
}
