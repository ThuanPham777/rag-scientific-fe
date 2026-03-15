import { NavLink } from 'react-router-dom';
import {
  FilePlus2,
  History,
  Library,
  BookOpen,
  LayoutDashboard,
  Users,
  Settings,
  Database,
  FolderTree,
  FileText,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';
import { cn } from '@/lib/utils';

// Shared nav-item style
const navBtn = (isActive: boolean) =>
  cn(
    'group relative p-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors',
    isActive && 'text-brand-700 bg-brand-50',
  );

const tooltip = (label: string) => (
  <span className='absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-50'>
    {label}
  </span>
);

const Divider = () => <div className='w-8 h-px bg-gray-200 my-2 mx-auto' />;

export default function LeftDock() {
  const { isAuthenticated, user } = useAuthStore();
  const { toggleNotebooks } = useUiStore();

  return (
    <aside className='fixed z-30 left-0 top-0 bottom-0 w-16 border-r bg-white flex flex-col items-center pt-16 pb-3'>
      <nav className='flex flex-col items-center gap-1 w-full'>

        {/* ── Group 1: Uploads & Session History ── */}
        <NavLink
          to='/'
          end
          title='Uploads'
          className={({ isActive }) =>
            cn(
              'group relative p-3 rounded-xl transition-colors',
              isActive
                ? 'text-orange-600 bg-orange-50'
                : 'text-gray-600 hover:bg-gray-100',
            )
          }
        >
          <FilePlus2 size={20} />
          {tooltip('Uploads')}
        </NavLink>

        {isAuthenticated && (
          <NavLink
            to='/history'
            title='Session History'
            className={({ isActive }) => navBtn(isActive)}
          >
            <History size={20} />
            {tooltip('Session History')}
          </NavLink>
        )}

        {/* ── Divider ── */}
        {isAuthenticated && <Divider />}

        {/* ── Group 2: My Library & Notebooks ── */}
        {isAuthenticated && (
          <>
            <NavLink
              to='/library'
              className={({ isActive }) => navBtn(isActive)}
            >
              <Library size={20} />
              {tooltip('My Library')}
            </NavLink>

            <button
              onClick={toggleNotebooks}
              className={cn(
                'group relative p-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors',
              )}
              aria-label='My Notebooks'
            >
              <BookOpen size={20} />
              {tooltip('My Notebooks')}
            </button>
          </>
        )}

        {/* ── Superadmin Tools ── */}
        {isAuthenticated && user?.role === 'SUPERADMIN' && (
          <>
            <Divider />
            <NavLink
              to='/admin/dashboard'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <LayoutDashboard size={20} />
              {tooltip('Admin Dashboard')}
            </NavLink>
            <NavLink
              to='/admin/users'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <Users size={20} />
              {tooltip('Manage Users')}
            </NavLink>
            <NavLink
              to='/admin/config'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <Settings size={20} />
              {tooltip('System Config')}
            </NavLink>
            <NavLink
              to='/admin/kb'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <FolderTree size={20} />
              {tooltip('Knowledge Base')}
            </NavLink>
            <NavLink
              to='/admin/kb/explorer'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <Database size={20} />
              {tooltip('KB Explorer')}
            </NavLink>
            <NavLink
              to='/admin/documents'
              className={({ isActive }) =>
                cn(
                  'group relative p-3 rounded-xl text-orange-600 hover:bg-orange-50 transition-colors',
                  isActive && 'bg-orange-100 font-semibold',
                )
              }
            >
              <FileText size={20} />
              {tooltip('Documents')}
            </NavLink>
          </>
        )}
      </nav>
    </aside>
  );
}
