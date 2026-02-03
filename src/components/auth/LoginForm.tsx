// src/components/auth/LoginForm.tsx
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import Divider from './Divider';
import GoogleButton from './GoogleButton';
import SwitchModeText from './SwitchModeText';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  form: UseFormReturn<LoginFormData>;
  onSubmit: (data: LoginFormData) => void;
  serverError: string;
  loading: boolean;
  onGoogleLogin: () => void;
  isGoogleLoading: boolean;
  onSwitchToSignup: () => void;
}

export default function LoginForm({
  form,
  onSubmit,
  serverError,
  loading,
  onGoogleLogin,
  isGoogleLoading,
  onSwitchToSignup,
}: LoginFormProps) {
  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
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
          {...form.register('email')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
            form.formState.errors.email
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          placeholder='you@example.com'
        />
        {form.formState.errors.email && (
          <p className='mt-1 text-sm text-red-600'>
            {form.formState.errors.email.message}
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
          {...form.register('password')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
            form.formState.errors.password
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          placeholder='••••••••'
        />
        {form.formState.errors.password && (
          <p className='mt-1 text-sm text-red-600'>
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <button
        type='submit'
        disabled={loading}
        className='w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>

      <Divider />
      <GoogleButton
        onClick={onGoogleLogin}
        loading={isGoogleLoading}
        disabled={loading}
      />
      <SwitchModeText
        mode='login'
        onSwitch={onSwitchToSignup}
      />
    </form>
  );
}
