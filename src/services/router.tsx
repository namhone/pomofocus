import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export interface RouteMatch {
  pathname: string;
  path: string;
  params: Record<string, string>;
  search: string;
  searchParams: URLSearchParams;
}

export interface RouterContextType {
  currentPath: string;
  routeMatch: RouteMatch;
  currentRoute: RouteMatch;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

function parsePath(pathname: string): { normalized: string; params: Record<string, string> } {
  // Chuẩn hóa đường dẫn: bỏ trailing slash nếu không phải '/'
  const clean = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Khớp pattern /rooms/:roomId
  const roomMatch = clean.match(/^\/rooms\/([^/]+)/);
  if (roomMatch) {
    return {
      normalized: '/rooms/:roomId',
      params: { roomId: decodeURIComponent(roomMatch[1]) }
    };
  }

  return {
    normalized: clean || '/',
    params: {}
  };
}

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const [search, setSearch] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.search || '';
    }
    return '';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
      setSearch(window.location.search || '');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (to: string, options?: { replace?: boolean }) => {
    if (typeof window === 'undefined') return;

    const [newPath, newSearch = ''] = to.split('?');
    const formattedSearch = newSearch ? `?${newSearch}` : '';

    if (options?.replace) {
      window.history.replaceState({}, '', `${newPath}${formattedSearch}`);
    } else {
      window.history.pushState({}, '', `${newPath}${formattedSearch}`);
    }

    setCurrentPath(newPath || '/');
    setSearch(formattedSearch);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const routeMatch = useMemo<RouteMatch>(() => {
    const { params } = parsePath(currentPath);
    return {
      pathname: currentPath,
      path: currentPath,
      params,
      search,
      searchParams: new URLSearchParams(search)
    };
  }, [currentPath, search]);

  return (
    <RouterContext.Provider value={{ currentPath, routeMatch, currentRoute: routeMatch, navigate }}>
      {children}
    </RouterContext.Provider>
  );
};

export function useRouter(): RouterContextType {
  const context = useContext(RouterContext);
  if (!context) {
    const fallbackMatch: RouteMatch = {
      pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
      path: typeof window !== 'undefined' ? window.location.pathname : '/',
      params: {},
      search: typeof window !== 'undefined' ? window.location.search : '',
      searchParams: new URLSearchParams()
    };
    return {
      currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
      routeMatch: fallbackMatch,
      currentRoute: fallbackMatch,
      navigate: (to: string) => {
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', to);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    };
  }
  return context;
}

export const Link: React.FC<{
  href: string;
  className?: string;
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
}> = ({ href, className, children, title, onClick }) => {
  const { navigate } = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return; // Cho phép mở tab mới bình thường
    }
    e.preventDefault();
    if (onClick) onClick();
    navigate(href);
  };

  return (
    <a href={href} onClick={handleClick} className={className} title={title}>
      {children}
    </a>
  );
};
