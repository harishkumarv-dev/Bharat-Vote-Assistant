import type { Workspace } from '../types';
import { workspaceSchema } from './validation';

export const WORKSPACE_STORAGE_KEY = 'gala.workspace.v1';
const BACKUP_KEY = 'gala.workspace.backup';
const MAX_IMPORT_BYTES = 2_000_000;

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface LoadWorkspaceResult {
  workspace: Workspace | null;
  error: string | null;
}

export function loadWorkspace(storage: StorageLike): LoadWorkspaceResult {
  let raw: string | null = null;
  try {
    raw = storage.getItem(WORKSPACE_STORAGE_KEY);
  } catch {
    return { workspace: null, error: 'This browser is blocking local storage.' };
  }
  if (!raw) return { workspace: null, error: null };

  try {
    const parsed: unknown = JSON.parse(raw);
    const workspace = workspaceSchema.parse(parsed) as Workspace;
    return { workspace, error: null };
  } catch {
    try {
      // Keep the user's raw data rather than silently destroying it.
      storage.setItem(BACKUP_KEY, raw.slice(0, MAX_IMPORT_BYTES));
      storage.removeItem(WORKSPACE_STORAGE_KEY);
    } catch {
      // Storage may be unavailable; the app still works for this session.
    }
    return {
      workspace: null,
      error: 'Saved data could not be read. A backup copy was kept on this device.',
    };
  }
}

export function saveWorkspace(storage: StorageLike, workspace: Workspace): string | null {
  try {
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
    return null;
  } catch {
    return 'Changes could not be saved. Your browser storage may be full or blocked.';
  }
}

export function clearWorkspace(storage: StorageLike): void {
  try {
    storage.removeItem(WORKSPACE_STORAGE_KEY);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}

/** Exports only planning data. API keys live outside the workspace and are never included. */
export function exportWorkspace(workspace: Workspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function importWorkspace(raw: string): Workspace {
  if (raw.length > MAX_IMPORT_BYTES) {
    throw new Error('That file is too large. Gala imports files under 2 MB.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const result = workspaceSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('That file is not a valid Gala backup. Check that it was exported from Gala.');
  }
  const workspace = result.data as Workspace;
  if (workspace.events.length === 0) {
    throw new Error('That backup does not contain any events.');
  }
  if (!workspace.activeEventId) {
    workspace.activeEventId = workspace.events[0].id;
  }
  return workspace;
}
