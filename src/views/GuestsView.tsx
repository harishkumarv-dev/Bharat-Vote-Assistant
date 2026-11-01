import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Mail,
  Plus,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react';
import type { Guest, RsvpStatus } from '../types';
import { DIETARY_NEEDS } from '../types';
import {
  CsvError,
  computeGuestStats,
  csvTemplate,
  exportGuestsCsv,
  parseGuestsCsv,
  type GuestImportResult,
} from '../domain/guests';
import { DIETARY_LABELS, RSVP_LABELS } from '../domain/catalog';
import { useApp } from '../state/AppContext';
import { Badge, EmptyState, ViewHeader } from '../components/ui';
import { Modal } from '../components/Modal';
import { safeFilename, downloadText } from '../utils/download';

const RSVP_TONE = {
  attending: 'sage',
  maybe: 'gold',
  pending: 'neutral',
  declined: 'danger',
} as const;

const RSVP_ORDER: RsvpStatus[] = ['attending', 'maybe', 'pending', 'declined'];

export function GuestsView() {
  const { event, dispatch, toast } = useApp();
  const [query, setQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState<'all' | RsvpStatus>('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [guestModal, setGuestModal] = useState<{ open: boolean; guest: Guest | null }>({
    open: false,
    guest: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Guest | null>(null);

  const stats = useMemo(() => computeGuestStats(event.guests), [event.guests]);
  const groups = useMemo(
    () =>
      Array.from(new Set(event.guests.map((guest) => guest.group).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [event.guests],
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    return event.guests.filter((guest) => {
      if (rsvpFilter !== 'all' && guest.rsvp !== rsvpFilter) return false;
      if (groupFilter !== 'all' && guest.group !== groupFilter) return false;
      if (!text) return true;
      return `${guest.name} ${guest.email} ${guest.group} ${guest.notes} ${guest.dietary.join(' ')}`
        .toLowerCase()
        .includes(text);
    });
  }, [event.guests, groupFilter, query, rsvpFilter]);

  function exportList() {
    if (event.guests.length === 0) {
      toast('Add a guest before exporting the list.', 'info');
      return;
    }
    downloadText(
      `${safeFilename(event.basics.name)}-guest-list.csv`,
      exportGuestsCsv(event.guests),
      'text/csv;charset=utf-8',
    );
    toast('Guest list exported. Keep the file somewhere private.', 'success');
  }

  return (
    <div className="view guests-view">
      <ViewHeader
        eyebrow="The people in the room"
        title="Guest list"
        description="Keep invitations, replies, dietary needs, and plus-ones in one private place. You can import a spreadsheet or build the list by hand."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setImportOpen(true)}
            >
              <Upload size={16} aria-hidden="true" /> Import CSV
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setGuestModal({ open: true, guest: null })}
            >
              <Plus size={16} aria-hidden="true" /> Add guest
            </button>
          </>
        }
      />

      <section className="guest-stat-grid" aria-label="Guest summary">
        <div className="stat-card stat-card-static">
          <span className="stat-icon">
            <Users size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Invitations</span>
          <span className="stat-value">{stats.invited.toLocaleString('en-US')}</span>
          <span className="stat-foot">{stats.pending} awaiting a reply</span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-sage">
            <UserRound size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Confirmed seats</span>
          <span className="stat-value">{stats.attendingHeadcount.toLocaleString('en-US')}</span>
          <span className="stat-foot">
            {stats.attending} attending · {stats.maybe} maybe
          </span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-gold">
            <Utensils size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Dietary notes</span>
          <span className="stat-value">{stats.dietary.reduce((total, item) => total + item.count, 0)}</span>
          <span className="stat-foot">
            {stats.dietary.length > 0
              ? stats.dietary
                  .slice(0, 3)
                  .map((item) => `${DIETARY_LABELS[item.need]} ×${item.count}`)
                  .join(' · ')
              : 'None recorded yet'}
          </span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-accent">
            <Mail size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Replies known</span>
          <span className="stat-value">{Math.round(stats.knownRatio * 100)}%</span>
          <span className="stat-foot">
            {stats.declined} declined · {stats.maybe} unsure
          </span>
        </div>
      </section>

      {stats.dietary.length > 0 && (
        <section className="dietary-panel panel" aria-labelledby="dietary-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">For the caterer</p>
              <h2 id="dietary-title">Dietary needs to plan for</h2>
            </div>
            <Badge tone="gold">
              {stats.dietary.reduce((total, item) => total + item.count, 0)} guests
            </Badge>
          </div>
          <div className="dietary-chips">
            {stats.dietary.map((item) => (
              <span className="dietary-chip" key={item.need}>
                {DIETARY_LABELS[item.need]} <strong>{item.count}</strong>
              </span>
            ))}
          </div>
          <p className="muted">
            Counts include plus-ones for guests who are attending or maybe. Confirm cross-contamination
            practices with your caterer, not just whether an alternative exists.
          </p>
        </section>
      )}

      <section className="panel guest-list-panel" aria-labelledby="guest-list-title">
        <div className="panel-head guest-list-head">
          <div>
            <p className="eyebrow">Everyone invited</p>
            <h2 id="guest-list-title">
              {filtered.length === event.guests.length
                ? `${event.guests.length} guests`
                : `${filtered.length} of ${event.guests.length} guests`}
            </h2>
          </div>
          <div className="guest-toolbar">
            <div className="search-field">
              <Search size={16} aria-hidden="true" />
              <label htmlFor="guest-search" className="sr-only">
                Search guests
              </label>
              <input
                id="guest-search"
                type="search"
                className="input-control"
                placeholder="Search names, groups, notes…"
                value={query}
                onChange={(changeEvent) => setQuery(changeEvent.target.value)}
              />
            </div>
            <label htmlFor="rsvp-filter" className="sr-only">
              Filter by RSVP
            </label>
            <select
              id="rsvp-filter"
              className="select-control select-compact"
              value={rsvpFilter}
              onChange={(changeEvent) =>
                setRsvpFilter(changeEvent.target.value as 'all' | RsvpStatus)
              }
            >
              <option value="all">All replies</option>
              {RSVP_ORDER.map((status) => (
                <option key={status} value={status}>
                  {RSVP_LABELS[status]}
                </option>
              ))}
            </select>
            {groups.length > 0 && (
              <>
                <label htmlFor="group-filter" className="sr-only">
                  Filter by group
                </label>
                <select
                  id="group-filter"
                  className="select-control select-compact"
                  value={groupFilter}
                  onChange={(changeEvent) => setGroupFilter(changeEvent.target.value)}
                >
                  <option value="all">All groups</option>
                  {groups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={exportList}
              disabled={event.guests.length === 0}
            >
              <Download size={15} aria-hidden="true" /> Export
            </button>
          </div>
        </div>

        {event.guests.length === 0 ? (
          <EmptyState
            icon={<Users size={28} />}
            title="Your guest list starts here"
            description="Add the people who matter, or bring a spreadsheet with columns for name, email, group, RSVP, plus-ones, dietary needs, and notes."
            action={
              <div className="empty-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setGuestModal({ open: true, guest: null })}
                >
                  <Plus size={16} aria-hidden="true" /> Add the first guest
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={16} aria-hidden="true" /> Import CSV
                </button>
              </div>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={26} />}
            title="No guests match those filters"
            description="Try a different search term, reply status, or group."
            action={
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setQuery('');
                  setRsvpFilter('all');
                  setGroupFilter('all');
                }}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="guest-table-wrap">
            <table className="guest-table">
              <caption className="sr-only">
                Guest invitations, replies, and contact notes for {event.basics.name}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Group</th>
                  <th scope="col">Reply</th>
                  <th scope="col">Seats</th>
                  <th scope="col">Dietary</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((guest) => (
                  <tr key={guest.id}>
                    <td>
                      <div className="guest-name-cell">
                        <span className="guest-avatar" aria-hidden="true">
                          {initials(guest.name)}
                        </span>
                        <span>
                          <strong>{guest.name}</strong>
                          {guest.email && (
                            <a className="guest-email" href={`mailto:${guest.email}`}>
                              {guest.email}
                            </a>
                          )}
                          {guest.notes && <small className="guest-note">{guest.notes}</small>}
                        </span>
                      </div>
                    </td>
                    <td>
                      {guest.group ? <span className="tag">{guest.group}</span> : <span className="muted">—</span>}
                    </td>
                    <td>
                      <Badge tone={RSVP_TONE[guest.rsvp]}>{RSVP_LABELS[guest.rsvp]}</Badge>
                    </td>
                    <td>
                      <span className="seats-cell">
                        {1 + guest.plusOnes}
                        {guest.plusOnes > 0 && <small>+{guest.plusOnes}</small>}
                      </span>
                    </td>
                    <td>
                      {guest.dietary.length > 0 ? (
                        <div className="table-tags">
                          {guest.dietary.map((need) => (
                            <span key={need} className="tag tag-small">
                              {DIETARY_LABELS[need]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button icon-button-small"
                          onClick={() => setGuestModal({ open: true, guest })}
                          aria-label={`Edit ${guest.name}`}
                          title={`Edit ${guest.name}`}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          className="icon-button icon-button-small danger-text"
                          onClick={() => setDeleteTarget(guest)}
                          aria-label={`Remove ${guest.name}`}
                          title={`Remove ${guest.name}`}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <GuestModal
        open={guestModal.open}
        guest={guestModal.guest}
        groups={groups}
        onClose={() => setGuestModal({ open: false, guest: null })}
        onSave={(payload, existing) => {
          if (existing) {
            dispatch({ type: 'UPDATE_GUEST', id: existing.id, patch: payload });
            toast('Guest details updated.', 'success');
          } else {
            dispatch({ type: 'ADD_GUEST', guest: payload });
            toast('Guest added to the list.', 'success');
          }
          setGuestModal({ open: false, guest: null });
        }}
      />

      <GuestImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingCount={event.guests.length}
        onImport={(result) => {
          dispatch({ type: 'IMPORT_GUESTS', guests: result.guests });
          toast(
            `${result.guests.length} guest${result.guests.length === 1 ? '' : 's'} imported.`,
            'success',
          );
          setImportOpen(false);
        }}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Remove ${deleteTarget.name}?` : 'Remove guest?'}
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Keep guest
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!deleteTarget) return;
                dispatch({ type: 'DELETE_GUEST', id: deleteTarget.id });
                toast('Guest removed from the list.', 'info');
                setDeleteTarget(null);
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Remove guest
            </button>
          </>
        }
      >
        <p>
          This removes the invitation and their notes from this plan. It does not send any message
          to the guest.
        </p>
      </Modal>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

type GuestPayload = {
  name: string;
  email: string;
  group: string;
  rsvp: RsvpStatus;
  plusOnes: number;
  dietary: Guest['dietary'];
  notes: string;
};

function GuestModal({
  open,
  guest,
  groups,
  onClose,
  onSave,
}: {
  open: boolean;
  guest: Guest | null;
  groups: string[];
  onClose: () => void;
  onSave: (payload: GuestPayload, existing: Guest | null) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [group, setGroup] = useState('');
  const [rsvp, setRsvp] = useState<RsvpStatus>('pending');
  const [plusOnes, setPlusOnes] = useState(0);
  const [dietary, setDietary] = useState<Guest['dietary']>([]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const existing = guest && guest.id ? guest : null;

  useEffect(() => {
    if (!open) return;
    setName(guest?.name ?? '');
    setEmail(guest?.email ?? '');
    setGroup(guest?.group ?? '');
    setRsvp(guest?.rsvp ?? 'pending');
    setPlusOnes(guest?.plusOnes ?? 0);
    setDietary(guest?.dietary ?? []);
    setNotes(guest?.notes ?? '');
    setError('');
  }, [open, guest]);

  function toggleDietary(need: Guest['dietary'][number]) {
    setDietary((current) =>
      current.includes(need) ? current.filter((item) => item !== need) : [...current, need],
    );
  }

  function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Add the guest’s name.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('That email address does not look right. Leave it blank if you do not have one.');
      return;
    }
    onSave(
      {
        name: trimmedName,
        email: email.trim(),
        group: group.trim(),
        rsvp,
        plusOnes: Math.min(10, Math.max(0, Math.round(plusOnes) || 0)),
        dietary,
        notes: notes.trim(),
      },
      existing,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit guest' : 'Add a guest'}
      description="Contact details stay in this browser. Only de-identified plan summaries are ever sent to an AI provider."
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="guest-form" className="btn btn-primary">
            {existing ? 'Save guest' : 'Add guest'}
          </button>
        </>
      }
    >
      <form
        id="guest-form"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          save();
        }}
      >
        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="guest-name" className="field-label">
              Name <span className="required-mark">*</span>
            </label>
            <input
              id="guest-name"
              className="input-control"
              value={name}
              maxLength={80}
              placeholder="e.g. Priya Raman"
              autoComplete="off"
              onChange={(changeEvent) => setName(changeEvent.target.value)}
              data-autofocus
            />
          </div>
          <div className="field field-wide">
            <label htmlFor="guest-email" className="field-label">
              Email
            </label>
            <input
              id="guest-email"
              type="email"
              className="input-control"
              value={email}
              maxLength={120}
              placeholder="Optional — used only for your own records"
              autoComplete="off"
              onChange={(changeEvent) => setEmail(changeEvent.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="guest-group" className="field-label">
              Group
            </label>
            <input
              id="guest-group"
              className="input-control"
              value={group}
              maxLength={40}
              placeholder="Family, friends, work…"
              list="guest-group-options"
              onChange={(changeEvent) => setGroup(changeEvent.target.value)}
            />
            <datalist id="guest-group-options">
              {groups.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="guest-rsvp" className="field-label">
              Reply
            </label>
            <select
              id="guest-rsvp"
              className="select-control"
              value={rsvp}
              onChange={(changeEvent) => setRsvp(changeEvent.target.value as RsvpStatus)}
            >
              {RSVP_ORDER.map((status) => (
                <option key={status} value={status}>
                  {RSVP_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="guest-plus-ones" className="field-label">
              Plus-ones
            </label>
            <input
              id="guest-plus-ones"
              type="number"
              min={0}
              max={10}
              className="input-control"
              value={plusOnes}
              onChange={(changeEvent) => setPlusOnes(Number(changeEvent.target.value))}
            />
            <p className="field-help">Up to 10 additional seats.</p>
          </div>
          <div className="field">
            <label htmlFor="guest-notes" className="field-label">
              Notes
            </label>
            <input
              id="guest-notes"
              className="input-control"
              value={notes}
              maxLength={300}
              placeholder="Travel, seating, a gift idea…"
              onChange={(changeEvent) => setNotes(changeEvent.target.value)}
            />
          </div>
        </div>

        <fieldset className="field-group">
          <legend className="field-label">Dietary needs</legend>
          <p className="field-help">
            Recorded for this guest and any plus-ones. Leave blank if none are known yet.
          </p>
          <div className="chip-grid chip-grid-small">
            {DIETARY_NEEDS.map((need) => {
              const active = dietary.includes(need);
              return (
                <button
                  key={need}
                  type="button"
                  className={`toggle-chip toggle-chip-small${active ? ' is-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleDietary(need)}
                >
                  {DIETARY_LABELS[need]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function GuestImportModal({
  open,
  onClose,
  onImport,
  existingCount,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (result: GuestImportResult) => void;
  existingCount: number;
}) {
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<GuestImportResult | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) return;
    setFileName('');
    setResult(null);
    setError('');
    setReading(false);
  }, [open]);

  async function readFile(file: File) {
    setFileName(file.name);
    setResult(null);
    setError('');
    if (file.size > 600_000) {
      setError('That file is too large. Please import fewer than 600 guests.');
      return;
    }
    setReading(true);
    try {
      const text = await file.text();
      const parsed = parseGuestsCsv(text);
      if (parsed.guests.length === 0) {
        setError('No valid guests were found in that file. Check the template for the expected columns.');
      } else {
        setResult(parsed);
      }
    } catch (readError) {
      setError(
        readError instanceof CsvError
          ? readError.message
          : 'That file could not be read. Save it as a UTF-8 CSV and try again.',
      );
    } finally {
      setReading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import a guest list"
      description="Use a CSV with a name column and optional email, group, rsvp, plusOnes, dietary, and notes columns."
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!result || reading}
            onClick={() => result && onImport(result)}
          >
            <Upload size={15} aria-hidden="true" />
            {result ? `Import ${result.guests.length} guest${result.guests.length === 1 ? '' : 's'}` : 'Import guests'}
          </button>
        </>
      }
    >
      <div className="import-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() =>
            downloadText(
              'gala-guest-import-template.csv',
              csvTemplate(),
              'text/csv;charset=utf-8',
            )
          }
        >
          <FileSpreadsheet size={15} aria-hidden="true" /> Download template
        </button>
        <span className="muted">UTF-8 CSV · 600 rows maximum · 500 KB</span>
      </div>

      <label className="file-drop" htmlFor="guest-csv">
        <Upload size={22} aria-hidden="true" />
        <strong>{fileName || 'Choose a CSV file'}</strong>
        <span>Click to browse. The file is read on this device only.</span>
        <input
          ref={inputRef}
          id="guest-csv"
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          data-autofocus
          onChange={(changeEvent) => {
            const file = changeEvent.target.files?.[0];
            if (file) void readFile(file);
          }}
        />
      </label>

      {reading && (
        <p className="muted" role="status">
          Reading the file…
        </p>
      )}

      {error && (
        <div className="inline-notice notice-danger" role="alert">
          <div>{error}</div>
        </div>
      )}

      {result && (
        <div className="import-preview">
          <div className="import-summary-row">
            <strong>
              {result.guests.length} guest{result.guests.length === 1 ? '' : 's'} ready
            </strong>
            {result.skipped > 0 && <Badge tone="gold">{result.skipped} row(s) skipped</Badge>}
          </div>
          <ul className="import-name-list">
            {result.guests.slice(0, 5).map((guest) => (
              <li key={guest.id}>
                {guest.name}
                {guest.group ? ` · ${guest.group}` : ''}
              </li>
            ))}
            {result.guests.length > 5 && <li>…and {result.guests.length - 5} more</li>}
          </ul>
          {result.errors.length > 0 && (
            <div className="import-errors">
              <strong>Some rows need attention</strong>
              <ul>
                {result.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="field-help">
            These will be added to the {existingCount} guest{existingCount === 1 ? '' : 's'} already
            on the list. Duplicate names are not removed automatically.
          </p>
        </div>
      )}
    </Modal>
  );
}
