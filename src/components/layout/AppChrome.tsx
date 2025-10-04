import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import LeftDock from './LeftDock';

/**
 * Fixed navbar (h-16) + fixed left dock (w-16).
 * Content area uses pt-16 pl-16 to avoid overlap.
 */
export default function AppChrome() {
  return (
    <div className='min-h-screen bg-gray-50'>
      <TopNav />
      <LeftDock />
      <main className='pt-16 pl-16'>
        {/* per-page container */}
        <div className='min-h-[calc(100vh-4rem)]'>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
