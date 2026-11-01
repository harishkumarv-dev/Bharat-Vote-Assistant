import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  Download,
  ListChecks,
  PencilLine,
  Plus,
  Printer,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { PlanTask, TaskPhase } from '../types';
import { TASK_PHASES } from '../types';
import { PHASE_LABELS, PHASE_ORDER } from '../domain/catalog';
import {
  buildTimelineIcs,
  computeTimelineStats,
  sortTasks,
} from '../domain/timeline';
import { formatDate, relativeDayLabel, todayIso } from '../domain/dates';
import { useApp } from '../state/AppContext';
import { Badge, EmptyState, ProgressBar, ViewHeader } from '../components/ui';
import { Modal } from '../components/Modal';
import { downloadText, safeFilename } from '../utils/download';

const PRIORITY_TONE = {
  high: 'danger',
  medium: 'gold',
  low: 'neutral',
} as const;

type StatusFilter = 'all' | 'open' | 'done' | 'overdue';

const PHASE_HINTS: Record<TaskPhase, string> = {
  foundation: 'Decisions and numbers that shape everything else.',
  bookings: 'The people and places that hold the date.',
  details: 'The parts guests will remember — and the boring safety bits.',
  final: 'Confirmations, numbers, and a calm final week.',
  event: 'A short run-of-show so nobody has to hold it all in their head.',
};

