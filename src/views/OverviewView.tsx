import { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  PencilLine,
  Printer,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import { computeBudgetSummary } from '../domain/budget';
import { computePlanHealth, buildInsights } from '../domain/health';
import { computeGuestStats } from '../domain/guests';
import { computeTimelineStats, sortTasks } from '../domain/timeline';
import { computeVendorStats } from '../domain/vendors';
import { countdownLabel, formatDate, relativeDayLabel, todayIso } from '../domain/dates';
import { formatMoney, formatPercent } from '../domain/money';
import { DonutChart, ProgressRing } from '../components/Charts';
import { Badge, ProgressBar, SourceBadge } from '../components/ui';
import type { Insight } from '../types';

const SEVERITY_ICON = {
  critical: AlertCircle,
  warning: Clock,
  good: CheckCircle2,
  info: Info,
} as const;

export function OverviewView({
  onEditEvent,
}: {
  onEditEvent: () => void;
}) {
  const { event, dispatch, navigate, toast, ai } = useApp();

  const summary = useMemo(() => computeBudgetSummary(event), [event]);
  const health = useMemo(() => computePlanHealth(event), [event]);
  const insights = useMemo(() => buildInsights(event), [event]);
  const guests = useMemo(() => computeGuestStats(event.guests), [event.guests]);
  const vendors = useMemo(() => computeVendorStats(event), [event]);
  const timeline = useMemo(() => computeTimelineStats(event.tasks, event.basics.date), [event]);
  const nextTasks = useMemo(
    () => sortTasks(event.tasks.filter((task) => !task.done)).slice(0, 4),
    [event.tasks],
  );

  const currency = event.basics.currency;
  const budgetUsed = summary.totalBudget > 0 ? (summary.projected / summary.totalBudget) * 100 : 0;
  const healthColor =
    health.score >= 85 ? 'var(--sage)' : health.score >= 60 ? 'var(--gold)' : 'var(--danger)';
  const topCategories = [...summary.categories]
    .filter((category) => category.planned > 0)
    .sort((a, b) => b.planned - a.planned);
  const topFour = topCategories.slice(0, 4);
  const otherSpend = topCategories.slice(4).reduce((total, category) => total + category.planned, 0);
  const donutSegments = [
    ...topFour.map((category) => ({
      label: category.label,
      value: category.planned,
      color: category.color,
    })),
    ...(otherSpend > 0
      ? [{ label: 'Other categories', value: otherSpend, color: '#B8AD9C' }]
      : []),
  ];
  const attendingOrPlanned = guests.attendingHeadcount || event.basics.guestCount;
  const missingEssential = vendors.categories.filter(
    (category) => category.essential && !category.booked,
  );

  function completeTask(id: string, title: string) {
    dispatch({ type: 'TOGGLE_TASK', id });
    toast(`Milestone complete: ${title}`, 'success');
  }

  return (
    <div className="view overview-view">
      <section className="overview-hero" aria-labelledby="overview-title">
        <div className="hero-copy">
          <div className="hero-eyebrow-row">
            <span className="hero-type">{event.type === 'wedding' ? 'Wedding' : event.type === 'birthday' ? 'Birthday' : 'Community event'}</span>
            <span className="hero-countdown">{countdownLabel(event.basics.date)}</span>
          </div>
          <h1 id="overview-title">{event.basics.name}</h1>
          <div className="hero-meta">
            <span>
              <CalendarDays size={15} aria-hidden="true" /> {formatDate(event.basics.date)}
            </span>
            {event.basics.location && (
              <span>
                <MapPin size={15} aria-hidden="true" /> {event.basics.location}
              </span>
            )}
            <span>
              <Users size={15} aria-hidden="true" /> {event.basics.guestCount} guests planned
            </span>
          </div>
          <p className="hero-concept">
            <span className="hero-concept-label">Concept</span> {event.concept.title} —{' '}
            {event.concept.summary.split('. ')[0]}.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-light" onClick={() => navigate('concept')}>
              See the concept <ArrowRight size={16} aria-hidden="true" />
            </button>
            <button type="button" className="btn btn-dark-ghost" onClick={onEditEvent}>
              <PencilLine size={15} aria-hidden="true" /> Edit details
            </button>
            <button type="button" className="btn btn-dark-ghost" onClick={() => window.print()}>
              <Printer size={15} aria-hidden="true" /> Print brief
            </button>
          </div>
        </div>

        <div className="hero-palette" aria-hidden="true">
          {event.concept.palette.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="hero-swatch"
              style={{ backgroundColor: color, width: `${48 + index * 13}px` }}
            />
          ))}
        </div>

        <div className="hero-health">
          <div className="hero-health-head">
            <span>Plan confidence</span>
            <Badge tone={health.score >= 85 ? 'sage' : health.score >= 60 ? 'gold' : 'danger'}>
              {health.label}
            </Badge>
          </div>
          <div className="hero-health-main">
            <ProgressRing
              value={health.score}
              label="Plan confidence"
              color={healthColor}
              size={116}
              stroke={8}
            >
              <strong>{health.score}</strong>
              <small>/100</small>
            </ProgressRing>
            <div className="health-factors">
              {health.factors.map((factor) => (
                <div key={factor.id} className="health-factor">
                  <span>{factor.label}</span>
                  <div className="mini-bar">
                    <span style={{ width: `${factor.score}%` }} />
                  </div>
                  <strong>{factor.score}</strong>
                </div>
              ))}
            </div>
          </div>
          <p className="hero-health-note">
            {insights[0]
              ? insights[0].title
              : 'Keep shaping the plan — confidence will follow.'}
          </p>
        </div>
      </section>

      <section className="stat-grid" aria-label="Plan at a glance">
        <button type="button" className="stat-card" onClick={() => navigate('budget')}>
          <span className="stat-icon">
            <Wallet size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Budget</span>
          <span className="stat-value">
            {formatMoney(summary.projected, currency)}
            <small> of {formatMoney(summary.totalBudget, currency)}</small>
          </span>
          <ProgressBar
            value={budgetUsed}
            label="Share of budget planned"
            tone={summary.overBy > 0 ? 'danger' : budgetUsed > 85 ? 'gold' : 'sage'}
            showValue={false}
          />
          <span className={`stat-foot${summary.overBy > 0 ? ' is-danger' : ''}`}>
            {summary.overBy > 0
              ? `${formatMoney(summary.overBy, currency)} over`
              : `${formatMoney(Math.max(0, summary.remaining), currency)} uncommitted`}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </button>

        <button type="button" className="stat-card" onClick={() => navigate('guests')}>
          <span className="stat-icon">
            <Users size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Guests</span>
          <span className="stat-value">
            {attendingOrPlanned.toLocaleString('en-US')}
            <small> of {event.basics.guestCount.toLocaleString('en-US')} planned</small>
          </span>
          <div className="stat-split">
            <span>{guests.attending} attending</span>
            <span>{guests.pending} pending</span>
          </div>
          <span className="stat-foot">
            {guests.invited === 0 ? 'Build the guest list' : `${guests.maybe} maybe`}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </button>

        <button type="button" className="stat-card" onClick={() => navigate('timeline')}>
          <span className="stat-icon">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Timeline</span>
          <span className="stat-value">
            {timeline.done}
            <small> of {timeline.total} done</small>
          </span>
          <ProgressBar
            value={timeline.completion * 100}
            label="Timeline completion"
            tone={timeline.overdue > 0 ? 'danger' : 'sage'}
            showValue={false}
          />
          <span className={`stat-foot${timeline.overdue > 0 ? ' is-danger' : ''}`}>
            {timeline.overdue > 0
              ? `${timeline.overdue} overdue`
              : `${timeline.daysUntilEvent} days to go`}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </button>

        <button type="button" className="stat-card" onClick={() => navigate('vendors')}>
          <span className="stat-icon">
            <Store size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Vendors</span>
          <span className="stat-value">
            {vendors.essentialBooked}
            <small> of {vendors.essentialTotal} essentials booked</small>
          </span>
          <ProgressBar
            value={
              vendors.essentialTotal > 0
                ? (vendors.essentialBooked / vendors.essentialTotal) * 100
                : 0
            }
            label="Essential vendors booked"
            tone={missingEssential.length > 2 ? 'gold' : 'sage'}
            showValue={false}
          />
          <span className="stat-foot">
            {missingEssential.length > 0
              ? `${missingEssential.length} still to book`
              : 'Team complete'}
            <ArrowUpRight size={14} aria-hidden="true" />
          </span>
        </button>
      </section>

      <div className="overview-grid">
        <section className="panel panel-insights" aria-labelledby="insights-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Plan pulse</p>
              <h2 id="insights-title">What needs your attention</h2>
            </div>
            <Badge tone="neutral">{insights.length} signals</Badge>
          </div>
          <ul className="insight-list">
            {insights.slice(0, 5).map((insight) => (
              <InsightRow key={insight.id} insight={insight} onNavigate={navigate} />
            ))}
          </ul>
          {insights.length === 0 && (
            <p className="muted">Everything looks calm. Add a guest or a vendor to keep shaping the plan.</p>
          )}
        </section>

        <section className="panel panel-next" aria-labelledby="next-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">The next four</p>
              <h2 id="next-title">Next up</h2>
            </div>
            <button type="button" className="text-button" onClick={() => navigate('timeline')}>
              Full timeline <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          {nextTasks.length === 0 ? (
            <div className="next-empty">
              <CheckCircle2 size={24} aria-hidden="true" />
              <div>
                <strong>No open milestones</strong>
                <p>Either you are wonderfully ahead, or the timeline needs a few more tasks.</p>
              </div>
            </div>
          ) : (
            <ul className="compact-task-list">
              {nextTasks.map((task) => {
                const overdue = task.due < todayIso();
                return (
                  <li key={task.id} className="compact-task">
                    <button
                      type="button"
                      className="task-check"
                      onClick={() => completeTask(task.id, task.title)}
                      aria-label={`Mark ${task.title} complete`}
                    >
                      <Check size={13} aria-hidden="true" />
                    </button>
                    <div>
                      <span className="compact-task-title">{task.title}</span>
                      <span className={`compact-task-meta${overdue ? ' is-danger' : ''}`}>
                        {relativeDayLabel(task.due)} · {task.priority} priority
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="panel panel-budget" aria-labelledby="budget-snapshot-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Where it is going</p>
              <h2 id="budget-snapshot-title">Budget shape</h2>
            </div>
            <button type="button" className="text-button" onClick={() => navigate('budget')}>
              Budget <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <div className="budget-snapshot-body">
            <DonutChart
              segments={donutSegments}
              label="Planned spend by category"
              size={172}
              thickness={10}
            >
              <span className="donut-label">Planned</span>
              <strong>{formatMoney(summary.planned, currency)}</strong>
              <small>
                {summary.totalBudget > 0
                  ? `${formatPercent(budgetUsed)} of budget`
                  : 'No budget set'}
              </small>
            </DonutChart>
            <ul className="donut-legend">
              {topFour.map((category) => (
                <li key={category.id}>
                  <span className="legend-dot" style={{ backgroundColor: category.color }} />
                  <span>{category.label}</span>
                  <strong>{formatMoney(category.planned, currency)}</strong>
                </li>
              ))}
              <li className="donut-total">
                <span>Per guest</span>
                <strong>{formatMoney(summary.perGuest, currency)}</strong>
              </li>
            </ul>
          </div>
        </section>

        <section className="panel panel-concept" aria-labelledby="concept-snapshot-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">The feeling</p>
              <h2 id="concept-snapshot-title">{event.concept.title}</h2>
            </div>
            <SourceBadge source={event.concept.source} />
          </div>
          <p className="concept-snapshot-summary">{event.concept.summary}</p>
          <div className="palette-row" aria-label="Concept palette">
            {event.concept.palette.map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="palette-swatch"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <span className="palette-hint">{event.concept.palette.length} colours</span>
          </div>
          <ul className="moment-list">
            {event.concept.signatureMoments.slice(0, 3).map((moment, index) => (
              <li key={moment}>
                <span className="moment-number">{String(index + 1).padStart(2, '0')}</span>
                {moment}
              </li>
            ))}
          </ul>
          <button type="button" className="text-button" onClick={() => navigate('concept')}>
            Open concept & ideas <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>

        <section className="panel panel-vendors" aria-labelledby="vendors-snapshot-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">The team</p>
              <h2 id="vendors-snapshot-title">Vendor readiness</h2>
            </div>
            <button type="button" className="text-button" onClick={() => navigate('vendors')}>
              Vendors <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <ProgressBar
            value={
              vendors.essentialTotal > 0
                ? (vendors.essentialBooked / vendors.essentialTotal) * 100
                : 0
            }
            label="Essential vendor readiness"
            tone={missingEssential.length > 2 ? 'gold' : 'sage'}
          />
          <ul className="vendor-readiness-list">
            {vendors.categories
              .filter((category) => category.essential)
              .map((category) => (
                <li key={category.id}>
                  <span
                    className={`status-dot ${category.booked ? 'is-booked' : 'is-open'}`}
                    aria-hidden="true"
                  />
                  <span>{category.label}</span>
                  <span className={category.booked ? 'status-booked' : 'status-open'}>
                    {category.booked ? 'Booked' : 'Open'}
                  </span>
                </li>
              ))}
          </ul>
        </section>

        <section className={`panel panel-ai${ai.configured ? ' is-connected' : ''}`} aria-labelledby="studio-snapshot-title">
          <div className="ai-panel-icon" aria-hidden="true">
            <Sparkles size={22} />
          </div>
          <div>
            <p className="eyebrow">AI studio</p>
            <h2 id="studio-snapshot-title">
              {ai.configured ? 'Your second brain is connected' : 'A second brain, on your terms'}
            </h2>
            <p>
              {ai.configured
                ? 'Ask for a fresh concept, a budget review, or a vendor email. Only a plan summary is shared.'
                : 'The local coach is ready. Connect Gemini or OpenAI for deeper personalisation — or keep everything offline.'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('studio')}>
            {ai.configured ? 'Open AI Studio' : 'Explore AI Studio'} <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}

function InsightRow({
  insight,
  onNavigate,
}: {
  insight: Insight;
  onNavigate: ReturnType<typeof useApp>['navigate'];
}) {
  const Icon = SEVERITY_ICON[insight.severity];
  return (
    <li className={`insight-row insight-${insight.severity}`}>
      <span className="insight-icon" aria-hidden="true">
        <Icon size={17} />
      </span>
      <div className="insight-body">
        <strong>{insight.title}</strong>
        <p>{insight.detail}</p>
      </div>
      {insight.action && (
        <button
          type="button"
          className="insight-action"
          onClick={() => onNavigate(insight.action!.view)}
        >
          {insight.action.label} <ArrowRight size={13} aria-hidden="true" />
        </button>
      )}
    </li>
  );
}
