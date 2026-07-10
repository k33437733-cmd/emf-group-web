import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark' | 'system';
type AppliedTheme = 'light' | 'dark';
type AccentColor = 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'gold' | 'green' | 'cyan' | 'dark' | 'navy';

interface ThemeContextValue {
  mode: ThemeMode;
  appliedTheme: AppliedTheme;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setAccent: (accent: AccentColor) => void;
}

const STORAGE_KEY = 'emf-theme-mode';
const ACCENT_KEY = 'emf-accent-color';

const accentMap: Record<AccentColor, string> = {
  blue: '#3b82f6',
  purple: '#8b5cf6',
  pink: '#ec4899',
  red: '#ef4444',
  orange: '#f59e0b',
  gold: '#f1c40f',
  green: '#10b981',
  cyan: '#06b6d4',
  dark: '#0f172a',
  navy: '#1e3a8a',
};

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    const legacy = localStorage.getItem('emf-theme');
    if (legacy === 'light' || legacy === 'dark') {
      localStorage.setItem(STORAGE_KEY, legacy);
      localStorage.removeItem('emf-theme');
      return legacy;
    }
  } catch {}
  return 'system';
}

function getInitialAccent(): AccentColor {
  try {
    const stored = localStorage.getItem(ACCENT_KEY) as AccentColor;
    if (stored && accentMap[stored]) return stored;
  } catch {}
  return 'blue';
}

function getSystemTheme(): AppliedTheme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyThemeToDoc(theme: AppliedTheme, accent: AccentColor) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-bs-theme', theme);
  document.documentElement.style.setProperty('--accent-blue', accentMap[accent]);
  const meta = document.getElementById('theme-color-meta');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a0f1d' : '#f8fafc');
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  appliedTheme: 'dark',
  accent: 'blue',
  setMode: () => {},
  toggleTheme: () => {},
  setAccent: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [accent, setAccentState] = useState<AccentColor>(getInitialAccent);
  const [systemTheme, setSystemTheme] = useState<AppliedTheme>(getSystemTheme);

  const appliedTheme: AppliedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    applyThemeToDoc(appliedTheme, accent);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}
  }, [appliedTheme, mode, accent]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  const setAccent = useCallback((newAccent: AccentColor) => {
    animateTransition();
    setAccentState(newAccent);
    try { localStorage.setItem(ACCENT_KEY, newAccent); } catch {}
  }, [animateTransition]);

  return (
    <ThemeContext.Provider value={{ mode, appliedTheme, accent, setMode, toggleTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