export function TimelineView() {
  const { event, dispatch, toast } = useApp();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [phaseFilter, setPhaseFilter] = useState<'all' | TaskPhase>('all');
  const [editor, setEditor] = useState<{ open: boolean; task: PlanTask | null }>({
    open: false,
    task: null,
  });
  const [deleteTarget, setDeleteTarget] = useState<PlanTask | null>(null);

  const stats = useMemo(
    () => computeTimelineStats(event.tasks, event.basics.date),
    [event.tasks, event.basics.date],
  );

  const timelineTips = event.aiNotes?.timelineTips ?? [];

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    const today = todayIso();
    return event.tasks.filter((task) => {
      if (phaseFilter !== 'all' && task.phase !== phaseFilter) return false;
      if (statusFilter === 'open' && task.done) return false;
      if (statusFilter === 'done' && !task.done) return false;
      if (statusFilter === 'overdue' && (task.done || task.due >= today)) return false;
      if (!text) return true;
      return `${task.title} ${task.notes} ${PHASE_LABELS[task.phase]}`.toLowerCase().includes(text);
    });
  }, [event.tasks, phaseFilter, query, statusFilter]);

  const grouped = useMemo(
    () =>
      PHASE_ORDER.map((phase) => ({
        phase,
        tasks: sortTasks(filtered.filter((task) => task.phase === phase)),
        allCount: event.tasks.filter((task) => task.phase === phase).length,
        doneCount: event.tasks.filter((task) => task.phase === phase && task.done).length,
      })).filter((group) => group.tasks.length > 0),
    [event.tasks, filtered],
  );

  const nextTask = stats.next[0];
  const currency = event.basics.currency;

  function exportCalendar() {
    if (event.tasks.length === 0) {
      toast('Add a milestone before exporting a calendar.', 'info');
      return;
    }
    downloadText(
      `${safeFilename(event.basics.name)}-timeline.ics`,
      buildTimelineIcs(event),
      'text/calendar;charset=utf-8',
    );
    toast('Calendar file downloaded. Open it to add the plan to your calendar.', 'success');
  }

  return (
    <div className="view timeline-view">
      <ViewHeader
        eyebrow="The shape of the run-up"
        title="Timeline"
        description={`Milestones compressed to fit the time you actually have. ${event.basics.name} is ${stats.daysUntilEvent >= 0 ? `${stats.daysUntilEvent.toLocaleString('en-US')} days away` : `${Math.abs(stats.daysUntilEvent).toLocaleString('en-US')} days past`}.`}
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={exportCalendar}>
              <Download size={16} aria-hidden="true" /> Export calendar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setEditor({ open: true, task: null })}
            >
              <Plus size={16} aria-hidden="true" /> Add milestone
            </button>
          </>
        }
      />

      <section className="timeline-stat-grid" aria-label="Timeline summary">
        <div className="stat-card stat-card-static timeline-stat-main">
          <span className="stat-icon stat-icon-sage">
            <ListChecks size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Completion</span>
          <span className="stat-value">
            {Math.round(stats.completion * 100)}
            <small>%</small>
          </span>
          <ProgressBar
            value={stats.completion * 100}
            label="Timeline completion"
            showValue={false}
            tone={stats.overdue > 0 ? 'danger' : 'sage'}
          />
          <span className="stat-foot">
            {stats.done} of {stats.total} milestones done
          </span>
        </div>
        <div className="stat-card stat-card-static">
          <span className={`stat-icon${stats.overdue > 0 ? ' stat-icon-danger' : ' stat-icon-sage'}`}>
            {stats.overdue > 0 ? (
              <AlertCircle size={18} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={18} aria-hidden="true" />
            )}
          </span>
          <span className="stat-label">Overdue</span>
          <span className={`stat-value${stats.overdue > 0 ? ' is-danger' : ''}`}>{stats.overdue}</span>
          <span className="stat-foot">
            {stats.overdue > 0 ? 'Reschedule or clear them first' : 'Nothing slipping'}
          </span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-gold">
            <CalendarDays size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Event date</span>
          <span className="stat-value stat-value-date">
            {formatDate(event.basics.date, { month: 'short', day: 'numeric' })}
          </span>
          <span className="stat-foot">{formatDate(event.basics.date, { weekday: 'long' })}</span>
        </div>
        <div className="stat-card stat-card-static">
          <span className="stat-icon stat-icon-accent">
            <ArrowRight size={18} aria-hidden="true" />
          </span>
          <span className="stat-label">Next up</span>
          <span className="stat-value stat-value-small">
            {nextTask ? nextTask.title : 'All clear'}
          </span>
          <span className="stat-foot">
            {nextTask ? relativeDayLabel(nextTask.due) : 'Add the next small step'}
          </span>
        </div>
      </section>

      <div className="timeline-layout">
        <section className="panel timeline-panel" aria-labelledby="timeline-title">
          <div className="panel-head timeline-head">
            <div>
              <p className="eyebrow">Milestones</p>
              <h2 id="timeline-title">
                {filtered.length === event.tasks.length
                  ? 'The whole run-up'
                  : `${filtered.length} of ${event.tasks.length} milestones`}
              </h2>
            </div>
            <div className="timeline-toolbar">
              <div className="search-field">
                <Search size={16} aria-hidden="true" />
                <label htmlFor="task-search" className="sr-only">
                  Search milestones
                </label>
                <input
                  id="task-search"
                  type="search"
                  className="input-control"
                  placeholder="Search milestones…"
                  value={query}
                  onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                />
              </div>
              <label htmlFor="task-status-filter" className="sr-only">
                Filter by status
              </label>
              <select
                id="task-status-filter"
                className="select-control select-compact"
                value={statusFilter}
                onChange={(changeEvent) => setStatusFilter(changeEvent.target.value as StatusFilter)}
              >
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="done">Done</option>
                <option value="overdue">Overdue</option>
              </select>
              <label htmlFor="task-phase-filter" className="sr-only">
                Filter by phase
              </label>
              <select
                id="task-phase-filter"
                className="select-control select-compact"
                value={phaseFilter}
                onChange={(changeEvent) =>
                  setPhaseFilter(changeEvent.target.value as 'all' | TaskPhase)
                }
              >
                <option value="all">All phases</option>
                {TASK_PHASES.map((phase) => (
                  <option key={phase} value={phase}>
                    {PHASE_LABELS[phase]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="phase-legend" aria-label="Phase progress">
            {PHASE_ORDER.map((phase) => {
              const total = event.tasks.filter((task) => task.phase === phase).length;
              const done = event.tasks.filter((task) => task.phase === phase && task.done).length;
              return (
                <button
                  key={phase}
                  type="button"
                  className={`phase-legend-item${phaseFilter === phase ? ' is-active' : ''}`}
                  onClick={() => setPhaseFilter(phaseFilter === phase ? 'all' : phase)}
                  aria-pressed={phaseFilter === phase}
                >
                  <span className={`phase-dot phase-${phase}`} aria-hidden="true" />
                  <span>{PHASE_LABELS[phase]}</span>
                  <span className="phase-count">
                    {done}/{total}
                  </span>
                </button>
              );
            })}
          </div>

          {event.tasks.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={28} />}
              title="No milestones yet"
              description="Add the one next thing you need to do, then build the timeline backwards from the event date."
              action={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setEditor({ open: true, task: null })}
                >
                  <Plus size={16} aria-hidden="true" /> Add a milestone
                </button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={26} />}
              title="Nothing matches those filters"
              description="Try another phase, status, or search term."
              action={
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                    setPhaseFilter('all');
                  }}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="timeline-groups">
              {grouped.map((group) => (
                <section
                  key={group.phase}
                  className={`timeline-group phase-group-${group.phase}`}
                  aria-labelledby={`phase-${group.phase}`}
                >
                  <div className="timeline-group-head">
                    <span className={`phase-dot phase-${group.phase}`} aria-hidden="true" />
                    <div>
                      <h3 id={`phase-${group.phase}`}>{PHASE_LABELS[group.phase]}</h3>
                      <p>{PHASE_HINTS[group.phase]}</p>
                    </div>
                    <span className="muted">
                      {group.doneCount}/{group.allCount}
                    </span>
                  </div>
                  <ul className="task-list">
                    {group.tasks.map((task) => {
                      const overdue = !task.done && task.due < todayIso();
                      return (
                        <li
                          key={task.id}
                          className={`task-row${task.done ? ' is-done' : ''}${
                            overdue ? ' is-overdue' : ''
                          }`}
                        >
                          <button
                            type="button"
                            className="task-toggle"
                            onClick={() => {
                              dispatch({ type: 'TOGGLE_TASK', id: task.id });
                              if (!task.done) toast(`Milestone complete: ${task.title}`, 'success');
                            }}
                            aria-pressed={task.done}
                            aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
                          >
                            {task.done && <Check size={13} aria-hidden="true" />}
                          </button>
                          <div className="task-row-main">
                            <span className="task-row-title">{task.title}</span>
                            {task.notes && <p>{task.notes}</p>}
                            <div className="task-row-meta">
                              <span className={overdue ? 'is-danger' : ''}>
                                <CalendarDays size={13} aria-hidden="true" />
                                {formatDate(task.due, { month: 'short', day: 'numeric' })} ·{' '}
                                {relativeDayLabel(task.due)}
                              </span>
                              <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                            </div>
                          </div>
                          <div className="task-row-actions">
                            <button
                              type="button"
                              className="icon-button icon-button-small"
                              onClick={() => setEditor({ open: true, task })}
                              aria-label={`Edit ${task.title}`}
                            >
                              <PencilLine size={15} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className="icon-button icon-button-small danger-text"
                              onClick={() => setDeleteTarget(task)}
                              aria-label={`Delete ${task.title}`}
                            >
                              <Trash2 size={15} aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </section>

        <aside className="timeline-sidebar">
          <section className="panel next-focus-panel" aria-labelledby="next-focus-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">A calm next step</p>
                <h2 id="next-focus-title">Start here</h2>
              </div>
              <Sparkles size={18} aria-hidden="true" />
            </div>
            {nextTask ? (
              <>
                <Badge tone={PRIORITY_TONE[nextTask.priority]}>{nextTask.priority} priority</Badge>
                <h3>{nextTask.title}</h3>
                <p>{nextTask.notes || PHASE_HINTS[nextTask.phase]}</p>
                <p className="muted">
                  Due {relativeDayLabel(nextTask.due).toLowerCase()} · {formatDate(nextTask.due)}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-small"
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_TASK', id: nextTask.id });
                    toast(`Milestone complete: ${nextTask.title}`, 'success');
                  }}
                >
                  <Check size={14} aria-hidden="true" /> Mark it done
                </button>
              </>
            ) : (
              <p>No open milestones. Add the next small step so the plan keeps moving.</p>
            )}
          </section>

          {timelineTips.length > 0 && (
            <section className="panel timeline-ai-panel" aria-labelledby="timeline-ai-title">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">From your AI refresh</p>
                  <h2 id="timeline-ai-title">Scheduling notes</h2>
                </div>
                <Badge tone="accent">AI</Badge>
              </div>
              <ul className="plain-list">
                {timelineTips.map((tip) => (
                  <li key={tip}>
                    <p>{tip}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="panel timeline-guidance" aria-labelledby="timeline-guidance-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Keep it human</p>
                <h2 id="timeline-guidance-title">Timeline notes</h2>
              </div>
            </div>
            <ul className="plain-list">
              <li>
                <strong>Work backwards from the date</strong>
                <p>Vendor deadlines, final headcount, and print orders usually matter more than the small decoration tasks.</p>
              </li>
              <li>
                <strong>Protect the final week</strong>
                <p>Keep it for confirmations, packing, and rest. If a task can be done earlier, move it.</p>
              </li>
              <li>
                <strong>One named owner</strong>
                <p>On the day, every task needs a person. A run-of-show nobody owns is just a list.</p>
              </li>
            </ul>
            <button type="button" className="text-button" onClick={() => window.print()}>
              <Printer size={14} aria-hidden="true" /> Print the timeline
            </button>
          </section>

          <section className="panel timeline-export-panel" aria-labelledby="timeline-export-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Take it with you</p>
                <h2 id="timeline-export-title">Calendar & print</h2>
              </div>
              <CalendarPlus size={18} aria-hidden="true" />
            </div>
            <p>
              Export an `.ics` file with every milestone and the event day. It works with Apple
              Calendar, Google Calendar, and Outlook.
            </p>
            <div className="timeline-export-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={exportCalendar}>
                <Download size={14} aria-hidden="true" /> Download .ics
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => window.print()}>
                <Printer size={14} aria-hidden="true" /> Print
              </button>
            </div>
            <p className="muted">{currency} plan · {event.tasks.length} milestones</p>
          </section>
        </aside>
      </div>

      <TaskModal
        open={editor.open}
        task={editor.task}
        eventDate={event.basics.date}
        onClose={() => setEditor({ open: false, task: null })}
        onSave={(payload, existing) => {
          if (existing) {
            dispatch({ type: 'UPDATE_TASK', id: existing.id, patch: payload });
            toast('Milestone updated.', 'success');
          } else {
            dispatch({ type: 'ADD_TASK', task: payload });
            toast('Milestone added.', 'success');
          }
          setEditor({ open: false, task: null });
        }}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={deleteTarget ? `Delete “${deleteTarget.title}”?` : 'Delete milestone?'}
        size="small"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                if (!deleteTarget) return;
                dispatch({ type: 'DELETE_TASK', id: deleteTarget.id });
                toast('Milestone removed.', 'info');
                setDeleteTarget(null);
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete milestone
            </button>
          </>
        }
      >
        <p>This only removes the milestone from your plan. It does not affect any calendar export already downloaded.</p>
      </Modal>
    </div>
  );
}

type TaskPayload = {
  title: string;
  phase: TaskPhase;
  due: string;
  priority: PlanTask['priority'];
  notes: string;
};

function TaskModal({
  open,
  task,
  eventDate,
  onClose,
  onSave,
}: {
  open: boolean;
  task: PlanTask | null;
  eventDate: string;
  onClose: () => void;
  onSave: (payload: TaskPayload, existing: PlanTask | null) => void;
}) {
  const [title, setTitle] = useState('');
  const [phase, setPhase] = useState<TaskPhase>('details');
  const [due, setDue] = useState('');
  const [priority, setPriority] = useState<PlanTask['priority']>('medium');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const existing = task && task.id ? task : null;

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? '');
    setPhase(task?.phase ?? 'details');
    setDue(task?.due ?? (eventDate >= todayIso() ? todayIso() : eventDate));
    setPriority(task?.priority ?? 'medium');
    setNotes(task?.notes ?? '');
    setError('');
  }, [open, task, eventDate]);

  function save() {
    if (!title.trim()) {
      setError('Give the milestone a clear action.');
      return;
    }
    if (!due) {
      setError('Choose a due date.');
      return;
    }
    onSave({ title: title.trim(), phase, due, priority, notes: notes.trim() }, existing);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? 'Edit milestone' : 'Add a milestone'}
      description="Make it small enough to finish, and specific enough that someone else could pick it up."
      size="small"
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="task-form" className="btn btn-primary">
            {existing ? 'Save milestone' : 'Add milestone'}
          </button>
        </>
      }
    >
      <form
        id="task-form"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label htmlFor="task-title" className="field-label">
            What needs doing? <span className="required-mark">*</span>
          </label>
          <input
            id="task-title"
            className="input-control"
            value={title}
            maxLength={120}
            placeholder="e.g. Confirm final headcount with caterer"
            onChange={(changeEvent) => setTitle(changeEvent.target.value)}
            data-autofocus
          />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="task-phase" className="field-label">
              Phase
            </label>
            <select
              id="task-phase"
              className="select-control"
              value={phase}
              onChange={(changeEvent) => setPhase(changeEvent.target.value as TaskPhase)}
            >
              {TASK_PHASES.map((option) => (
                <option key={option} value={option}>
                  {PHASE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="task-due" className="field-label">
              Due <span className="required-mark">*</span>
            </label>
            <input
              id="task-due"
              type="date"
              className="input-control"
              value={due}
              onChange={(changeEvent) => setDue(changeEvent.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="task-priority" className="field-label">
            Priority
          </label>
          <div className="segmented-control" role="group" aria-label="Milestone priority">
            {(['high', 'medium', 'low'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`segment${priority === option ? ' is-active' : ''}`}
                aria-pressed={priority === option}
                onClick={() => setPriority(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="task-notes" className="field-label">
            Notes
          </label>
          <textarea
            id="task-notes"
            className="textarea-control"
            rows={3}
            maxLength={400}
            value={notes}
            placeholder="Who owns it, what “done” looks like, anything to ask…"
            onChange={(changeEvent) => setNotes(changeEvent.target.value)}
          />
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
