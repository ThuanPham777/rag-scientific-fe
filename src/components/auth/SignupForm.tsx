// src/components/auth/SignupForm.tsx
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import Divider from './Divider';
import GoogleButton from './GoogleButton';
import SwitchModeText from './SwitchModeText';

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

export type SignupFormData = z.infer<typeof signupSchema>;

interface SignupFormProps {
  form: UseFormReturn<SignupFormData>;
  onSubmit: (data: SignupFormData) => void;
  serverError: string;
  loading: boolean;
  onGoogleLogin: () => void;
  isGoogleLoading: boolean;
  onSwitchToLogin: () => void;
}

export default function SignupForm({
  form,
  onSubmit,
  serverError,
  loading,
  onGoogleLogin,
  isGoogleLoading,
  onSwitchToLogin,
}: SignupFormProps) {
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
          {...form.register('displayName')}
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
          htmlFor='signup-password'
          className='block text-sm font-medium text-gray-700 mb-1'
        >
          Password
        </label>
        <input
          id='signup-password'
          type='password'
          autoComplete='new-password'
          {...form.register('password')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
            form.formState.errors.password
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          placeholder='At least 6 characters'
        />
        {form.formState.errors.password && (
          <p className='mt-1 text-sm text-red-600'>
            {form.formState.errors.password.message}
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
          {...form.register('confirmPassword')}
          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
            form.formState.errors.confirmPassword
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300'
          }`}
          placeholder='••••••••'
        />
        {form.formState.errors.confirmPassword && (
          <p className='mt-1 text-sm text-red-600'>
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type='submit'
        disabled={loading}
        className='w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>

      <Divider />
      <GoogleButton
        onClick={onGoogleLogin}
        loading={isGoogleLoading}
        disabled={loading}
      />
      <SwitchModeText
        mode='signup'
        onSwitch={onSwitchToLogin}
      />
    </form>
  );
}
