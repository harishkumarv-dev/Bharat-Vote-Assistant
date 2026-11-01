import { useMemo, useRef, useState, useEffect } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  CircleDollarSign,
  Loader2,
  PencilLine,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import {
  computeBudgetSummary,
  recommendSavings,
  type SavingsRecommendation,
} from '../domain/budget';
import { BUDGET_CATEGORIES, BUDGET_TIPS } from '../domain/catalog';
import { formatMoney, formatPercent } from '../domain/money';
import { AiError, generateJson } from '../ai/client';
import { aiBudgetSchema } from '../ai/schema';
import { budgetSystemPrompt, buildBudgetPrompt } from '../ai/prompts';
import { Badge, EmptyState, ProgressBar } from '../components/ui';
import { Modal } from '../components/Modal';
import type { BudgetItem, EventPlan } from '../types';

interface Props {
  onEditEvent: () => void;
}

export function BudgetView({ onEditEvent }: Props) {
  const { event, dispatch, toast, ai } = useApp();
  const summary = useMemo(() => computeBudgetSummary(event), [event]);
  const recommendations = useMemo(() => recommendSavings(event, summary), [event, summary]);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: BudgetItem | null }>({
    open: false,
    item: null,
  });
  const [rebalanceOpen, setRebalanceOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const currency = event.basics.currency;
  const usedPercent = summary.totalBudget > 0 ? (summary.projected / summary.totalBudget) * 100 : 0;
  const missingSetBudget = summary.totalBudget === 0;

  async function runAiReview() {
    if (!ai.configured) {
      ai.openSettings();
      return;
    }
    setAiLoading(true);
    setAiError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await generateJson(
        {
          settings: ai.settings,
          apiKey: ai.apiKey,
          system: budgetSystemPrompt(),
          user: buildBudgetPrompt(event),
          signal: controller.signal,
        },
        aiBudgetSchema,
      );
      if (!mounted.current) return;
      dispatch({
        type: 'SET_AI_BUDGET_TIPS',
        summary: result.summary,
        tips: result.tips,
        generatedAt: new Date().toISOString(),
      });
      toast('AI budget review saved to this plan.', 'success');
    } catch (error) {
      if (!mounted.current || (error instanceof AiError && error.code === 'aborted')) return;
      const message =
        error instanceof AiError
          ? error.message
          : 'The AI budget review could not be completed. Try again.';
      setAiError(message);
      toast(message, 'error');
    } finally {
      if (mounted.current) setAiLoading(false);
    }
  }

  return (
    <div className="view budget-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Money, made visible</p>
          <h1>Budget</h1>
          <p className="view-description">
            Start with an envelope per category, record real quotes as they arrive, and see what is
            still uncommitted.
          </p>
        </div>
        <div className="view-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRebalanceOpen(true)}
            disabled={summary.planned === 0}
          >
            <RefreshCw size={16} aria-hidden="true" /> Scale to budget
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setItemModal({ open: true, item: null })}
          >
            <Plus size={16} aria-hidden="true" /> Add line item
          </button>
        </div>
      </div>

      <section className="budget-hero" aria-labelledby="budget-summary-title">
        <div className="budget-hero-main">
          <div>
            <p className="eyebrow">Working budget</p>
            <h2 id="budget-summary-title">{formatMoney(summary.totalBudget, currency)}</h2>
            {missingSetBudget ? (
              <button type="button" className="text-button" onClick={onEditEvent}>
                Set a budget to unlock the full view <ArrowRight size={14} aria-hidden="true" />
              </button>
            ) : (
              <p>
                {formatMoney(summary.planned, currency)} planned ·{' '}
                {formatMoney(summary.actual, currency)} recorded as actual
              </p>
            )}
          </div>
          <div className="budget-hero-stats">
            <div>
              <span>Remaining</span>
              <strong className={summary.remaining < 0 ? 'is-danger' : ''}>
                {formatMoney(summary.remaining, currency)}
              </strong>
            </div>
            <div>
              <span>Per guest</span>
              <strong>{formatMoney(summary.perGuest, currency)}</strong>
            </div>
            <div>
              <span>Projected</span>
              <strong>{formatMoney(summary.projected, currency)}</strong>
            </div>
          </div>
        </div>
        <div className="budget-hero-bar">
          <div className="budget-multi-bar" aria-hidden="true">
            {summary.categories
              .filter((category) => category.planned > 0)
              .map((category) => (
                <span
                  key={category.id}
                  style={{
                    width: `${Math.max(
                      0,
                      summary.planned > 0 ? (category.projected / summary.planned) * 100 : 0,
                    )}%`,
                    backgroundColor: category.color,
                  }}
                />
              ))}
          </div>
          <div className="budget-bar-labels">
            <span>{formatPercent(usedPercent)} of budget projected</span>
            <span>{summary.effectiveGuests} guests in the per-head calculation</span>
          </div>
        </div>
        {summary.overBy > 0 && (
          <div className="budget-warning" role="status">
            <TriangleAlert size={17} aria-hidden="true" />
            <span>
              You are {formatMoney(summary.overBy, currency)} over budget. Trim a category, scale
              the plan, or move money from an area with headroom.
            </span>
          </div>
        )}
        {summary.overBy === 0 && summary.remaining > 0 && summary.totalBudget > 0 && (
          <div className="budget-calm" role="status">
            <Check size={17} aria-hidden="true" />
            <span>
              {formatMoney(summary.remaining, currency)} is still uncommitted — a useful buffer for
              the details that always appear.
            </span>
          </div>
        )}
      </section>

      <div className="budget-layout">
        <div className="budget-main">
          {event.budget.items.length === 0 ? (
            <div className="panel">
              <EmptyState
                icon={<Wallet size={28} />}
                title="No line items yet"
                description="Add your first cost, or scale a template across the budget."
                action={
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setItemModal({ open: true, item: null })}
                  >
                    <Plus size={16} aria-hidden="true" /> Add a line item
                  </button>
                }
              />
            </div>
          ) : (
            <div className="category-list">
              {BUDGET_CATEGORIES[event.type].map((category) => {
                const categorySummary = summary.categories.find(
                  (entry) => entry.id === category.id,
                );
                const items = event.budget.items.filter((item) => item.category === category.id);
                if (!categorySummary) return null;
                const percent =
                  categorySummary.target > 0
                    ? (categorySummary.projected / categorySummary.target) * 100
                    : 0;
                const over = categorySummary.difference < 0;
                return (
                  <section className="category-card" key={category.id} aria-labelledby={`cat-${category.id}`}>
                    <div className="category-head">
                      <div className="category-title">
                        <span className="category-dot" style={{ backgroundColor: category.color }} />
                        <div>
                          <h2 id={`cat-${category.id}`}>{category.label}</h2>
                          <p>{category.description}</p>
                        </div>
                      </div>
                      <div className="category-numbers">
                        <span>
                          <strong>{formatMoney(categorySummary.planned, currency)}</strong> planned
                        </span>
                        <span className={over ? 'is-danger' : ''}>
                          {over
                            ? `${formatMoney(Math.abs(categorySummary.difference), currency)} over envelope`
                            : `${formatMoney(categorySummary.difference, currency)} headroom`}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="icon-button icon-button-small"
                        onClick={() =>
                          setItemModal({
                            open: true,
                            item: {
                              id: '',
                              category: category.id,
                              label: '',
                              estimated: 0,
                              actual: null,
                              paid: false,
                              notes: '',
                            },
                          })
                        }
                        aria-label={`Add a line item to ${category.label}`}
                        title={`Add to ${category.label}`}
                      >
                        <Plus size={15} aria-hidden="true" />
                      </button>
                    </div>
                    <ProgressBar
                      value={percent}
                      label={`${category.label} planned against envelope`}
                      tone={over ? 'danger' : percent > 90 ? 'gold' : 'sage'}
                      showValue={false}
                    />
                    {items.length === 0 ? (
                      <p className="category-empty">No line items in this category yet.</p>
                    ) : (
                      <ul className="budget-item-list">
                        {items.map((item) => (
                          <li key={item.id} className="budget-item">
                            <div className="budget-item-main">
                              <span className="budget-item-label">{item.label}</span>
                              {item.notes && <span className="budget-item-notes">{item.notes}</span>}
                            </div>
                            <div className="budget-item-money">
                              <span>
                                <small>Estimate</small>
                                <strong>{formatMoney(item.estimated, currency)}</strong>
                              </span>
                              <span>
                                <small>Actual</small>
                                <strong className={item.actual !== null ? 'is-actual' : 'muted'}>
                                  {item.actual !== null ? formatMoney(item.actual, currency) : '—'}
                                </strong>
                              </span>
                              <label className="paid-toggle">
                                <input
                                  type="checkbox"
                                  checked={item.paid}
                                  onChange={(changeEvent) =>
                                    dispatch({
                                      type: 'UPDATE_BUDGET_ITEM',
                                      id: item.id,
                                      patch: { paid: changeEvent.target.checked },
                                    })
                                  }
                                />
                                <span>{item.paid ? 'Paid' : 'Unpaid'}</span>
                              </label>
                            </div>
                            <div className="budget-item-actions">
                              <button
                                type="button"
                                className="icon-button icon-button-small"
                                onClick={() => setItemModal({ open: true, item })}
                                aria-label={`Edit ${item.label}`}
                              >
                                <PencilLine size={15} aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="icon-button icon-button-small danger-text"
                                onClick={() => {
                                  dispatch({ type: 'DELETE_BUDGET_ITEM', id: item.id });
                                  toast('Line item removed.', 'info');
                                }}
                                aria-label={`Delete ${item.label}`}
                              >
                                <Trash2 size={15} aria-hidden="true" />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <aside className="budget-sidebar">
          <section className="panel savings-panel" aria-labelledby="savings-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Ways to find room</p>
                <h2 id="savings-title">Practical savings</h2>
              </div>
              <Badge tone="sage">{recommendations.length}</Badge>
            </div>
            {recommendations.length === 0 ? (
              <p className="muted">
                Add line items and a budget ceiling to get tailored savings.
              </p>
            ) : (
              <ul className="savings-list">
                {recommendations.map((recommendation) => (
                  <SavingsCard
                    key={recommendation.id}
                    recommendation={recommendation}
                    currency={currency}
                  />
                ))}
              </ul>
            )}
            <button type="button" className="text-button" onClick={onEditEvent}>
              Adjust the total budget <ArrowRight size={14} aria-hidden="true" />
            </button>
          </section>

          <section className="panel ai-budget-panel" aria-labelledby="ai-budget-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">A second opinion</p>
                <h2 id="ai-budget-title">AI budget review</h2>
              </div>
              <Bot size={19} aria-hidden="true" />
            </div>
            <p>
              Look for trade-offs that protect the things you care about. Only the plan summary is
              sent — never guest contact details.
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={runAiReview}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <Sparkles size={16} aria-hidden="true" />
              )}
              {aiLoading ? 'Reviewing…' : ai.configured ? 'Review with AI' : 'Connect AI'}
            </button>
            {aiError && (
              <p className="field-error" role="alert">
                {aiError}
              </p>
            )}
            {event.aiNotes && event.aiNotes.budgetTips.length > 0 && (
              <div className="ai-budget-notes">
                <div className="ai-notes-heading">
                  <Badge tone="accent">AI</Badge>
                  <span>Saved review</span>
                </div>
                <ul>
                  {event.aiNotes.budgetTips.map((tip) => (
                    <li key={tip.title}>
                      <div>
                        <strong>{tip.title}</strong>
                        <p>{tip.detail}</p>
                      </div>
                      {tip.savings !== null && (
                        <Badge tone="sage">{formatMoney(tip.savings, currency)}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="panel budget-tips-panel" aria-labelledby="tips-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Keep in mind</p>
                <h2 id="tips-title">Budget notes</h2>
              </div>
              <CircleDollarSign size={19} aria-hidden="true" />
            </div>
            <ul className="plain-list">
              {BUDGET_TIPS[event.type].map((tip) => (
                <li key={tip.title}>
                  <strong>{tip.title}</strong>
                  <p>{tip.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <BudgetItemModal
        open={itemModal.open}
        item={itemModal.item}
        event={event}
        onClose={() => setItemModal({ open: false, item: null })}
        onSave={(payload, existing) => {
          if (existing) {
            dispatch({ type: 'UPDATE_BUDGET_ITEM', id: existing.id, patch: payload });
            toast('Line item updated.', 'success');
          } else {
            dispatch({
              type: 'ADD_BUDGET_ITEM',
              category: payload.category ?? BUDGET_CATEGORIES[event.type][0].id,
              label: payload.label ?? 'New line item',
              estimated: payload.estimated ?? 0,
              notes: payload.notes,
            });
            toast('Line item added.', 'success');
          }
          setItemModal({ open: false, item: null });
        }}
      />

      <Modal
        open={rebalanceOpen}
        onClose={() => setRebalanceOpen(false)}
        title="Scale estimates to the budget"
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setRebalanceOpen(false)}>
              Keep as is
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                dispatch({ type: 'REBALANCE_BUDGET' });
                setRebalanceOpen(false);
                toast('Estimates scaled proportionally. Actual quotes were left untouched.', 'success');
              }}
            >
              Scale the plan
            </button>
          </>
        }
      >
        <p>
          Every estimate will be scaled proportionally so the total matches{' '}
          <strong>{formatMoney(summary.totalBudget, currency)}</strong>. Real quotes and payments
          stay exactly as recorded.
        </p>
        <p className="muted">
          This preserves the relative shape of your plan. If you have changed priorities, edit the
          categories that matter most afterwards.
        </p>
      </Modal>
    </div>
  );
}

function SavingsCard({
  recommendation,
  currency,
}: {
  recommendation: SavingsRecommendation;
  currency: EventPlan['basics']['currency'];
}) {
  return (
    <li className={`savings-card savings-${recommendation.kind}`}>
      <div className="savings-card-head">
        <strong>{recommendation.title}</strong>
        <Badge tone="sage">≈ {formatMoney(recommendation.savings, currency)}</Badge>
      </div>
      <p>{recommendation.detail}</p>
    </li>
  );
}

function BudgetItemModal({
  open,
  item,
  event,
  onClose,
  onSave,
}: {
  open: boolean;
  item: BudgetItem | null;
  event: EventPlan;
  onClose: () => void;
  onSave: (payload: Partial<BudgetItem>, existing: BudgetItem | null) => void;
}) {
  const [category, setCategory] = useState(item?.category ?? BUDGET_CATEGORIES[event.type][0].id);
  const [label, setLabel] = useState(item?.label ?? '');
  const [estimated, setEstimated] = useState(item?.estimated ?? 0);
  const [hasActual, setHasActual] = useState(item?.actual !== null);
  const [actual, setActual] = useState(item?.actual ?? 0);
  const [paid, setPaid] = useState(item?.paid ?? false);
  const [notes, setNotes] = useState(item?.notes ?? '');
  const [error, setError] = useState('');
  const existing = item && item.id ? item : null;

  useEffect(() => {
    if (!open) return;
    setCategory(item?.category ?? BUDGET_CATEGORIES[event.type][0].id);
    setLabel(item?.label ?? '');
    setEstimated(item?.estimated ?? 0);
    setHasActual(item?.actual !== null);
    setActual(item?.actual ?? 0);
    setPaid(item?.paid ?? false);
    setNotes(item?.notes ?? '');
    setError('');
  }, [open, item, event.type]);

  function save() {
    if (!label.trim()) {
      setError('Give the line item a name.');
      return;
    }
    if (!Number.isFinite(estimated) || estimated < 0) {
      setError('Use a valid estimate.');
      return;
    }
    onSave(
      {
        category,
        label: label.trim(),
        estimated: Math.round(estimated),
        actual: hasActual ? Math.round(actual) : null,
        paid,
        notes: notes.trim(),
      },
      existing,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit line item' : 'Add a line item'}
      description="Estimates are a plan; actuals are what you have been quoted or paid."
      size="small"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={save}>
            {existing ? 'Save item' : 'Add item'}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="budget-category" className="field-label">
          Category
        </label>
        <select
          id="budget-category"
          className="select-control"
          value={category}
          onChange={(changeEvent) => setCategory(changeEvent.target.value)}
          data-autofocus
        >
          {BUDGET_CATEGORIES[event.type].map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="budget-label" className="field-label">
          Line item
        </label>
        <input
          id="budget-label"
          className="input-control"
          value={label}
          maxLength={120}
          placeholder="e.g. Venue deposit"
          onChange={(changeEvent) => setLabel(changeEvent.target.value)}
        />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="budget-estimate" className="field-label">
            Estimate ({event.basics.currency})
          </label>
          <input
            id="budget-estimate"
            type="number"
            min={0}
            step={1}
            className="input-control"
            value={estimated}
            onChange={(changeEvent) => setEstimated(Number(changeEvent.target.value))}
          />
        </div>
        <div className="field">
          <label className="checkbox-row compact-checkbox">
            <input
              type="checkbox"
              checked={hasActual}
              onChange={(changeEvent) => setHasActual(changeEvent.target.checked)}
            />
            <span>
              <strong>Real quote or charge</strong>
              <small>Record what is actually committed.</small>
            </span>
          </label>
          {hasActual && (
            <input
              type="number"
              min={0}
              step={1}
              className="input-control"
              aria-label="Actual quote or charge"
              value={actual}
              onChange={(changeEvent) => setActual(Number(changeEvent.target.value))}
            />
          )}
        </div>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={paid}
          onChange={(changeEvent) => setPaid(changeEvent.target.checked)}
        />
        <span>
          <strong>Already paid</strong>
          <small>Keep a record without changing the estimate.</small>
        </span>
      </label>
      <div className="field">
        <label htmlFor="budget-notes" className="field-label">
          Notes
        </label>
        <textarea
          id="budget-notes"
          className="textarea-control"
          rows={2}
          maxLength={400}
          value={notes}
          onChange={(changeEvent) => setNotes(changeEvent.target.value)}
          placeholder="Deposit due, what is included, who to ask…"
        />
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
