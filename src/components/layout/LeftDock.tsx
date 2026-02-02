import { Link, NavLink } from 'react-router-dom';
import { Home, Library, FileText, MessageSquare, User } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/library', icon: Library, label: 'My Library', auth: true },
  { to: '/uploads', icon: FileText, label: 'Uploads' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
];

export default function LeftDock() {
  const { isAuthenticated } = useAuthStore();

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
