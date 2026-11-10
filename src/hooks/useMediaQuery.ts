import { useState, useEffect } from 'react';

/**
 * Responsive Media Query Hook (SSR-safe)
 *
 * Implements window.matchMedia with cross-browser compatibility
 * (supporting modern addEventListener('change') and legacy addListener).
 * Safe for server-side rendering environments where `window` is undefined.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (q: string): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(q).matches;
  };

  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setMatches(event.matches);
    };

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', handleChange);
    } else if (typeof (mediaQueryList as any).addListener === 'function') {
      (mediaQueryList as any).addListener(handleChange);
    }

    return () => {
      if (typeof mediaQueryList.removeEventListener === 'function') {
        mediaQueryList.removeEventListener('change', handleChange);
      } else if (typeof (mediaQueryList as any).removeListener === 'function') {
        (mediaQueryList as any).removeListener(handleChange);
      }
    };
  }, [query]);

  return matches;
}

export default useMediaQuery;
