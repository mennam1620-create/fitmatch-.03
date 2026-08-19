import { useState } from 'react';
import type { SizingProfile } from '@/types';
import type { User } from 'firebase/auth';
import { useAdmin } from '@/hooks/useAdmin';

interface NavProps {
  onNavigate: (to: string) => void;
  currentPath: string;
  profile: SizingProfile | null;
  onProfileCleared: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Navbar({ onNavigate, currentPath, profile, onProfileCleared, user, onSignIn, onSignOut }: NavProps) {
  const [open, setOpen] = useState(false);
  const { isAdmin } = useAdmin();

  const links = [
    { label: 'Home', to: '/' },
    { label: 'Catalog', to: '/catalog' },
    { label: 'Find My Size', to: '/find-my-size' },
    { label: 'My Profile', to: '/profile' },
  ];

  if (isAdmin) {
    links.push({ label: 'Admin', to: '/admin' });
  }

  const isActive = (to: string) => {
    if (to === '/') return currentPath === '/';
    return currentPath.startsWith(to);
  };

  const go = (to: string) => {
    onNavigate(to);
    setOpen(false);
  };

  const hasProfile = profile && Object.values(profile.measurements).some((v) => typeof v === 'number');

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-neutral-200/80">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <button onClick={() => go('/')} className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white text-[13px] font-serif font-semibold tracking-wide transition-transform group-hover:scale-105">FM</span>
            <span className="font-serif text-xl tracking-tight text-neutral-900 group-hover:text-neutral-700 transition-colors">FitMatch</span>
          </button>

          <nav className="hidden md:flex items-center gap-0.5">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => go(l.to)}
                className={`relative px-3.5 py-2 text-sm rounded-md transition-colors ${
                  isActive(l.to)
                    ? 'text-neutral-900 font-medium'
                    : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {l.label}
                {isActive(l.to) && (
                  <span className="absolute left-3.5 right-3.5 -bottom-px h-px bg-neutral-900" />
                )}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <button
                onClick={onSignOut}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={onSignIn}
                className="text-xs font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-colors"
              >
                Sign in
              </button>
            )}
            
            {hasProfile ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {profile?.name ? profile.name.split(' ')[0] : 'Profile saved'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                No profile
              </span>
            )}
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-neutral-600"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-neutral-200 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {links.map((l) => (
              <button
                key={l.to}
                onClick={() => go(l.to)}
                className={`block w-full text-left px-3 py-2.5 text-sm rounded-md ${
                  isActive(l.to) ? 'bg-neutral-100 text-neutral-900 font-medium' : 'text-neutral-600 hover:bg-neutral-50'
                }`}
              >
                {l.label}
              </button>
            ))}
            {hasProfile && (
              <button
                onClick={() => {
                  onProfileCleared();
                  go('/');
                }}
                className="block w-full text-left px-3 py-2.5 text-sm text-neutral-400 hover:text-neutral-600"
              >
                Reset profile
              </button>
            )}
            {user ? (
              <button
                onClick={() => {
                  onSignOut();
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2.5 text-sm text-neutral-600 hover:bg-neutral-50"
              >
                Sign out
              </button>
            ) : (
              <button
                onClick={() => {
                  onSignIn();
                  setOpen(false);
                }}
                className="block w-full text-left px-3 py-2.5 text-sm font-medium text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-md"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
