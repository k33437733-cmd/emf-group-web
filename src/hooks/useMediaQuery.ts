import { useState, useEffect } from 'react';

const queries = {
  mobile: '(max-width: 480px)',
  largeMobile: '(min-width: 481px) and (max-width: 767px)',
  tablet: '(min-width: 768px) and (max-width: 1023px)',
  laptop: '(min-width: 1024px) and (max-width: 1439px)',
  desktop: '(min-width: 1440px)',
  ultraWide: '(min-width: 1920px)',
  mobileOrTablet: '(max-width: 1023px)',
  tabletOrLaptop: '(min-width: 768px) and (max-width: 1439px)',
  touch: '(hover: none) and (pointer: coarse)',
  reducedMotion: '(prefers-reduced-motion: reduce)',
};

type Breakpoint = keyof typeof queries;

const defaultState: Record<Breakpoint, boolean> = Object.keys(queries).reduce(
  (acc, key) => ({ ...acc, [key]: false }),
  {} as Record<Breakpoint, boolean>
);

export function useMediaQuery() {
  const [matches, setMatches] = useState<Record<Breakpoint, boolean>>(() => {
    if (typeof window === 'undefined') return defaultState;
    const result: any = {};
    for (const [key, q] of Object.entries(queries)) {
      result[key] = window.matchMedia(q).matches;
    }
    return result;
  });

  useEffect(() => {
    const mqls: MediaQueryList[] = [];
    const listeners: (() => void)[] = [];

    for (const [key, q] of Object.entries(queries)) {
      const mql = window.matchMedia(q);
      mqls.push(mql);
      const handler = () => {
        setMatches(prev => ({ ...prev, [key]: mql.matches }));
      };
      mql.addEventListener('change', handler);
      listeners.push(() => mql.removeEventListener('change', handler));
    }

    return () => listeners.forEach(fn => fn());
  }, []);

  return matches;
}
