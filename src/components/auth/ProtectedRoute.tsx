import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import AuthModal from './AuthModal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Only show auth modal after initialization is complete
    if (isInitialized && !isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, isInitialized]);

  // Show loading while auth is being initialized
  if (!isInitialized) {
    return (
      <div className='min-h-[calc(100vh-4rem)] flex items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

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
