// src/components/auth/SwitchModeText.tsx
type AuthMode = 'login' | 'signup';

interface SwitchModeTextProps {
  mode: AuthMode;
  onSwitch: (mode: AuthMode) => void;
}

export default function SwitchModeText({
  mode,
  onSwitch,
}: SwitchModeTextProps) {
  return (
    <p className='text-center text-sm text-gray-600'>
      {mode === 'login' ? (
        <>
          Don't have an account?{' '}
          <button
            type='button'
            onClick={() => onSwitch('signup')}
            className='text-orange-500 font-medium hover:text-orange-600'
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
            className='text-orange-500 font-medium hover:text-orange-600'
          >
            Sign in
          </button>
        </>
      )}
    </p>
  );
}
