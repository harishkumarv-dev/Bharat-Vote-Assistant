import { describe, expect, it } from 'vitest';
import {
  aiIsConfigured,
  clearApiKey,
  DEFAULT_AI_SETTINGS,
  loadAiSettings,
  loadApiKey,
  saveAiSettings,
  saveApiKey,
  type AiKeyStores,
  type StorageLike,
} from './aiSettings';

function createMockStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  };
}

describe('AI settings and secure key storage', () => {
  it('returns default settings when storage is empty or invalid', () => {
    const storage = createMockStorage();
    expect(loadAiSettings(storage)).toEqual(DEFAULT_AI_SETTINGS);

    storage.setItem('gala.ai.settings.v1', '{ invalid json');
    expect(loadAiSettings(storage)).toEqual(DEFAULT_AI_SETTINGS);
  });

  it('saves and restores custom AI settings cleanly', () => {
    const storage = createMockStorage();
    saveAiSettings(storage, {
      provider: 'openai',
      model: 'gpt-4o',
      rememberKey: true,
    });

    const loaded = loadAiSettings(storage);
    expect(loaded.provider).toBe('openai');
    expect(loaded.model).toBe('gpt-4o');
    expect(loaded.rememberKey).toBe(true);
  });

  it('isolates keys in session storage by default without explicit remember toggle', () => {
    const stores: AiKeyStores = {
      local: createMockStorage(),
      session: createMockStorage(),
    };

    saveApiKey(stores, 'test-key-session', false);
    expect(stores.session.getItem('gala.ai.key.session')).toBe('test-key-session');
    expect(stores.local.getItem('gala.ai.key.local')).toBeNull();

    // Default load without rememberKey only reads session
    expect(loadApiKey(stores, { provider: 'gemini', model: '', rememberKey: false })).toBe(
      'test-key-session',
    );
  });

  it('stores keys in local storage only when rememberKey is explicitly true', () => {
    const stores: AiKeyStores = {
      local: createMockStorage(),
      session: createMockStorage(),
    };

    saveApiKey(stores, 'test-key-local', true);
    expect(stores.local.getItem('gala.ai.key.local')).toBe('test-key-local');
    expect(stores.session.getItem('gala.ai.key.session')).toBeNull();

    expect(loadApiKey(stores, { provider: 'gemini', model: '', rememberKey: true })).toBe(
      'test-key-local',
    );
  });

  it('clears API keys from all stores securely', () => {
    const stores: AiKeyStores = {
      local: createMockStorage(),
      session: createMockStorage(),
    };

    saveApiKey(stores, 'key-1', true);
    clearApiKey(stores);
    expect(stores.local.getItem('gala.ai.key.local')).toBeNull();
    expect(stores.session.getItem('gala.ai.key.session')).toBeNull();
  });

  it('identifies when AI is configured vs local mode', () => {
    expect(aiIsConfigured({ provider: 'gemini', model: '', rememberKey: false }, 'my-key')).toBe(true);
    expect(aiIsConfigured({ provider: 'gemini', model: '', rememberKey: false }, '   ')).toBe(false);
    expect(aiIsConfigured({ provider: 'local', model: '', rememberKey: false }, 'any-key')).toBe(false);
  });
});
