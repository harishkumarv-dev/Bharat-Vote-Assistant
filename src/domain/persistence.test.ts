import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_STORAGE_KEY,
  clearWorkspace,
  exportWorkspace,
  importWorkspace,
  loadWorkspace,
  saveWorkspace,
  type StorageLike,
} from './persistence';
import { initialWorkspace } from './factory';

const FIXED_NOW = new Date(2026, 10, 1, 10, 0, 0);
const BACKUP_KEY = 'gala.workspace.backup';

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  failReads = false;
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new Error('blocked');
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('full');
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

function sampleWorkspace() {
  return initialWorkspace(FIXED_NOW);
}

describe('workspace persistence', () => {
  it('returns empty when nothing is stored', () => {
    expect(loadWorkspace(new MemoryStorage())).toEqual({ workspace: null, error: null });
  });

  it('saves and restores a valid workspace', () => {
    const storage = new MemoryStorage();
    const workspace = sampleWorkspace();
    expect(saveWorkspace(storage, workspace)).toBeNull();
    expect(storage.data.has(WORKSPACE_STORAGE_KEY)).toBe(true);

    const loaded = loadWorkspace(storage);
    expect(loaded.error).toBeNull();
    expect(loaded.workspace?.events[0].basics.name).toBe('Maya & Arjun’s garden wedding');
  });

  it('keeps a backup and clears the key when saved data is unreadable', () => {
    const storage = new MemoryStorage();
    storage.setItem(WORKSPACE_STORAGE_KEY, '{ this is not json');
    const loaded = loadWorkspace(storage);
    expect(loaded.workspace).toBeNull();
    expect(loaded.error).toMatch(/backup copy/);
    expect(storage.getItem(BACKUP_KEY)).toBe('{ this is not json');
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
  });

  it('backs up schema-invalid data too', () => {
    const storage = new MemoryStorage();
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify({ schemaVersion: 99, events: [] }));
    const loaded = loadWorkspace(storage);
    expect(loaded.workspace).toBeNull();
    expect(loaded.error).toMatch(/could not be read/);
    expect(storage.getItem(BACKUP_KEY)).not.toBeNull();
  });

  it('reports blocked reads and failed writes without throwing', () => {
    const blocked = new MemoryStorage();
    blocked.failReads = true;
    expect(loadWorkspace(blocked)).toMatchObject({
      workspace: null,
      error: 'This browser is blocking local storage.',
    });

    const full = new MemoryStorage();
    full.failWrites = true;
    expect(saveWorkspace(full, sampleWorkspace())).toMatch(/could not be saved/);
  });

  it('clears a workspace safely', () => {
    const storage = new MemoryStorage();
    saveWorkspace(storage, sampleWorkspace());
    clearWorkspace(storage);
    expect(storage.getItem(WORKSPACE_STORAGE_KEY)).toBeNull();
    storage.failWrites = true;
    expect(() => clearWorkspace(storage)).not.toThrow();
  });
});

describe('workspace export and import', () => {
  it('exports readable planning data and no API key material', () => {
    const workspace = sampleWorkspace();
    workspace.events[0].vibe.notes = 'A private note';
    const exported = exportWorkspace(workspace);
    expect(exported).toContain('"schemaVersion": 1');
    expect(exported).toContain('A private note');
    expect(exported.toLowerCase()).not.toContain('apikey');
    expect(exported.toLowerCase()).not.toContain('api_key');
    expect(JSON.parse(exported)).toMatchObject({ schemaVersion: 1 });
  });

  it('imports a BOM-prefixed backup and repairs a missing active event', () => {
    const workspace = sampleWorkspace();
    workspace.activeEventId = null;
    const imported = importWorkspace(`\uFEFF${JSON.stringify(workspace)}`);
    expect(imported.activeEventId).toBe(imported.events[0].id);
  });

  it('rejects malformed, oversized, empty, and foreign files', () => {
    expect(() => importWorkspace('{ bad')).toThrow(/not valid JSON/);
    expect(() => importWorkspace('x'.repeat(2_000_001))).toThrow(/too large/);
    expect(() => importWorkspace(JSON.stringify({ schemaVersion: 1, events: [] }))).toThrow(
      /does not contain any events/,
    );
    expect(() => importWorkspace(JSON.stringify({ hello: 'world' }))).toThrow(/valid Gala backup/);
  });

  it('accepts a backup with multiple events and keeps their order', () => {
    const workspace = sampleWorkspace();
    const second = sampleWorkspace().events[0];
    second.id = 'event_second';
    second.basics.name = 'Second event';
    workspace.events.push(second);
    const imported = importWorkspace(JSON.stringify(workspace));
    expect(imported.events.map((event) => event.basics.name)).toEqual([
      'Maya & Arjun’s garden wedding',
      'Second event',
    ]);
  });
});
