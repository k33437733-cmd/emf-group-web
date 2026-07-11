import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Conversation, ChatMessage, UserProfile } from '../types';

interface AppState {
  globalLoading: boolean;
  setGlobalLoading: (v: boolean) => void;
  lastError: string | null;
  setLastError: (err: string | null) => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  return (
    <AppStateContext.Provider value={{ globalLoading, setGlobalLoading, lastError, setLastError }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider');
  return ctx;
}
