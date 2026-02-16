import { Link, NavLink } from 'react-router-dom';
import { Home, Library, FileText, MessageSquare, User, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'My Library', auth: true },
  // notebooks will be handled specially to avoid route change
  { to: '/uploads', icon: FileText, label: 'Uploads' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
];

export default function LeftDock() {
  const { isAuthenticated } = useAuthStore();
  const { toggleNotebooks } = useUiStore();

  return (
    <aside className='fixed z-30 left-0 top-0 bottom-0 w-16 border-r bg-white flex flex-col items-center justify-between py-3'>
      <nav className='flex flex-col items-center gap-1'>
        {items
          .filter((item) => !item.auth || isAuthenticated)
          .map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group relative p-3 rounded-xl text-gray-600 hover:bg-gray-100
                 ${isActive ? 'text-brand-700 bg-brand-50' : ''}`
              }
            >
              <Icon size={20} />
              <span className='absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100'>
                {label}
              </span>
            </NavLink>
          ))}

        {/* Notebook button (doesn't change route) */}
        {isAuthenticated && (
          <button
            onClick={toggleNotebooks}
            className='group relative p-3 rounded-xl text-gray-600 hover:bg-gray-100'
            aria-label='My Notebooks'
          >
            <BookOpen size={20} />
            <span className='absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100'>
              My Notebooks
            </span>
          </button>
        )}
      </nav>

      <Link
        to='/me'
        className='p-3 rounded-xl hover:bg-gray-100 text-gray-600'
      >
        <User size={20} />
      </Link>
    </aside>
  );
}
