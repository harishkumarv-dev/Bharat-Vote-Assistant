import { useEffect, useState } from 'react';
import type {
  AccessibilityNeed,
  DietaryNeed,
  EventPlan,
  Priority,
  StyleTag,
} from '../types';
import {
  ACCESSIBILITY_NEEDS,
  DIETARY_NEEDS,
  PRIORITIES,
  STYLE_TAGS,
} from '../types';
import {
  ACCESSIBILITY_LABELS,
  DIETARY_LABELS,
  PRIORITY_LABELS,
  STYLE_LABELS,
} from '../domain/catalog';
import { Modal } from './Modal';

const MAX_PRIORITIES = 4;
const MAX_STYLES = 3;

interface Props {
  open: boolean;
  onClose: () => void;
  event: EventPlan;
  onSave: (vibe: {
    priorities: Priority[];
    styles: StyleTag[];
    dietary: DietaryNeed[];
    accessibility: AccessibilityNeed[];
    notes: string;
  }) => void;
}

export function EditBriefModal({ open, onClose, event, onSave }: Props) {
  const [priorities, setPriorities] = useState<Priority[]>(event.vibe.priorities);
  const [styles, setStyles] = useState<StyleTag[]>(event.vibe.styles);
  const [dietary, setDietary] = useState<DietaryNeed[]>(event.vibe.dietary);
  const [accessibility, setAccessibility] = useState<AccessibilityNeed[]>(
    event.vibe.accessibility,
  );
  const [notes, setNotes] = useState(event.vibe.notes);

  useEffect(() => {
    if (!open) return;
    setPriorities(event.vibe.priorities);
    setStyles(event.vibe.styles);
    setDietary(event.vibe.dietary);
    setAccessibility(event.vibe.accessibility);
    setNotes(event.vibe.notes);
  }, [open, event]);

  function togglePriority(priority: Priority) {
    setPriorities((current) =>
      current.includes(priority)
        ? current.filter((item) => item !== priority)
        : current.length < MAX_PRIORITIES
          ? [...current, priority]
          : current,
    );
  }

  function toggleStyle(style: StyleTag) {
    setStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : current.length < MAX_STYLES
          ? [...current, style]
          : current,
    );
  }

  function toggleDietary(need: DietaryNeed) {
    setDietary((current) =>
      current.includes(need) ? current.filter((item) => item !== need) : [...current, need],
    );
  }

  function toggleAccessibility(need: AccessibilityNeed) {
    setAccessibility((current) =>
      current.includes(need) ? current.filter((item) => item !== need) : [...current, need],
    );
  }

  function save() {
    onSave({ priorities, styles, dietary, accessibility, notes: notes.trim() });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit the brief"
      description="These choices shape the concept, budget guidance, and vendor questions."
      size="medium"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            Save brief
          </button>
        </>
      }
    >
      <fieldset className="field-group">
        <legend className="field-label">
          Priorities <span className="field-counter">{priorities.length}/{MAX_PRIORITIES}</span>
        </legend>
        <p className="field-help">The plan gives these extra room. Choose up to four.</p>
        <div className="chip-grid">
          {PRIORITIES.map((priority) => {
            const active = priorities.includes(priority);
            return (
              <button
                key={priority}
                type="button"
                className={`toggle-chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                disabled={!active && priorities.length >= MAX_PRIORITIES}
                onClick={() => togglePriority(priority)}
              >
                {PRIORITY_LABELS[priority]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="field-label">
          Style <span className="field-counter">{styles.length}/{MAX_STYLES}</span>
        </legend>
        <div className="chip-grid">
          {STYLE_TAGS.map((style) => {
            const active = styles.includes(style);
            return (
              <button
                key={style}
                type="button"
                className={`toggle-chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                disabled={!active && styles.length >= MAX_STYLES}
                onClick={() => toggleStyle(style)}
              >
                {STYLE_LABELS[style]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="field-group">
        <legend className="field-label">Dietary needs</legend>
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

      <fieldset className="field-group">
        <legend className="field-label">Access needs</legend>
        <div className="chip-grid chip-grid-small">
          {ACCESSIBILITY_NEEDS.map((need) => {
            const active = accessibility.includes(need);
            return (
              <button
                key={need}
                type="button"
                className={`toggle-chip toggle-chip-small${active ? ' is-active' : ''}`}
                aria-pressed={active}
                onClick={() => toggleAccessibility(need)}
              >
                {ACCESSIBILITY_LABELS[need]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="field">
        <label htmlFor="brief-notes" className="field-label">
          Other details
        </label>
        <textarea
          id="brief-notes"
          className="textarea-control"
          rows={4}
          maxLength={600}
          value={notes}
          onChange={(changeEvent) => setNotes(changeEvent.target.value)}
          placeholder="Traditions, constraints, the thing you do not want…"
        />
        <p className="field-help field-count">{notes.length}/600 characters</p>
      </div>

      <div className="inline-notice notice-info">
        <div>
          <p>
            Saving the brief does not overwrite your current concept automatically. Use “Refresh
            local” on the Concept page when you want the ideas to catch up.
          </p>
        </div>
      </div>
    </Modal>
  );
}
