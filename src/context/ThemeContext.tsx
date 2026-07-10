import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type AppliedTheme = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  appliedTheme: AppliedTheme;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'emf-theme-mode';

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    // Migrate from legacy key
    const legacy = localStorage.getItem('emf-theme');
    if (legacy === 'light' || legacy === 'dark') {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem('emf-theme');
      return legacy;
    }
  } catch {}
  return 'system';
}

function getSystemTheme(): AppliedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyThemeToDoc(theme: AppliedTheme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);
  const meta = document.getElementById('theme-color-meta');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a0f1d' : '#f8fafc');
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  appliedTheme: 'dark',
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemTheme, setSystemTheme] = useState<AppliedTheme>(getSystemTheme);

  const appliedTheme: AppliedTheme = mode === 'system' ? systemTheme : mode;

  // Apply theme to DOM and persist
  useEffect(() => {
    applyThemeToDoc(appliedTheme);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [appliedTheme, mode]);

  // Listen to system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Smooth transition helper: add class, remove after transition completes
  const animateTransition = useCallback(() => {
    const html = document.documentElement;
    html.classList.add('theme-transitioning');
    const timer = setTimeout(() => {
      html.classList.remove('theme-transitioning');
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    animateTransition();
    setModeState(newMode);
  }, [animateTransition]);

  const toggleTheme = useCallback(() => {
    animateTransition();
    setModeState(prev => {
      if (prev === 'system') {
        const current = systemTheme === 'dark' ? 'light' : 'dark';
        return current;
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  }, [animateTransition, systemTheme]);

  return (
    <ThemeContext.Provider value={{ mode, appliedTheme, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
