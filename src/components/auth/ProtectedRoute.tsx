import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import AuthModal from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <>
        <div className='min-h-[calc(100vh-4rem)] flex items-center justify-center text-gray-500'>
          Please log in to access this page.
        </div>
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode='login'
        />
      </>
    );
  }

  return <>{children}</>;
}
