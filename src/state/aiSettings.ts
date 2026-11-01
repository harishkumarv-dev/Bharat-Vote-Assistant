import type { AiProvider, AiSettings } from '../types';

const SETTINGS_KEY = 'gala.ai.settings.v1';
const SESSION_KEY = 'gala.ai.key.session';
const LOCAL_KEY = 'gala.ai.key.local';

export const DEFAULT_MODELS: Record<Exclude<AiProvider, 'local'>, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
};

export const PROVIDER_LABELS: Record<AiProvider, string> = {
  gemini: 'Google Gemini',
  openai: 'OpenAI',
  local: 'Local plan engine',
};

export const DEFAULT_AI_SETTINGS: AiSettings = {
  provider: 'gemini',
  model: DEFAULT_MODELS.gemini,
  rememberKey: false,
};

export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface AiKeyStores {
  /** Persists only when the user explicitly chooses to remember the key. */
  local: StorageLike;
  /** The default, tab-scoped store. */
  session: StorageLike;
}

export function loadAiSettings(storage: StorageLike): AiSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AiSettings>;
    const provider: AiProvider =
      parsed.provider === 'openai' || parsed.provider === 'local' || parsed.provider === 'gemini'
        ? parsed.provider
        : 'gemini';
    const model =
      typeof parsed.model === 'string' && parsed.model.trim().length > 0
        ? parsed.model.trim().slice(0, 80)
        : provider === 'local'
          ? ''
          : DEFAULT_MODELS[provider];
    return {
      provider,
      model,
      rememberKey: Boolean(parsed.rememberKey),
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAiSettings(storage: StorageLike, settings: AiSettings): void {
  try {
    storage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        provider: settings.provider,
        model: settings.model,
        rememberKey: settings.rememberKey,
      }),
    );
  } catch {
    // Settings are a convenience; failing to persist them should not break the app.
  }
}

export function loadApiKey(stores: AiKeyStores, settings: AiSettings): string {
  try {
    if (settings.rememberKey) {
      return stores.local.getItem(LOCAL_KEY) ?? stores.session.getItem(SESSION_KEY) ?? '';
    }
    // Without explicit consent, never read a key left behind in local storage.
    return stores.session.getItem(SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

/**
 * Session storage is the default. Remembering a key on the device is an
 * explicit opt-in and is never written into an exported plan.
 */
export function saveApiKey(stores: AiKeyStores, apiKey: string, remember: boolean): void {
  try {
    stores.local.removeItem(LOCAL_KEY);
    stores.session.removeItem(SESSION_KEY);
    if (!apiKey) return;
    if (remember) stores.local.setItem(LOCAL_KEY, apiKey);
    else stores.session.setItem(SESSION_KEY, apiKey);
  } catch {
    // Ignore storage failures; the key remains in memory for this session.
  }
}

export function clearApiKey(stores: AiKeyStores): void {
  try {
    stores.local.removeItem(LOCAL_KEY);
    stores.session.removeItem(SESSION_KEY);
  } catch {
    // Ignore.
  }
}

export function aiIsConfigured(settings: AiSettings, apiKey: string): boolean {
  return settings.provider !== 'local' && apiKey.trim().length > 0;
}
