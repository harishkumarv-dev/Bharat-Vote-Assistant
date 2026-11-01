import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CakeSlice,
  CalendarDays,
  Check,
  Heart,
  MapPin,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ACCESSIBILITY_LABELS,
  BUDGET_CATEGORIES,
  DIETARY_LABELS,
  EVENT_TYPE_META,
  PRIORITY_LABELS,
  STYLE_LABELS,
  TIMELINE_TEMPLATES,
  VENDOR_CATEGORIES,
} from '../domain/catalog';
import {
  ACCESSIBILITY_NEEDS,
  DIETARY_NEEDS,
  EVENT_TYPES,
  PRIORITIES,
  STYLE_TAGS,
  type AccessibilityNeed,
  type CurrencyCode,
  type DietaryNeed,
  type EventDraft,
  type EventType,
  type Priority,
  type StyleTag,
} from '../types';
import { CURRENCIES } from '../types';
import { addDaysIso, formatDate, todayIso } from '../domain/dates';
import { formatMoney } from '../domain/money';
import { cleanText } from '../utils';

const TYPE_ICONS = {
  wedding: Heart,
  birthday: CakeSlice,
  community: Users,
} as const;

const MAX_PRIORITIES = 4;
const MAX_STYLES = 3;

interface Props {
  initialType: EventType;
  onCancel: () => void;
  onCreate: (draft: EventDraft) => void;
}

