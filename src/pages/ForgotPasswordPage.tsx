// src/pages/ForgotPasswordPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForgotPassword } from '../hooks';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  const { mutateAsync: forgotPassword, isPending } = useForgotPassword();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const [serverError, setServerError] = useState('');

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setServerError('');
    try {
      const res = await forgotPassword({ email: data.email });
      if (res.success) {
        setSubmittedEmail(data.email);
        setSubmitted(true);
      } else {
        setServerError(
          res.message || 'Something went wrong. Please try again.',
        );
      }
    } catch (err: any) {
      setServerError(
        err?.response?.data?.message ||
          'Something went wrong. Please try again.',
      );
    }
  };

  // Success state
  if (submitted) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4'>
        <div className='max-w-md w-full'>
          <div className='bg-white rounded-xl shadow-lg p-8 text-center'>
            <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6'>
              <CheckCircle className='w-8 h-8 text-green-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900 mb-2'>
              Check your email
            </h2>
            <p className='text-gray-600 mb-6'>
              If an account exists for{' '}
              <span className='font-medium text-gray-900'>
                {submittedEmail}
              </span>
              , we've sent a password reset link. Please check your inbox and
              spam folder.
            </p>
            <p className='text-sm text-gray-500 mb-6'>
              The link will expire in 1 hour.
            </p>
            <div className='space-y-3'>
              <button
                onClick={() => {
                  setSubmitted(false);
                  form.reset();
                }}
                className='w-full py-2.5 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors'
              >
                Try another email
              </button>
              <Link
                to='/'
                className='block w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-colors text-center'
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <Mail className='w-6 h-6 text-orange-600' />
            </div>
            <h2 className='text-2xl font-bold text-gray-900'>
              Forgot password?
            </h2>
            <p className='mt-1 text-sm text-gray-600'>
              No worries, we'll send you a reset link.
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
                htmlFor='forgot-email'
                className='block text-sm font-medium text-gray-700 mb-1'
              >
                Email
              </label>
              <input
                id='forgot-email'
                type='email'
                autoComplete='email'
                autoFocus
                {...form.register('email')}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors ${
                  form.formState.errors.email
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                }`}
                placeholder='Enter your email'
              />
              {form.formState.errors.email && (
                <p className='mt-1 text-sm text-red-600'>
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={isPending}
              className='w-full py-2.5 px-4 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {isPending ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
