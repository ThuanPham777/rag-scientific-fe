import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { login as apiLogin, signup as apiSignup } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

type AuthMode = 'login' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

// Zod schemas
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z
  .object({
    displayName: z.string().optional(),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = 'login',
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Signup form
  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // Reset forms when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      setServerError('');
      loginForm.reset();
      signupForm.reset();
    }
  }, [isOpen, mode]);

  // Update mode when initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setServerError('');
    loginForm.reset();
    signupForm.reset();
  };

  const handleLogin = async (data: LoginFormData) => {
    setServerError('');
    setLoading(true);

    try {
      const response = await apiLogin(data.email, data.password);
      if (response.success) {
        login(response.data, {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        });
        onClose();
      } else {
        setServerError(response.message || 'Login failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(
        error.response?.data?.message || 'Login failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setServerError('');
    setLoading(true);

    try {
      const response = await apiSignup(
        data.email,
        data.password,
        data.displayName || undefined,
      );
      if (response.success) {
        // Switch to login after successful signup
        setMode('login');
        loginForm.setValue('email', data.email);
        setServerError('');
        alert('Account created successfully! Please sign in.');
      } else {
        setServerError(response.message || 'Signup failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setServerError(
        error.response?.data?.message || 'Signup failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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
      aria-labelledby='auth-modal-title'
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black/50 backdrop-blur-sm'
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Modal */}
      <div className='relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        {/* Close button */}
        <button
          onClick={onClose}
          className='absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10'
          aria-label='Close modal'
        >
          <X
            size={20}
            className='text-gray-500'
          />
        </button>

        {/* Header */}
        <div className='px-8 pt-8 pb-4'>
          <h2
            id='auth-modal-title'
            className='text-2xl font-bold text-gray-900'
          >
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className='mt-1 text-sm text-gray-600'>
            {mode === 'login'
              ? 'Sign in to continue to ChatPDF'
              : 'Sign up to get started with ChatPDF'}
          </p>
        </div>

        {/* Form */}
        {mode === 'login' ? (
          <form
            onSubmit={loginForm.handleSubmit(handleLogin)}
            className='px-8 pb-8 space-y-4'
            noValidate
          >
            {serverError && (
              <div className='p-3 rounded-lg bg-red-50 border border-red-200'>
                <p className='text-sm text-red-600'>{serverError}</p>
              </div>
            )}

            <div>
              <label
                htmlFor='login-email'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Email
              </label>
              <input
                id='login-email'
                type='email'
                autoComplete='email'
                {...loginForm.register('email')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  loginForm.formState.errors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='you@example.com'
              />
              {loginForm.formState.errors.email && (
                <p className='mt-1 text-sm text-red-600'>
                  {loginForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='login-password'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Password
              </label>
              <input
                id='login-password'
                type='password'
                autoComplete='current-password'
                {...loginForm.register('password')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  loginForm.formState.errors.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='••••••••'
              />
              {loginForm.formState.errors.password && (
                <p className='mt-1 text-sm text-red-600'>
                  {loginForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <Divider />
            <GoogleButton />
            <SwitchModeText
              mode={mode}
              onSwitch={switchMode}
            />
          </form>
        ) : (
          <form
            onSubmit={signupForm.handleSubmit(handleSignup)}
            className='px-8 pb-8 space-y-4'
            noValidate
          >
            {serverError && (
              <div className='p-3 rounded-lg bg-red-50 border border-red-200'>
                <p className='text-sm text-red-600'>{serverError}</p>
              </div>
            )}

            <div>
              <label
                htmlFor='signup-displayName'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Display Name{' '}
                <span className='text-gray-400 font-normal'>(optional)</span>
              </label>
              <input
                id='signup-displayName'
                type='text'
                autoComplete='name'
                {...signupForm.register('displayName')}
                className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors'
                placeholder='John Doe'
              />
            </div>

            <div>
              <label
                htmlFor='signup-email'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Email
              </label>
              <input
                id='signup-email'
                type='email'
                autoComplete='email'
                {...signupForm.register('email')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  signupForm.formState.errors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='you@example.com'
              />
              {signupForm.formState.errors.email && (
                <p className='mt-1 text-sm text-red-600'>
                  {signupForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='signup-password'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Password
              </label>
              <input
                id='signup-password'
                type='password'
                autoComplete='new-password'
                {...signupForm.register('password')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  signupForm.formState.errors.password
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='At least 6 characters'
              />
              {signupForm.formState.errors.password && (
                <p className='mt-1 text-sm text-red-600'>
                  {signupForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='signup-confirmPassword'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Confirm Password
              </label>
              <input
                id='signup-confirmPassword'
                type='password'
                autoComplete='new-password'
                {...signupForm.register('confirmPassword')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
                  signupForm.formState.errors.confirmPassword
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='••••••••'
              />
              {signupForm.formState.errors.confirmPassword && (
                <p className='mt-1 text-sm text-red-600'>
                  {signupForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <Divider />
            <GoogleButton />
            <SwitchModeText
              mode={mode}
              onSwitch={switchMode}
            />
          </form>
        )}
      </div>
    </div>
  );

  // Use Portal to render modal at document.body level
  // This prevents z-index stacking context issues
  return createPortal(modalContent, document.body);
}

// Subcomponents
function Divider() {
  return (
    <div className='relative my-4'>
      <div className='absolute inset-0 flex items-center'>
        <div className='w-full border-t border-gray-200' />
      </div>
      <div className='relative flex justify-center text-sm'>
        <span className='px-2 bg-white text-gray-500'>or</span>
      </div>
    </div>
  );
}

function GoogleButton() {
  return (
    <button
      type='button'
      className='w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors'
    >
      <svg
        className='h-5 w-5'
        viewBox='0 0 24 24'
      >
        <path
          fill='#4285F4'
          d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
        />
        <path
          fill='#34A853'
          d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
        />
        <path
          fill='#FBBC05'
          d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
        />
        <path
          fill='#EA4335'
          d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
        />
      </svg>
      Continue with Google
    </button>
  );
}

interface SwitchModeTextProps {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}

function SwitchModeText({ mode, onSwitch }: SwitchModeTextProps) {
  return (
    <p className='text-center text-sm text-gray-600'>
      {mode === 'login' ? (
        <>
          Don't have an account?{' '}
          <button
            type='button'
            onClick={() => onSwitch('signup')}
            className='text-indigo-600 font-medium hover:text-indigo-500'
          >
            Sign up
          </button>
        </>
      ) : (
        <>
          Already have an account?{' '}
          <button
            type='button'
            onClick={() => onSwitch('login')}
            className='text-indigo-600 font-medium hover:text-indigo-500'
          >
            Sign in
          </button>
        </>
      )}
    </p>
  );
}