export function EventWizard({ initialType, onCancel, onCreate }: Props) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<EventType>(initialType);
  const [name, setName] = useState(EVENT_TYPE_META[initialType].defaultName);
  const [nameDirty, setNameDirty] = useState(false);
  const [date, setDate] = useState(addDaysIso(todayIso(), 120));
  const [location, setLocation] = useState('');
  const [guestCount, setGuestCount] = useState(80);
  const [budget, setBudget] = useState(15_000);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [priorities, setPriorities] = useState<Priority[]>(['food', 'photos', 'guests']);
  const [styles, setStyles] = useState<StyleTag[]>(['modern', 'cozy']);
  const [dietary, setDietary] = useState<DietaryNeed[]>([]);
  const [accessibility, setAccessibility] = useState<AccessibilityNeed[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const headingRef = useRef<HTMLHeadingElement>(null);

  const today = todayIso();

  const allocation = useMemo(() => {
    const categories = BUDGET_CATEGORIES[type];
    const amounts = categories.map((category) => Math.round((budget * category.share) / 100));
    const difference = budget - amounts.reduce((total, amount) => total + amount, 0);
    if (amounts.length > 0) amounts[0] += difference;
    return categories.map((category, index) => ({ ...category, amount: amounts[index] }));
  }, [budget, type]);

  function chooseType(next: EventType) {
    setType(next);
    if (!nameDirty) setName(EVENT_TYPE_META[next].defaultName);
    setErrors({});
  }

  function validateStep1(): boolean {
    const next: Record<string, string> = {};
    const trimmedName = cleanText(name, 80);
    if (!trimmedName) next.name = 'Give the event a name — it can change later.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) next.date = 'Choose a valid date.';
    else if (date < today) next.date = 'Choose today or a future date.';
    if (!Number.isFinite(guestCount) || guestCount < 1 || guestCount > 2000) {
      next.guestCount = 'Use a guest count between 1 and 2,000.';
    }
    if (!Number.isFinite(budget) || budget < 0 || budget > 100_000_000) {
      next.budget = 'Use a budget between 0 and 100,000,000.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function goNext() {
    if (step === 1 && !validateStep1()) return;
    setStep((current) => Math.min(3, current + 1));
    window.setTimeout(() => headingRef.current?.focus(), 30);
  }

  function goBack() {
    setStep((current) => Math.max(1, current - 1));
    window.setTimeout(() => headingRef.current?.focus(), 30);
  }

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

  function submit() {
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    onCreate({
      type,
      name: cleanText(name, 80),
      date,
      location: cleanText(location, 100),
      guestCount: Math.round(guestCount),
      budget: Math.round(budget),
      currency,
      priorities,
      styles,
      dietary,
      accessibility,
      notes: cleanText(notes, 600),
    });
  }

  const TypeIcon = TYPE_ICONS[type];
  const vendorEssentials = VENDOR_CATEGORIES[type].filter((vendor) => vendor.essential).length;

  return (
    <div className="wizard-layout">
      <aside className="wizard-rail" aria-label="Planning setup steps">
        <button type="button" className="text-button wizard-back" onClick={onCancel}>
          <ArrowLeft size={16} aria-hidden="true" /> Back to start
        </button>
        <div className="wizard-rail-intro">
          <p className="eyebrow">A new plan</p>
          <h2>Let’s make the first draft.</h2>
          <p>Three short steps. Everything stays on this device until you choose to use AI.</p>
        </div>
        <ol className="wizard-steps">
          {[
            { number: 1, label: 'The basics' },
            { number: 2, label: 'The feeling' },
            { number: 3, label: 'The shape' },
          ].map((item) => (
            <li
              key={item.number}
              className={`wizard-step${step === item.number ? ' is-current' : ''}${
                step > item.number ? ' is-done' : ''
              }`}
              aria-current={step === item.number ? 'step' : undefined}
            >
              <span className="wizard-step-number">
                {step > item.number ? <Check size={15} aria-hidden="true" /> : item.number}
              </span>
              <span>{item.label}</span>
            </li>
          ))}
        </ol>
        <div className="wizard-rail-note">
          <Sparkles size={16} aria-hidden="true" />
          <p>
            Your first concept, budget split, vendor checklist, and timeline are generated locally
            the moment you finish.
          </p>
        </div>
      </aside>

      <form
        className="wizard-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 3) goNext();
          else submit();
        }}
      >
        <div className="wizard-progress" aria-hidden="true">
          <span style={{ width: `${(step / 3) * 100}%` }} />
        </div>

        {step === 1 && (
          <section aria-labelledby="wizard-step-1">
            <p className="eyebrow">Step 1 of 3</p>
            <h1 id="wizard-step-1" ref={headingRef} tabIndex={-1}>
              What are we planning?
            </h1>
            <p className="step-lede">
              Start with the shape of the day. You can change every detail later — the plan will
              adapt with you.
            </p>

            <fieldset className="field-group">
              <legend className="field-label">Event type</legend>
              <div className="type-choice-grid">
                {EVENT_TYPES.map((option) => {
                  const Icon = TYPE_ICONS[option];
                  const selected = type === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`type-choice${selected ? ' is-selected' : ''}`}
                      aria-pressed={selected}
                      onClick={() => chooseType(option)}
                    >
                      <Icon size={20} aria-hidden="true" />
                      <span>
                        <strong>{EVENT_TYPE_META[option].label}</strong>
                        <small>{EVENT_TYPE_META[option].example}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="form-grid">
              <div className="field field-wide">
                <label htmlFor="event-name" className="field-label">
                  Event name <span className="required-mark">*</span>
                </label>
                <input
                  id="event-name"
                  className={`input-control${errors.name ? ' has-error' : ''}`}
                  value={name}
                  maxLength={80}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameDirty(true);
                  }}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'event-name-error' : undefined}
                  placeholder="e.g. Maya & Arjun’s garden wedding"
                  data-autofocus
                />
                {errors.name && (
                  <p className="field-error" id="event-name-error">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="event-date" className="field-label">
                  Event date <span className="required-mark">*</span>
                </label>
                <div className="input-with-icon">
                  <CalendarDays size={17} aria-hidden="true" />
                  <input
                    id="event-date"
                    type="date"
                    className={`input-control${errors.date ? ' has-error' : ''}`}
                    value={date}
                    min={today}
                    onChange={(event) => setDate(event.target.value)}
                    aria-invalid={Boolean(errors.date)}
                    aria-describedby={errors.date ? 'event-date-error' : undefined}
                  />
                </div>
                {errors.date && (
                  <p className="field-error" id="event-date-error">
                    {errors.date}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="event-location" className="field-label">
                  Location <span className="optional-mark">optional</span>
                </label>
                <div className="input-with-icon">
                  <MapPin size={17} aria-hidden="true" />
                  <input
                    id="event-location"
                    className="input-control"
                    value={location}
                    maxLength={100}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="City, venue, or neighbourhood"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="event-guests" className="field-label">
                  Guest count <span className="required-mark">*</span>
                </label>
                <div className="input-with-icon">
                  <Users size={17} aria-hidden="true" />
                  <input
                    id="event-guests"
                    type="number"
                    min={1}
                    max={2000}
                    step={1}
                    className={`input-control${errors.guestCount ? ' has-error' : ''}`}
                    value={guestCount}
                    onChange={(event) => setGuestCount(Number(event.target.value))}
                    aria-invalid={Boolean(errors.guestCount)}
                    aria-describedby={errors.guestCount ? 'event-guests-error' : undefined}
                  />
                </div>
                {errors.guestCount && (
                  <p className="field-error" id="event-guests-error">
                    {errors.guestCount}
                  </p>
                )}
              </div>

              <div className="field">
                <label htmlFor="event-budget" className="field-label">
                  Working budget <span className="required-mark">*</span>
                </label>
                <div className="budget-input-row">
                  <div className="input-with-icon">
                    <Wallet size={17} aria-hidden="true" />
                    <input
                      id="event-budget"
                      type="number"
                      min={0}
                      max={100_000_000}
                      step={100}
                      className={`input-control${errors.budget ? ' has-error' : ''}`}
                      value={budget}
                      onChange={(event) => setBudget(Number(event.target.value))}
                      aria-invalid={Boolean(errors.budget)}
                      aria-describedby={errors.budget ? 'event-budget-error' : undefined}
                    />
                  </div>
                  <select
                    className="select-control budget-currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
                    aria-label="Budget currency"
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.budget && (
                  <p className="field-error" id="event-budget-error">
                    {errors.budget}
                  </p>
                )}
              </div>
            </div>

            <p className="form-hint">
              A rough budget is enough. Gala will split it across a starting plan and show you
              where it is tight.
            </p>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="wizard-step-2">
            <p className="eyebrow">Step 2 of 3</p>
            <h1 id="wizard-step-2" ref={headingRef} tabIndex={-1}>
              What should it feel like?
            </h1>
            <p className="step-lede">
              Choose the parts you want to protect. These choices shape the budget, the ideas, and
              the questions in your vendor checklist.
            </p>

            <fieldset className="field-group">
              <legend className="field-label">
                Priorities <span className="field-counter">{priorities.length}/{MAX_PRIORITIES}</span>
              </legend>
              <p className="field-help">Choose up to four. These get extra room in the plan.</p>
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
              <p className="field-help">Pick up to three words that feel like the day.</p>
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
              <p className="field-help">
                We will build these into food ideas and vendor questions. Guest-level notes can be
                added later.
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

            <fieldset className="field-group">
              <legend className="field-label">Access needs</legend>
              <p className="field-help">
                These become specific questions for venues and a line in the run-of-show.
              </p>
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
              <label htmlFor="event-notes" className="field-label">
                Anything else we should know? <span className="optional-mark">optional</span>
              </label>
              <textarea
                id="event-notes"
                className="textarea-control"
                rows={3}
                maxLength={600}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="A family tradition, a venue constraint, the thing you absolutely do not want…"
              />
              <p className="field-help field-count">{notes.length}/600 characters</p>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="wizard-step-3">
            <p className="eyebrow">Step 3 of 3</p>
            <h1 id="wizard-step-3" ref={headingRef} tabIndex={-1}>
              This is the starting shape.
            </h1>
            <p className="step-lede">
              We will create the budget, vendor checklist, and a timeline that fits the time you
              actually have.
            </p>

            <div className="review-card">
              <div className="review-top">
                <span className="review-icon">
                  <TypeIcon size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="eyebrow">{EVENT_TYPE_META[type].label}</p>
                  <h2>{name || EVENT_TYPE_META[type].defaultName}</h2>
                  <p>
                    {formatDate(date)} · {guestCount.toLocaleString('en-US')} guests
                    {location ? ` · ${location}` : ''}
                  </p>
                </div>
                <div className="review-budget">
                  <span>Budget</span>
                  <strong>{formatMoney(budget, currency)}</strong>
                </div>
              </div>

              <div className="review-stats">
                <div>
                  <span>Milestones</span>
                  <strong>{TIMELINE_TEMPLATES[type].length}</strong>
                  <small>generated backwards from your date</small>
                </div>
                <div>
                  <span>Essential vendors</span>
                  <strong>{vendorEssentials}</strong>
                  <small>with questions to ask</small>
                </div>
                <div>
                  <span>Budget per guest</span>
                  <strong>{formatMoney(Math.round(budget / Math.max(1, guestCount)), currency)}</strong>
                  <small>before real quotes</small>
                </div>
              </div>

              <div className="review-split">
                <h3>Starting budget split</h3>
                <div className="split-bar" aria-hidden="true">
                  {allocation.map((category) => (
                    <span
                      key={category.id}
                      style={{
                        width: `${category.share}%`,
                        backgroundColor: category.color,
                      }}
                    />
                  ))}
                </div>
                <ul className="split-legend">
                  {allocation.slice(0, 5).map((category) => (
                    <li key={category.id}>
                      <span className="legend-dot" style={{ backgroundColor: category.color }} />
                      <span>{category.label}</span>
                      <strong>{formatMoney(category.amount, currency)}</strong>
                    </li>
                  ))}
                </ul>
                <p className="form-hint">
                  {allocation.length > 5
                    ? `Plus ${allocation.length - 5} more categories. `
                    : ''}
                  Every amount is editable — this is a starting point, not a rule.
                </p>
              </div>

              <div className="review-tags">
                <div>
                  <span className="review-label">Priorities</span>
                  <div className="tag-row">
                    {priorities.length > 0 ? (
                      priorities.map((priority) => (
                        <span key={priority} className="tag">
                          {PRIORITY_LABELS[priority]}
                        </span>
                      ))
                    ) : (
                      <span className="muted">No priorities selected</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="review-label">Style</span>
                  <div className="tag-row">
                    {styles.length > 0 ? (
                      styles.map((style) => (
                        <span key={style} className="tag">
                          {STYLE_LABELS[style]}
                        </span>
                      ))
                    ) : (
                      <span className="muted">Open to suggestion</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="privacy-note">
              <Sparkles size={17} aria-hidden="true" />
              <p>
                This first plan is generated on your device. No account, no upload, no personal data
                sent anywhere. You can connect an AI provider later for a more bespoke concept.
              </p>
            </div>
          </section>
        )}

        <div className="wizard-actions">
          {step > 1 ? (
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              <ArrowLeft size={17} aria-hidden="true" /> Back
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-primary">
            {step === 3 ? (
              <>
                <Sparkles size={17} aria-hidden="true" /> Build my plan
              </>
            ) : (
              <>
                Continue <ArrowRight size={17} aria-hidden="true" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
