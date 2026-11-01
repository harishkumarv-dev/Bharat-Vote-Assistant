import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Download,
  FileJson,
  RotateCcw,
  Upload,
  Users,
} from 'lucide-react';
import type { Workspace } from '../types';
import {
  clearWorkspace,
  exportWorkspace,
  importWorkspace,
  WORKSPACE_STORAGE_KEY,
} from '../domain/persistence';
import { formatDate } from '../domain/dates';
import { Modal } from '../components/Modal';
import { Badge } from '../components/ui';
import { downloadText } from '../utils/download';

interface Props {
  open: boolean;
  onClose: () => void;
  workspace: Workspace;
  onReplace: (workspace: Workspace) => void;
  onReset: () => void;
  toast: (message: string, tone?: 'success' | 'error' | 'info') => void;
}

export function WorkspaceDataModal({
  open,
  onClose,
  workspace,
  onReplace,
  onReset,
  toast,
}: Props) {
  const [pending, setPending] = useState<Workspace | null>(null);
  const [error, setError] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setPending(null);
    setError('');
    setConfirmReset(false);
  }, [open]);

  function exportAll() {
    downloadText(
      `gala-workspace-${new Date().toISOString().slice(0, 10)}.json`,
      exportWorkspace(workspace),
      'application/json;charset=utf-8',
    );
    toast('Workspace backup downloaded. It includes guest contact details — keep it private.', 'success');
  }

  async function readBackup(file: File) {
    setPending(null);
    setError('');
    if (file.size > 2_000_000) {
      setError('That file is too large. Gala imports backups under 2 MB.');
      return;
    }
    try {
      const text = await file.text();
      const parsed = importWorkspace(text);
      setPending(parsed);
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : 'That backup could not be read. Check that it was exported from Gala.',
      );
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your data & backups"
      description="Gala saves to this browser automatically. Export a workspace backup before changing devices or clearing browser storage."
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-secondary" onClick={exportAll}>
            <Download size={15} aria-hidden="true" /> Export everything
          </button>
        </>
      }
    >
      <div className="data-summary">
        <div>
          <Archive size={20} aria-hidden="true" />
          <div>
            <strong>
              {workspace.events.length} event{workspace.events.length === 1 ? '' : 's'} in this
              workspace
            </strong>
            <p>Stored locally under the key <code>{WORKSPACE_STORAGE_KEY}</code>.</p>
          </div>
        </div>
        <Badge tone="sage">Local only</Badge>
      </div>

      <section className="data-section" aria-labelledby="data-events-title">
        <h3 id="data-events-title">Events included</h3>
        <ul className="data-event-list">
          {workspace.events.map((plan) => (
            <li key={plan.id}>
              <span>
                <strong>{plan.basics.name}</strong>
                <small>
                  {formatDate(plan.basics.date)} · {plan.guests.length} guests ·{' '}
                  {plan.vendors.length} vendors
                </small>
              </span>
              {plan.id === workspace.activeEventId && <Badge tone="accent">Open now</Badge>}
            </li>
          ))}
        </ul>
        <p className="field-help">
          An export contains every event, including guest names, emails, and notes. API keys are
          never included.
        </p>
      </section>

      <section className="data-section" aria-labelledby="data-import-title">
        <h3 id="data-import-title">Import a backup</h3>
        <p className="muted">
          Importing replaces the workspace currently in this browser. Export first if you want to
          keep it.
        </p>
        <label className="file-drop file-drop-small" htmlFor="workspace-backup">
          <FileJson size={20} aria-hidden="true" />
          <strong>Choose a Gala workspace JSON file</strong>
          <span>Validated before anything is replaced.</span>
          <input
            ref={fileRef}
            id="workspace-backup"
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={(changeEvent) => {
              const file = changeEvent.target.files?.[0];
              if (file) void readBackup(file);
            }}
          />
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        {pending && (
          <div className="import-preview">
            <div className="import-summary-row">
              <strong>Backup ready</strong>
              <Badge tone="sage">{pending.events.length} events</Badge>
            </div>
            <ul className="import-name-list">
              {pending.events.map((plan) => (
                <li key={plan.id}>
                  {plan.basics.name} · {formatDate(plan.basics.date)}
                </li>
              ))}
            </ul>
            <div className="import-confirm-actions">
              <button
                type="button"
                className="btn btn-primary btn-small"
                onClick={() => {
                  onReplace(pending);
                  setPending(null);
                  onClose();
                  toast('Workspace imported. Your plans are now on this device.', 'success');
                }}
              >
                <Upload size={14} aria-hidden="true" /> Replace this workspace
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setPending(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="data-section danger-zone" aria-labelledby="data-reset-title">
        <div>
          <h3 id="data-reset-title">Start over on this device</h3>
          <p>
            Removes every event from this browser. Export a backup first — this cannot be undone.
          </p>
        </div>
        {confirmReset ? (
          <div className="danger-confirm">
            <span>Remove all local data?</span>
            <button
              type="button"
              className="btn btn-danger btn-small"
              onClick={() => {
                clearWorkspace(window.localStorage);
                onReset();
                setConfirmReset(false);
                onClose();
                toast('Local workspace cleared. Start a new plan when you are ready.', 'info');
              }}
            >
              <RotateCcw size={14} aria-hidden="true" /> Clear workspace
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => setConfirmReset(false)}
            >
              Keep my plans
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-small danger-text"
            onClick={() => setConfirmReset(true)}
          >
            <RotateCcw size={15} aria-hidden="true" /> Clear workspace
          </button>
        )}
      </section>

      <p className="privacy-note">
        <Users size={14} aria-hidden="true" />
        Guest data is sensitive. Use a private device or encrypted storage, and delete exports you no
        longer need. <AlertTriangle size={14} aria-hidden="true" /> Clearing browser data also clears
        the saved workspace.
      </p>
    </Modal>
  );
}
