import { useEffect, useRef, useState } from 'react';
import {
  ClipboardCheck,
  Loader2,
  Mail,
  Send,
  Settings2,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import type { Vendor } from '../types';
import { useApp } from '../state/AppContext';
import { draftVendorEmail } from '../domain/vendors';
import { AiError, generateJson } from '../ai/client';
import { aiEmailSchema } from '../ai/schema';
import { buildEmailPrompt, emailSystemPrompt } from '../ai/prompts';
import { Modal } from '../components/Modal';
import { Badge } from '../components/ui';

/**
 * A vendor email composer. The local draft always works; AI is an optional
 * rewrite. The user can edit everything before copying or opening a mail app.
 */
export function VendorEmailModal({
  open,
  vendor,
  onClose,
}: {
  open: boolean;
  vendor: Vendor | null;
  onClose: () => void;
}) {
  const { event, toast, ai } = useApp();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [extra, setExtra] = useState('');
  const [source, setSource] = useState<'local' | 'ai'>('local');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open || !vendor) return;
    const draft = draftVendorEmail(event, vendor);
    setSubject(draft.subject);
    setBody(draft.body);
    setExtra('');
    setSource('local');
    setError(null);
    setGenerating(false);
  }, [open, vendor, event]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  if (!vendor) return null;
  const selectedVendor = vendor;

  function regenerateLocal() {
    const draft = draftVendorEmail(event, selectedVendor, extra);
    setSubject(draft.subject);
    setBody(draft.body);
    setSource('local');
    setError(null);
  }

  async function generateWithAi() {
    if (!ai.configured) {
      ai.openSettings();
      return;
    }
    setGenerating(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await generateJson(
        {
          settings: ai.settings,
          apiKey: ai.apiKey,
          system: emailSystemPrompt(),
          user: buildEmailPrompt(event, selectedVendor, extra),
          signal: controller.signal,
        },
        aiEmailSchema,
      );
      setSubject(result.subject);
      setBody(result.body);
      setSource('ai');
      toast('AI draft ready. Review it before sending.', 'success');
    } catch (requestError) {
      if (requestError instanceof AiError && requestError.code === 'aborted') return;
      setError(
        requestError instanceof AiError
          ? requestError.message
          : 'The AI draft could not be generated. The local draft is still ready to use.',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      toast('Email draft copied to the clipboard.', 'success');
    } catch {
      toast('Your browser blocked clipboard access. Select the text and copy it manually.', 'error');
    }
  }

  const mailto = selectedVendor.email
    ? `mailto:${encodeURIComponent(selectedVendor.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Email ${selectedVendor.contactName || selectedVendor.name}`}
      description="A starting point, not a sent message. Check availability, inclusions, accessibility, and cancellation terms before booking."
      size="large"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-secondary" onClick={copyDraft}>
            <ClipboardCheck size={15} aria-hidden="true" /> Copy draft
          </button>
          {mailto ? (
            <a className="btn btn-primary" href={mailto}>
              <Send size={15} aria-hidden="true" /> Open in mail app
            </a>
          ) : (
            <button type="button" className="btn btn-primary" disabled>
              <Mail size={15} aria-hidden="true" /> Add an email first
            </button>
          )}
        </>
      }
    >
      <div className="email-draft-meta">
        <div>
          <span className="email-to-label">To</span>
          <strong>{selectedVendor.contactName || selectedVendor.name}</strong>
          <span className="muted">{selectedVendor.email || 'No email recorded'}</span>
        </div>
        <Badge tone={source === 'ai' ? 'accent' : 'sage'}>
          {source === 'ai' ? 'AI draft' : 'Local draft'}
        </Badge>
      </div>

      <div className="field">
        <label htmlFor="email-extra" className="field-label">
          Anything else to include? <span className="optional-mark">optional</span>
        </label>
        <input
          id="email-extra"
          className="input-control"
          value={extra}
          maxLength={300}
          placeholder="e.g. ask about a vegetarian tasting or step-free guest access"
          onChange={(changeEvent) => setExtra(changeEvent.target.value)}
          data-autofocus
        />
      </div>

      <div className="email-draft-actions">
        <button type="button" className="btn btn-secondary btn-small" onClick={regenerateLocal}>
          <WandSparkles size={15} aria-hidden="true" /> Local draft
        </button>
        <button
          type="button"
          className="btn btn-primary btn-small"
          onClick={generateWithAi}
          disabled={generating}
        >
          {generating ? (
            <Loader2 size={15} className="spin" aria-hidden="true" />
          ) : (
            <Sparkles size={15} aria-hidden="true" />
          )}
          {generating ? 'Drafting…' : ai.configured ? 'Draft with AI' : 'Connect AI'}
        </button>
        {!ai.configured && (
          <button type="button" className="text-button" onClick={() => ai.openSettings()}>
            <Settings2 size={14} aria-hidden="true" /> Choose a provider
          </button>
        )}
      </div>

      {error && (
        <div className="inline-notice notice-danger" role="alert">
          <div>{error}</div>
        </div>
      )}

      <div className="field">
        <label htmlFor="email-subject" className="field-label">
          Subject
        </label>
        <input
          id="email-subject"
          className="input-control"
          value={subject}
          maxLength={150}
          onChange={(changeEvent) => setSubject(changeEvent.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="email-body" className="field-label">
          Body
        </label>
        <textarea
          id="email-body"
          className="textarea-control email-body"
          rows={13}
          maxLength={2000}
          value={body}
          onChange={(changeEvent) => {
            setBody(changeEvent.target.value);
            setSource('local');
          }}
        />
        <p className="field-help field-count">{body.length}/2,000 characters</p>
      </div>
      <p className="privacy-note">
        <Sparkles size={14} aria-hidden="true" />
        AI drafting sends the vendor’s business details and a plan summary — never your guest
        names or contact list. {selectedVendor.email ? 'Your mail app opens with the draft; nothing is sent automatically.' : ''}
      </p>
    </Modal>
  );
}
