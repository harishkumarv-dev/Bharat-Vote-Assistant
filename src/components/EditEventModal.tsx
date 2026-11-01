import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, MapPin, Trash2, Users, Wallet } from 'lucide-react';
import type { CurrencyCode, EventBasics, EventPlan } from '../types';
import { CURRENCIES } from '../types';
import { EVENT_TYPE_META } from '../domain/catalog';
import { formatDate, todayIso } from '../domain/dates';
import { Modal } from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
  event: EventPlan;
  onSave: (patch: Partial<EventBasics>) => void;
  onDelete: () => void;
}

export function EditEventModal({ open, onClose, event, onSave, onDelete }: Props) {
  const [name, setName] = useState(event.basics.name);
  const [date, setDate] = useState(event.basics.date);
  const [location, setLocation] = useState(event.basics.location);
  const [guestCount, setGuestCount] = useState(event.basics.guestCount);
  const [budget, setBudget] = useState(event.basics.budget);
  const [currency, setCurrency] = useState<CurrencyCode>(event.basics.currency);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(event.basics.name);
    setDate(event.basics.date);
    setLocation(event.basics.location);
    setGuestCount(event.basics.guestCount);
    setBudget(event.basics.budget);
    setCurrency(event.basics.currency);
    setErrors({});
    setConfirmDelete(false);
  }, [open, event]);

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'The event needs a name.';
    if (!date) next.date = 'Choose a date.';
    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 2000) {
      next.guestCount = 'Use a guest count between 1 and 2,000.';
    }
    if (!Number.isFinite(budget) || budget < 0) next.budget = 'Use a valid budget.';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSave({
      name: name.trim(),
      date,
      location: location.trim(),
      guestCount: Math.round(guestCount),
      budget: Math.round(budget),
      currency,
    });
    onClose();
  }

  const dateChanged = date !== event.basics.date;
  const budgetChanged = budget !== event.basics.budget;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit event details"
      description="Changes flow straight into the budget, timeline, and plan health."
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="edit-event-form" className="btn btn-primary">
            Save changes
          </button>
        </>
      }
    >
      <form
        id="edit-event-form"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          submit();
        }}
      >
        <div className="event-edit-meta">
          <span className={`badge badge-accent`}>{EVENT_TYPE_META[event.type].label}</span>
          <span>{formatDate(event.basics.date)}</span>
          <span>·</span>
          <span>{event.basics.guestCount.toLocaleString('en-US')} guests</span>
        </div>

        <div className="form-grid">
          <div className="field field-wide">
            <label htmlFor="edit-name" className="field-label">
              Event name
            </label>
            <input
              id="edit-name"
              className={`input-control${errors.name ? ' has-error' : ''}`}
              value={name}
              maxLength={80}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
              aria-invalid={Boolean(errors.name)}
              data-autofocus
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          <div className="field">
            <label htmlFor="edit-date" className="field-label">
              Date
            </label>
            <div className="input-with-icon">
              <CalendarDays size={17} aria-hidden="true" />
              <input
                id="edit-date"
                type="date"
                className={`input-control${errors.date ? ' has-error' : ''}`}
                value={date}
                min={todayIso()}
                onChange={(changeEvent) => setDate(changeEvent.target.value)}
                aria-invalid={Boolean(errors.date)}
              />
            </div>
            {errors.date && <p className="field-error">{errors.date}</p>}
          </div>

          <div className="field">
            <label htmlFor="edit-location" className="field-label">
              Location
            </label>
            <div className="input-with-icon">
              <MapPin size={17} aria-hidden="true" />
              <input
                id="edit-location"
                className="input-control"
                value={location}
                maxLength={100}
                onChange={(changeEvent) => setLocation(changeEvent.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="edit-guests" className="field-label">
              Guest count
            </label>
            <div className="input-with-icon">
              <Users size={17} aria-hidden="true" />
              <input
                id="edit-guests"
                type="number"
                min={1}
                max={2000}
                className={`input-control${errors.guestCount ? ' has-error' : ''}`}
                value={guestCount}
                onChange={(changeEvent) => setGuestCount(Number(changeEvent.target.value))}
                aria-invalid={Boolean(errors.guestCount)}
              />
            </div>
            {errors.guestCount && <p className="field-error">{errors.guestCount}</p>}
          </div>

          <div className="field">
            <label htmlFor="edit-budget" className="field-label">
              Total budget
            </label>
            <div className="budget-input-row">
              <div className="input-with-icon">
                <Wallet size={17} aria-hidden="true" />
                <input
                  id="edit-budget"
                  type="number"
                  min={0}
                  step={100}
                  className={`input-control${errors.budget ? ' has-error' : ''}`}
                  value={budget}
                  onChange={(changeEvent) => setBudget(Number(changeEvent.target.value))}
                  aria-invalid={Boolean(errors.budget)}
                />
              </div>
              <select
                className="select-control budget-currency"
                value={currency}
                onChange={(changeEvent) => setCurrency(changeEvent.target.value as CurrencyCode)}
                aria-label="Budget currency"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </div>
            {errors.budget && <p className="field-error">{errors.budget}</p>}
          </div>
        </div>

        {(dateChanged || budgetChanged) && (
          <div className="inline-notice notice-info">
            <div>
              {dateChanged && <p>Incomplete milestones will shift to follow the new date.</p>}
              {budgetChanged && (
                <p>The budget page will flag the gap so you can rebalance the line items.</p>
              )}
            </div>
          </div>
        )}

        <div className="danger-zone">
          <div>
            <h3>Delete this event</h3>
            <p>This removes the plan from this browser. Export a backup first if you need one.</p>
          </div>
          {confirmDelete ? (
            <div className="danger-confirm">
              <span>Delete permanently?</span>
              <button type="button" className="btn btn-danger btn-small" onClick={onDelete}>
                Yes, delete
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => setConfirmDelete(false)}
              >
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-small danger-text"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete event
            </button>
          )}
        </div>
        {confirmDelete && (
          <p className="danger-hint">
            <AlertTriangle size={14} aria-hidden="true" /> This cannot be undone unless you have an
            exported backup.
          </p>
        )}
      </form>
    </Modal>
  );
}
