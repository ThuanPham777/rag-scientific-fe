// src/components/auth/Divider.tsx
export default function Divider() {
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
