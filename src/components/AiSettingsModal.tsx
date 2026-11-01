import { useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { AiProvider, AiSettings } from '../types';
import { DEFAULT_MODELS, PROVIDER_LABELS } from '../state/aiSettings';
import { AiError, testConnection } from '../ai/client';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  settings: AiSettings;
  apiKey: string;
  onSave: (settings: AiSettings, apiKey: string) => void;
  onClearKey: () => void;
}

const PROVIDERS: Array<{ id: AiProvider; description: string }> = [
  {
    id: 'gemini',
    description: 'A generous free tier and direct browser support. Good starting point.',
  },
  {
    id: 'openai',
    description: 'Use an OpenAI key and a model your account can access.',
  },
  {
    id: 'local',
    description: 'No network requests. The built-in rules engine handles every feature.',
  },
];

export function AiSettingsModal({
  open,
  onClose,
  settings,
  apiKey,
  onSave,
  onClearKey,
}: Props) {
  const [provider, setProvider] = useState<AiProvider>(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [key, setKey] = useState(apiKey);
  const [remember, setRemember] = useState(settings.rememberKey);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setProvider(settings.provider);
    setModel(settings.model);
    setKey(apiKey);
    setRemember(settings.rememberKey);
    setShowKey(false);
    setTestStatus('idle');
    setTestMessage('');
  }, [open, settings, apiKey]);

  function chooseProvider(next: AiProvider) {
    setProvider(next);
    setTestStatus('idle');
    setTestMessage('');
    if (next === 'local') {
      setModel('');
    } else if (!model || model === DEFAULT_MODELS.gemini || model === DEFAULT_MODELS.openai) {
      setModel(DEFAULT_MODELS[next]);
    }
  }

  async function runTest() {
    if (provider === 'local') return;
    setTestStatus('testing');
    setTestMessage('Contacting the provider…');
    try {
      await testConnection({ provider, model, rememberKey: remember }, key);
      setTestStatus('success');
      setTestMessage('Connection successful. This key can reach the selected model.');
    } catch (error) {
      setTestStatus('error');
      setTestMessage(
        error instanceof AiError ? error.message : 'The connection test failed. Try again.',
      );
    }
  }

  function save() {
    onSave(
      {
        provider,
        model: provider === 'local' ? '' : model.trim() || DEFAULT_MODELS[provider],
        rememberKey: provider !== 'local' ? remember : false,
      },
      provider === 'local' ? '' : key.trim(),
    );
    onClose();
  }

  const isLocal = provider === 'local';
  const canTest = !isLocal && key.trim().length > 0 && model.trim().length > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="AI & privacy settings"
      description="Gala works fully offline. AI is an optional second brain that you control."
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save settings
          </button>
        </>
      }
    >
      <fieldset className="field-group">
        <legend className="field-label">Answer engine</legend>
        <div className="provider-list">
          {PROVIDERS.map((option) => (
            <label
              key={option.id}
              className={`provider-option${provider === option.id ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="ai-provider"
                value={option.id}
                checked={provider === option.id}
                onChange={() => chooseProvider(option.id)}
                data-autofocus={option.id === provider ? true : undefined}
              />
              <span className="provider-radio" aria-hidden="true" />
              <span>
                <strong>{PROVIDER_LABELS[option.id]}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {!isLocal && (
        <>
          <div className="field">
            <label htmlFor="ai-key" className="field-label">
              API key
            </label>
            <div className="secret-input">
              <KeyRound size={17} aria-hidden="true" />
              <input
                id="ai-key"
                type={showKey ? 'text' : 'password'}
                className="input-control"
                value={key}
                onChange={(event) => {
                  setKey(event.target.value);
                  setTestStatus('idle');
                }}
                placeholder={provider === 'gemini' ? 'Paste a Gemini API key' : 'Paste an OpenAI API key'}
                autoComplete="off"
                spellCheck={false}
                maxLength={512}
              />
              <button
                type="button"
                className="secret-toggle"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            <p className="field-help">
              Keys are stored only in this browser. Session storage is the default; remembering is
              an explicit choice below. Keys are never included in exported plans.
            </p>
            <div className="provider-links">
              <a
                href={
                  provider === 'gemini'
                    ? 'https://aistudio.google.com/app/apikey'
                    : 'https://platform.openai.com/api-keys'
                }
                target="_blank"
                rel="noreferrer noopener"
              >
                Get a {provider === 'gemini' ? 'Gemini' : 'OpenAI'} key
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="field">
            <label htmlFor="ai-model" className="field-label">
              Model
            </label>
            <input
              id="ai-model"
              className="input-control"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder={DEFAULT_MODELS[provider]}
              maxLength={80}
              spellCheck={false}
            />
            <p className="field-help">
              The default works for most accounts. Change it if your key uses a different model.
            </p>
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span>
              <strong>Remember this key on this device</strong>
              <small>
                Without this, the key disappears when you close the browser tab. Only use this on a
                private device.
              </small>
            </span>
          </label>

          <div className="test-row">
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={runTest}
              disabled={!canTest || testStatus === 'testing'}
            >
              {testStatus === 'testing' ? (
                <Loader2 size={15} className="spin" aria-hidden="true" />
              ) : (
                <Sparkles size={15} aria-hidden="true" />
              )}
              Test connection
            </button>
            <span
              className={`test-message test-${testStatus}`}
              role="status"
              aria-live="polite"
            >
              {testMessage}
            </span>
          </div>

          {key && (
            <button
              type="button"
              className="text-button danger-text"
              onClick={() => {
                onClearKey();
                setKey('');
                setTestStatus('idle');
                setTestMessage('Saved key removed from this browser.');
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Remove saved key
            </button>
          )}
        </>
      )}

      {isLocal && (
        <div className="local-mode-note">
          <Sparkles size={18} aria-hidden="true" />
          <p>
            You are in local mode. Every feature works without sending data anywhere. The coach
            uses your plan data and planning rules on this device.
          </p>
        </div>
      )}

      <div className="privacy-callout">
        <ShieldCheck size={19} aria-hidden="true" />
        <div>
          <strong>What leaves this device when you use AI</strong>
          <p>
            Only a summary of the event you ask about: type, date, guest count, budget,
            categories, vendor status, and the concept. Guest names, emails, phone numbers, and
            API keys are never sent. The request goes directly to your chosen provider when you
            click an AI action.
          </p>
        </div>
      </div>
    </Modal>
  );
}
