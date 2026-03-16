// src/pages/JoinSessionPage.tsx
// Landing page when a user clicks a session invite link.
// Extracts the token from the URL, calls the join API, then navigates to chat.

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { usePaperStore } from '../store/usePaperStore';
import { useSessionStore } from '../store/useSessionStore';
import { useJoinSession } from '../hooks';
import { Users, Loader2, AlertCircle } from 'lucide-react';
import AuthModal from '../components/auth/AuthModal';

export default function JoinSessionPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const joinMutation = useJoinSession();
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  // Ref guard prevents React StrictMode double-firing the join mutation
  const joiningRef = useRef(false);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      // Store the invite URL to redirect back after login (used by GoogleCallbackPage)
      sessionStorage.setItem('pendingInvite', `/session/join/${token}`);
      return;
    }

    if (!token || joined || joiningRef.current) return;
    joiningRef.current = true;

    // Auto-join on mount
    joinMutation
      .mutateAsync(token)
      .then((result) => {
        setJoined(true);
        // Clear pending invite since we successfully joined
        sessionStorage.removeItem('pendingInvite');

        const d = result.data as any;
        const conversationId = d.conversationId;
        const ragFileId = d.paperRagFileId || d.ragFileId || '';

        // Set up paper store so ChatPage can display immediately
        if (d.paperId) {
          usePaperStore.getState().setCurrentPaper({
            id: d.paperId,
            ragFileId,
            fileName: d.paperFileName || d.paperTitle || 'Shared Paper',
            fileUrl: d.paperUrl || '',
            localUrl: d.paperUrl || '',
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
          } as any);

          // Build papers array for multi-paper collab sessions
          const sessionPapers = d.papers?.length
            ? d.papers.map((p: any, idx: number) => ({
              id: p.id,
              ragFileId: p.ragFileId || '',
              title: p.title || p.fileName || '',
              fileName: p.fileName || '',
              fileUrl: p.fileUrl || '',
              orderIndex: idx,
              tabOrder: idx,
            }))
            : undefined;

          usePaperStore.getState().setSession({
            id: conversationId,
            paperId: d.paperId,
            ragFileId,
            papers: sessionPapers,
            messages: [],
          });
        }

        // Mark as collaborative
        useSessionStore.getState().setCollaborative(true);

        navigate(`/chat/${conversationId}`, { replace: true });
      })
      .catch((err) => {
        joiningRef.current = false;
        const msg =
          err?.response?.data?.message ||
          'Failed to join session. The invite link may be invalid or expired.';
        setError(msg);
      });
  }, [isInitialized, isAuthenticated, token]);

  // Not yet initialized
  if (!isInitialized) {
    return (
      <CenterScreen>
        <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        <p className='text-gray-500 mt-3'>Loading...</p>
      </CenterScreen>
    );
  }

  // Not authenticated — prompt to log in
  if (!isAuthenticated) {
    return (
      <CenterScreen>
        <div className='bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center'>
          <Users className='w-12 h-12 text-indigo-600 mx-auto mb-4' />
          <h2 className='text-lg font-semibold text-gray-800 mb-2'>
            Join Collaborative Session
          </h2>
          <p className='text-sm text-gray-500 mb-6'>
            You need to sign in before joining this session.
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

  // Joining in progress
  if (joinMutation.isPending) {
    return (
      <CenterScreen>
        <Loader2 className='w-8 h-8 animate-spin text-indigo-600' />
        <p className='text-gray-500 mt-3'>Joining session...</p>
      </CenterScreen>
    );
  }

  // Error
  if (error) {
    return (
      <CenterScreen>
        <div className='bg-white rounded-xl shadow-lg p-8 max-w-sm w-full text-center'>
          <AlertCircle className='w-12 h-12 text-red-500 mx-auto mb-4' />
          <h2 className='text-lg font-semibold text-gray-800 mb-2'>
            Unable to Join
          </h2>
          <p className='text-sm text-gray-500 mb-6'>{error}</p>
          <button
            onClick={() => navigate('/')}
            className='px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors'
          >
            Go Home
          </button>
        </div>
      </CenterScreen>
    );
  }

  // Fallback (should not reach here normally)
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
