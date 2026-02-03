import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { login as apiLogin, signup as apiSignup } from '../../services';
import { useAuthStore } from '../../store/useAuthStore';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import LoginForm, { type LoginFormData } from './LoginForm';
import SignupForm, { type SignupFormData } from './SignupForm';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();

  const {
    status: googleStatus,
    error: googleError,
    initiateGoogleLogin,
  } = useGoogleAuth();

  const isGoogleLoading = googleStatus === 'redirecting';

  const loginForm = useForm<LoginFormData>({
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormData>({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      setServerError('');
      loginForm.reset();
      signupForm.reset();
    }
  }, [isOpen, mode]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (googleError) setServerError(googleError);
  }, [googleError]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setServerError('');
    loginForm.reset();
    signupForm.reset();
  };

  const handleGoogleLogin = async () => {
    setServerError('');
    await initiateGoogleLogin();
  };

  const handleLogin = async (data: LoginFormData) => {
    setServerError('');
    setLoading(true);
    try {
      const res = await apiLogin(data.email, data.password);
      if (res.success) {
        login(res.data, {
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
        });
        onClose();
      } else {
        setServerError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setServerError('');
    setLoading(true);
    try {
      const res = await apiSignup(
        data.email,
        data.password,
        data.displayName || undefined,
      );
      if (res.success) {
        setMode('login');
        loginForm.setValue('email', data.email);
        alert('Account created successfully! Please sign in.');
      } else {
        setServerError(res.message || 'Signup failed');
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message || 'Signup failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className='fixed inset-0 z-[9999] flex items-center justify-center'
      role='dialog'
      aria-modal='true'
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className='relative bg-white rounded-xl shadow-2xl
        w-full max-w-md mx-4
        max-h-[90vh] flex flex-col overflow-hidden
        animate-in fade-in zoom-in-95 duration-200'
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 z-10'
        >
          <X
            size={20}
            className='text-gray-500'
          />
        </button>

        {/* Header (fixed) */}
        <div className='px-8 pt-8 pb-4 shrink-0'>
          <h2 className='text-2xl font-bold text-gray-900'>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className='mt-1 text-sm text-gray-600'>
            {mode === 'login'
              ? 'Sign in to continue to ChatPDF'
              : 'Sign up to get started with ChatPDF'}
          </p>
        </div>

        {/* Body (scroll) */}
        <div className='overflow-y-auto px-8 pb-8'>
          {mode === 'login' ? (
            <LoginForm
              form={loginForm}
              onSubmit={handleLogin}
              serverError={serverError}
              loading={loading}
              onGoogleLogin={handleGoogleLogin}
              isGoogleLoading={isGoogleLoading}
              onSwitchToSignup={() => switchMode('signup')}
            />
          ) : (
            <SignupForm
              form={signupForm}
              onSubmit={handleSignup}
              serverError={serverError}
              loading={loading}
              onGoogleLogin={handleGoogleLogin}
              isGoogleLoading={isGoogleLoading}
              onSwitchToLogin={() => switchMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
