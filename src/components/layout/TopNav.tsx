import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Search as SearchIcon,
  BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { logout as apiLogout } from '../../services/api';
import AuthModal from '../auth/AuthModal';

export default function TopNav() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, getRefreshToken } = useAuthStore();
  const [openMenu, setOpenMenu] = useState(false);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
  }>({
    open: false,
    mode: 'login',
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await apiLogout(refreshToken);
      }
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      logout();
      navigate('/login');
    }
  };

  // click outside/ESC để đóng popup
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && setOpenMenu(false);
    window.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // avatar (fallback chữ cái đầu)
  const avatar = user?.avatarUrl ? (
    <img
      src={user.avatarUrl}
      alt='avatar'
      className='w-8 h-8 rounded-full object-cover'
    />
  ) : (
    <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center'>
      <span className='text-xs text-gray-700'>
        {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
      </span>
    </div>
  );

  return (
    <header className='fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-b-gray-200'>
      <div className='h-full max-w-screen-2xl mx-auto px-4 flex items-center gap-4'>
        {/* Logo */}
        <Link
          to='/'
          className='flex items-center gap-2 font-semibold'
        >
          <div className='w-5 h-5 rounded-sm bg-brand-600' />
          <span className='tracking-wide'>CHATPDF</span>
        </Link>

        {/* Papers + Search (input group) */}
        <div className='hidden md:flex items-stretch flex-1 max-w-3xl'>
          <button
            className='shrink-0 inline-flex items-center gap-1 px-3 text-sm border border-r-0 rounded-l-md bg-white hover:bg-gray-50'
            aria-haspopup='listbox'
            aria-expanded='false'
          >
            Papers <ChevronDown size={16} />
          </button>

          <div className='relative flex-1'>
            <input
              className='w-full h-10 border rounded-r-md pl-3 pr-9 focus:outline-none focus:ring-2 focus:ring-brand-400'
              placeholder='Get insights from top papers directly'
            />
            <SearchIcon
              size={18}
              className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400'
            />
          </div>
        </div>

        {/* Right side */}
        <nav className='ml-auto flex items-center gap-4'>
          <NavLink
            to='/pricing'
            className='text-sm text-gray-700 hover:text-gray-900 pr-4 mr-2 border-r'
          >
            Pricing
          </NavLink>

          {!isAuthenticated ? (
            <>
              <button
                onClick={() => setAuthModal({ open: true, mode: 'login' })}
                className='text-sm text-gray-700 hover:text-gray-900'
              >
                Login
              </button>
              <button
                onClick={() => setAuthModal({ open: true, mode: 'signup' })}
                className='text-sm px-3 py-1.5 rounded-md bg-black text-white hover:opacity-90'
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              <NavLink
                to='/library'
                className='hidden sm:flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900'
              >
                <BookOpen size={18} />
                My Library
              </NavLink>

              {/* Avatar + dropdown */}
              <div
                className='relative'
                ref={menuRef}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu((v) => !v);
                  }}
                  className='rounded-full focus:outline-none focus:ring-2 focus:ring-brand-400'
                  aria-haspopup='menu'
                  aria-expanded={openMenu}
                >
                  {avatar}
                </button>

                {openMenu && (
                  <div
                    role='menu'
                    className='absolute right-0 mt-2 w-64 rounded-md border bg-white shadow-lg p-3 z-[100]'
                  >
                    <div className='px-2 pb-1 text-sm font-medium'>
                      My Account
                    </div>
                    <div className='px-2 pb-3 text-xs text-gray-600 break-all'>
                      {user?.email}
                    </div>
                    <button
                      role='menuitem'
                      className='w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-gray-50'
                      onClick={() => {
                        setOpenMenu(false);
                        handleLogout();
                      }}
                    >
                      <LogOut size={16} />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModal.open}
        onClose={() => setAuthModal({ ...authModal, open: false })}
        initialMode={authModal.mode}
      />
    </header>
  );
}
