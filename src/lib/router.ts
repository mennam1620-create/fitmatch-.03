import { useEffect, useState, useCallback } from 'react';

export interface RouteState {
  path: string;
  params: Record<string, string>;
}

function parseHash(): RouteState {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query] = raw.split('?');
  const params: Record<string, string> = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => {
      params[k] = v;
    });
  }
  return { path: path || '/', params };
}

export function useRouter() {
  const [route, setRoute] = useState<RouteState>(() =>
    typeof window !== 'undefined' ? parseHash() : { path: '/', params: {} },
  );

  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    if (!to.startsWith('/')) to = '/' + to;
    if (window.location.hash === '#' + to) {
      // force re-render even if hash identical
      setRoute(parseHash());
    } else {
      window.location.hash = to;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return { route, navigate };
}

