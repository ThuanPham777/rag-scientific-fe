import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LogOut,
  BookOpen,
  Search,
  MessageSquare,
  BookMarked,
  Users,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/useAuthStore';
import { useGuestStore } from '../../store/useGuestStore';
import { logout as apiLogout } from '../../services';
import AuthModal from '../auth/AuthModal';
import { UserAvatar } from '../common/UserAvatar';
import { globalSearch } from '../../services/api/search.api';
import type { SearchResult, SearchSession } from '../../utils/types';

/* ─── Helpers ──────────────────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function SessionIcon({ session }: { session: SearchSession }) {
  if (session.isCollaborative) return <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />;
  return <MessageSquare className="h-3.5 w-3.5 text-blue-500 shrink-0" />;
}

/* ─── SmartSearch bar ────────────────────────────────────────────────────── */

function SmartSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Debounced search */
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await globalSearch(q.trim());
      setResults(data);
      setOpen(true);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  /* Close on click-outside */
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    setQuery('');
    setResults(null);
  };

  const navigateTo = (path: string) => {
    dismiss();
    navigate(path);
  };

  const hasResults =
    results && (results.sessions.length > 0 || results.notebooks.length > 0);

  /* Dropdown rect anchored to container */
  const [dropRect, setDropRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (open && containerRef.current) {
      setDropRect(containerRef.current.getBoundingClientRect());
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden sm:block w-64 lg:w-80">
      {/* Input */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search sessions, notebooks..."
          className="w-full pl-9 pr-8 py-1.5 text-sm rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition-all placeholder:text-gray-400"
        />
        {query && (
          <button
            onClick={dismiss}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown — portaled to body so it escapes stacking contexts */}
      {open &&
        dropRect &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: dropRect.bottom + 6,
              left: dropRect.left,
              width: dropRect.width,
              zIndex: 99999,
            }}
            className="rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
          >
            {loading && (
              <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border-2 border-brand-400 border-t-transparent animate-spin" />
                Searching...
              </div>
            )}

            {!loading && !hasResults && results !== null && (
              <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
            )}

            {!loading && hasResults && (
              <>
                {/* Sessions group */}
                {results!.sessions.length > 0 && (
                  <div>
                    <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50 border-b">
                      Chat Sessions
                    </div>
                    {results!.sessions.map((s) => {
                      const subtitle =
                        s.papers.length > 0
                          ? (s.papers[0].title || s.papers[0].fileName)
                          : (s.isCollaborative ? 'Collaborative' : 'Personal');
                      return (
                        <button
                          key={s.id}
                          onClick={() => navigateTo(`/chat/${s.id}`)}
                          className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                        >
                          <span className="mt-0.5">
                            <SessionIcon session={s} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">
                              {s.title || 'Untitled conversation'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{subtitle}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                            {timeAgo(s.updatedAt)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Notebooks group */}
                {results!.notebooks.length > 0 && (
                  <div className={results!.sessions.length > 0 ? 'border-t' : ''}>
                    <div className="px-4 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-widest bg-gray-50 border-b">
                      Notebooks
                    </div>
                    {results!.notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => navigateTo(`/notebook/${nb.id}`)}
                        className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                      >
                        <BookMarked className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 truncate">{nb.title}</p>
                          {nb.contentPreview && (
                            <p className="text-xs text-gray-400 truncate">{nb.contentPreview}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">
                          {timeAgo(nb.updatedAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

/* ─── TopNav ─────────────────────────────────────────────────────────────── */

export default function TopNav() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, logout } = useAuthStore();

  const [openMenu, setOpenMenu] = useState(false);
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    mode: 'login' | 'signup';
  }>({
    open: false,
    mode: 'login',
  });

  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown whenever auth state changes (e.g. guest logs in)
  useEffect(() => {
    setOpenMenu(false);
  }, [isAuthenticated]);

  /* ---------------- Logout ---------------- */
  const handleLogout = async () => {
    console.log('Logging out...');
    try {
      // Refresh token cookie is sent automatically, no need to pass it
      await apiLogout();
    } catch (err) {
      console.error('Logout API error:', err);
    } finally {
      // Clear ALL React Query cached data so the next user never sees stale data
      queryClient.clear();
      logout();
      navigate('/');
    }
  };

  /* -------- Click outside + ESC (FIXED) -------- */
  useEffect(() => {
    if (!openMenu) return;

    const onMouseDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        dropdownRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [openMenu]);

  /* ---------------- Avatar (shared component) ------------- */
  const avatar = (
    <UserAvatar
      name={user?.displayName || user?.email}
      avatarUrl={user?.avatarUrl}
      size='md'
    />
  );

  /* ---------------- Render ---------------- */
  return (
    <header className='fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur border-b border-b-gray-200'>
      <div className='h-full max-w-screen-2xl mx-auto px-4 flex items-center gap-4'>
        {/* Logo */}
        <Link
          to='/'
          className='flex items-center gap-2 font-semibold shrink-0'
        >
          <div className='w-5 h-5 rounded-sm bg-brand-600' />
          <span className='tracking-wide'>AskPDF</span>
        </Link>

        {/* Smart Search — only for authenticated users */}
        {isAuthenticated && <SmartSearch />}

        {/* Right */}
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

              {/* Avatar */}
              <div
                ref={menuRef}
                className='relative z-[9999999]'
              >
                <button
                  onClick={() => setOpenMenu((v) => !v)}
                  className='rounded-full focus:outline-none focus:ring-2 focus:ring-brand-400'
                  aria-haspopup='menu'
                  aria-expanded={openMenu}
                >
                  {avatar}
                </button>

                {openMenu &&
                  createPortal(
                    <div
                      ref={dropdownRef}
                      className='fixed top-[56px] right-4 w-64 rounded-md border bg-white shadow-lg p-3 z-[99999]'
                    >
                      {/* User identity */}
                      <div className='px-2 pb-1 text-sm font-semibold truncate'>
                        {user?.displayName || 'My Account'}
                      </div>
                      <div className='px-2 pb-3 text-xs text-gray-500 break-all'>
                        {user?.email}
                      </div>

                      {/* My Account link */}
                      <NavLink
                        to='/profile'
                        onClick={() => setOpenMenu(false)}
                        className='w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-gray-50'
                      >
                        My Account
                      </NavLink>

                      {/* Divider */}
                      <div className='my-1 border-t border-gray-100' />

                      <button
                        className='w-full flex items-center gap-2 px-2 py-2 text-sm rounded-md hover:bg-gray-50 text-red-600'
                        onClick={handleLogout}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>,
                    document.body,
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
        onLoginSuccess={() => {
          // If guest had an active chat session, navigate there so
          // ChatPage's auto-migration effect can fire.
          const guestSession = useGuestStore.getState().currentSession;
          if (guestSession) {
            navigate(`/chat/${guestSession.id}`);
          }
        }}
      />
    </header>
  );
}
