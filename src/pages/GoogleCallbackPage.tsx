// src/pages/GoogleCallbackPage.tsx
// Handle Google OAuth callback and exchange code for tokens

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { status, error, handleCallback } = useGoogleAuth();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Prevent double processing
    if (processed) return;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    // Handle error from Google
    if (errorParam) {
      console.error('Google OAuth error:', errorParam);
      navigate('/?auth_error=' + encodeURIComponent(errorParam));
      return;
    }

    // Handle missing params
    if (!code || !state) {
      console.error('Missing code or state in callback');
      navigate('/?auth_error=missing_params');
      return;
    }

    setProcessed(true);

    // Process the callback
    handleCallback(code, state).then((success) => {
      if (success) {
        // Wait a moment to show success state, then redirect
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        // Wait to show error, then redirect
        setTimeout(() => {
          navigate('/?auth_error=callback_failed');
        }, 2000);
      }
    });
  }, [searchParams, handleCallback, navigate, processed]);

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50'>
      <div className='bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4'>
        {status === 'processing' && (
          <div className='flex flex-col items-center gap-4'>
            <Loader2 className='w-12 h-12 text-indigo-600 animate-spin' />
            <h2 className='text-xl font-semibold text-gray-900'>
              Completing sign in...
            </h2>
            <p className='text-gray-600 text-center'>
              Please wait while we verify your Google account.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className='flex flex-col items-center gap-4'>
            <CheckCircle className='w-12 h-12 text-green-500' />
            <h2 className='text-xl font-semibold text-gray-900'>
              Sign in successful!
            </h2>
            <p className='text-gray-600 text-center'>
              Redirecting you to the app...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className='flex flex-col items-center gap-4'>
            <XCircle className='w-12 h-12 text-red-500' />
            <h2 className='text-xl font-semibold text-gray-900'>
              Sign in failed
            </h2>
            <p className='text-red-600 text-center'>{error}</p>
            <p className='text-gray-600 text-center text-sm'>
              Redirecting you back...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
