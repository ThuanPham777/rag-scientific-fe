// src/pages/ResetPasswordPage.tsx
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useResetPassword } from '../hooks';
import { ArrowLeft, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');

  const { mutateAsync: resetPassword, isPending } = useResetPassword();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  // No token provided
  if (!token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'>
        <div className='max-w-md w-full'>
          <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
            <div className='mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6'>
              <AlertTriangle className='w-8 h-8 text-red-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Invalid reset link
            </h2>
            <p className='text-gray-600 mb-6'>
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
            <Link
              to='/forgot-password'
              className='inline-block w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-center'
            >
              Request new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'>
        <div className='max-w-md w-full'>
          <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
            <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6'>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Password reset successful
            </h2>
            <p className='text-gray-600 mb-6'>
              Your password has been updated. You can now log in with your new
              password.
            </p>
            <button
              onClick={() => navigate('/')}
              className='w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors'
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setServerError('');
    try {
      const res = await resetPassword({
        token,
        newPassword: data.newPassword,
      });
      if (res.success) {
        setSuccess(true);
      } else {
        setServerError(res.message || 'Failed to reset password.');
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ||
          'Failed to reset password. The link may have expired.',
      );
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'>
      <div className='max-w-md w-full'>
        <div className='bg-white rounded-xl shadow-lg p-8'>
          {/* Back link */}
          <Link
            to='/'
            className='inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors'
          >
            <ArrowLeft className='w-4 h-4 mr-1' />
            Back to Home
          </Link>

          {/* Header */}
          <div className='mb-6'>
            <div className='mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4'>
              <Lock className='w-6 h-6 text-orange-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>
              Set new password
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              Your new password must be at least 6 characters and contain
              uppercase, lowercase, and a number.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className='space-y-4'
            noValidate
          >
            {serverError && (
              <div className='p-3 rounded-lg bg-red-50 border border-red-200'>
                <p className='text-sm text-red-600'>{serverError}</p>
              </div>
            )}

            <div>
              <label
                htmlFor='new-password'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                New Password
              </label>
              <input
                id='new-password'
                type='password'
                autoComplete='new-password'
                autoFocus
                {...form.register('newPassword')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                  form.formState.errors.newPassword
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='••••••••'
              />
              {form.formState.errors.newPassword && (
                <p className='mt-1 text-sm text-red-600'>
                  {form.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='confirm-password'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Confirm Password
              </label>
              <input
                id='confirm-password'
                type='password'
                autoComplete='new-password'
                {...form.register('confirmPassword')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
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
              disabled={isPending}
              className='w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isPending ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
