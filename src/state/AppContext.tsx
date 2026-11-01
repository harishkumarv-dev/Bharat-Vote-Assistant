import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { AiSettings, EventPlan, ViewId } from '../types';
import type { PlannerAction } from './plannerReducer';

export type ToastTone = 'success' | 'error' | 'info';

export interface AppContextValue {
  event: EventPlan;
  dispatch: Dispatch<PlannerAction>;
  navigate: (view: ViewId) => void;
  toast: (message: string, tone?: ToastTone) => void;
  ai: {
    settings: AiSettings;
    apiKey: string;
    configured: boolean;
    openSettings: () => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({
  value,
  children,
}: {
  value: AppContextValue;
  children: ReactNode;
}) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside an active event');
  return context;
}
