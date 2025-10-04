import { Link, NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  FileText,
  MessageSquare,
  Search,
  Beaker,
  Settings,
  LifeBuoy,
  User,
} from 'lucide-react';

const items = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/papers', icon: BookOpen, label: 'Papers' },
  { to: '/uploads', icon: FileText, label: 'Uploads' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/discover', icon: Search, label: 'Discover' },
  { to: '/labs', icon: Beaker, label: 'Labs' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/help', icon: LifeBuoy, label: 'Help' },
];

export default function LeftDock() {
  return (
    <aside
      className='
        fixed z-30 left-0 top-0 bottom-0 w-16 border-r border-r-gray-200 bg-white
        flex flex-col items-center justify-between py-3
      '
    >
      <nav className='flex flex-col items-center gap-1'>
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `
              group relative p-3 rounded-xl text-gray-600 hover:bg-gray-100
              ${isActive ? 'text-brand-700 bg-brand-50' : ''}
              `
            }
          >
            <Icon size={20} />
            {/* tooltip */}
            <span
              className='
                absolute left-14 top-1/2 -translate-y-1/2 pointer-events-none
                whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-2 py-1
                opacity-0 group-hover:opacity-100 transition
              '
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* bottom profile */}
      <Link
        to='/me'
        className='p-3 rounded-xl hover:bg-gray-100 text-gray-600'
      >
        <User size={20} />
      </Link>
    </aside>
  );
}
