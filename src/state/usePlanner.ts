import { useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import type { Workspace } from '../types';
import { initialWorkspace } from '../domain/factory';
import { loadWorkspace, saveWorkspace } from '../domain/persistence';
import { plannerReducer, type PlannerAction } from './plannerReducer';

interface InitialState {
  workspace: Workspace;
  loadError: string | null;
}

function initialState(): InitialState {
  if (typeof window === 'undefined') {
    return { workspace: initialWorkspace(), loadError: null };
  }
  const result = loadWorkspace(window.localStorage);
  return {
    workspace: result.workspace ?? initialWorkspace(),
    loadError: result.error,
  };
}

export interface PlannerStore {
  workspace: Workspace;
  activeEvent: Workspace['events'][number] | null;
  dispatch: Dispatch<PlannerAction>;
  loadError: string | null;
  saveError: string | null;
}

export function usePlanner(): PlannerStore {
  const [initial] = useState(initialState);
  const [workspace, dispatch] = useReducer(plannerReducer, initial.workspace);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  }, [workspace]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSaveError(saveWorkspace(window.localStorage, workspace));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  useEffect(() => {
    const flush = () => {
      saveWorkspace(window.localStorage, latest.current);
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const activeEvent =
    workspace.events.find((event) => event.id === workspace.activeEventId) ?? null;

  return {
    workspace,
    activeEvent,
    dispatch,
    loadError: initial.loadError,
    saveError,
  };
}
