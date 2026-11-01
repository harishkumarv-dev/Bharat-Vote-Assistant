import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  Info,
  Loader2,
  Palette,
  Pin,
  PinOff,
  Printer,
  RefreshCw,
  Settings2,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { useApp } from '../state/AppContext';
import {
  ACCESSIBILITY_LABELS,
  COST_BAND_LABELS,
  DIETARY_LABELS,
  EFFORT_LABELS,
  PRIORITY_LABELS,
  STYLE_LABELS,
} from '../domain/catalog';
import { formatDate } from '../domain/dates';
import { AiError, generateJson } from '../ai/client';
import { aiPlanSchema, toConceptResult } from '../ai/schema';
import { buildPlanPrompt, planSystemPrompt } from '../ai/prompts';
import { Badge, SourceBadge } from '../components/ui';
import type { Idea } from '../types';

const COST_TONE = {
  free: 'sage',
  low: 'sage',
  medium: 'gold',
  splurge: 'accent',
} as const;

export function ConceptView({ onEditBrief }: { onEditBrief: () => void }) {
  const { event, dispatch, toast, navigate, ai } = useApp();
  const [generating, setGenerating] = useState(false);
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

  const pinned = event.ideas.filter((idea) => idea.pinned);
  const ideas = [...pinned, ...event.ideas.filter((idea) => !idea.pinned)];

  function regenerateLocal() {
    dispatch({ type: 'REGENERATE_LOCAL_CONCEPT' });
    toast('Fresh local concept generated. Pinned ideas were kept.', 'success');
  }

  async function regenerateWithAi() {
    if (!ai.configured) {
      toast('Add an API key first, or keep using the local plan engine.', 'info');
      ai.openSettings();
      return;
    }
    setGenerating(true);
    setAiError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const payload = await generateJson(
        {
          settings: ai.settings,
          apiKey: ai.apiKey,
          system: planSystemPrompt(),
          user: buildPlanPrompt(event),
          signal: controller.signal,
        },
        aiPlanSchema,
      );
      if (!mounted.current) return;
      const result = toConceptResult(payload);
      dispatch({
        type: 'APPLY_AI_PLAN',
        result,
        generatedAt: new Date().toISOString(),
      });
      toast('AI concept added. Pinned ideas were kept.', 'success');
    } catch (error) {
      if (!mounted.current || (error instanceof AiError && error.code === 'aborted')) return;
      const message =
        error instanceof AiError
          ? error.message
          : 'The AI response could not be used. Try again or use the local engine.';
      setAiError(message);
      toast(message, 'error');
    } finally {
      if (mounted.current) setGenerating(false);
    }
  }

  return (
    <div className="view concept-view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Concept & personal touches</p>
          <h1>{event.concept.title}</h1>
          <p className="view-description">
            A direction for {event.basics.name} on {formatDate(event.basics.date, { month: 'long', day: 'numeric', year: 'numeric' })}.
            Every idea is optional. Pinning keeps the ones you love when the concept refreshes.
          </p>
        </div>
        <div className="view-actions">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Print
          </button>
          <button type="button" className="btn btn-secondary" onClick={regenerateLocal} disabled={generating}>
            <RefreshCw size={16} aria-hidden="true" /> Refresh local
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={regenerateWithAi}
            disabled={generating}
          >
            {generating ? (
              <Loader2 size={16} className="spin" aria-hidden="true" />
            ) : (
              <Sparkles size={16} aria-hidden="true" />
            )}
            {generating ? 'Thinking…' : ai.configured ? 'Refresh with AI' : 'Connect AI'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="inline-notice notice-danger" role="alert">
          <div>
            <strong>AI refresh did not finish</strong>
            <p>{aiError}</p>
          </div>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => ai.openSettings()}>
            <Settings2 size={14} aria-hidden="true" /> Settings
          </button>
        </div>
      )}

      <section className="concept-hero" aria-labelledby="concept-title">
        <div className="concept-hero-head">
          <div>
            <div className="concept-meta-row">
              <SourceBadge source={event.concept.source} />
              <span className="muted">
                {event.basics.guestCount} guests · {event.basics.location || 'Location open'}
              </span>
            </div>
            <h2 id="concept-title">{event.concept.title}</h2>
          </div>
          <div className="concept-palette-block">
            <span className="palette-label">
              <Palette size={14} aria-hidden="true" /> Palette
            </span>
            <div className="palette-row palette-large">
              {event.concept.palette.map((color, index) => (
                <span
                  key={`${color}-${index}`}
                  className="palette-swatch"
                  style={{ backgroundColor: color }}
                  title={color}
                >
                  <span className="sr-only">{color}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="concept-summary">{event.concept.summary}</p>
        <div className="concept-hero-columns">
          <div>
            <h3 className="small-heading">Signature moments</h3>
            <ol className="signature-moments">
              {event.concept.signatureMoments.map((moment, index) => (
                <li key={moment}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{moment}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="concept-tag-block">
            <h3 className="small-heading">The brief behind it</h3>
            <div className="tag-row">
              {event.vibe.priorities.map((priority) => (
                <span key={priority} className="tag tag-accent">
                  {PRIORITY_LABELS[priority]}
                </span>
              ))}
              {event.vibe.styles.map((style) => (
                <span key={style} className="tag">
                  {STYLE_LABELS[style]}
                </span>
              ))}
            </div>
            {event.vibe.dietary.length > 0 && (
              <p className="concept-brief-line">
                <strong>Food:</strong>{' '}
                {event.vibe.dietary.map((need) => DIETARY_LABELS[need]).join(', ')}
              </p>
            )}
            {event.vibe.accessibility.length > 0 && (
              <p className="concept-brief-line">
                <strong>Access:</strong>{' '}
                {event.vibe.accessibility.map((need) => ACCESSIBILITY_LABELS[need]).join(', ')}
              </p>
            )}
            <button type="button" className="text-button" onClick={onEditBrief}>
              Edit the brief <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="ideas-section" aria-labelledby="ideas-title">
        <div className="section-head">
          <div>
            <p className="eyebrow">Made for this plan</p>
            <h2 id="ideas-title">Personal touch library</h2>
          </div>
          <p>
            {pinned.length > 0
              ? `${pinned.length} pinned · ${ideas.length - pinned.length} open ideas`
              : `${ideas.length} ideas · pin the ones you want to keep`}
          </p>
        </div>
        <div className="idea-grid">
          {ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onPin={() => dispatch({ type: 'TOGGLE_IDEA_PIN', id: idea.id })}
            />
          ))}
        </div>
      </section>

      <div className="concept-footer-grid">
        <section className="panel" aria-labelledby="brief-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">The brief</p>
              <h2 id="brief-title">What we are designing for</h2>
            </div>
            <button type="button" className="text-button" onClick={onEditBrief}>
              Edit <ArrowRight size={14} aria-hidden="true" />
            </button>
          </div>
          <dl className="brief-list">
            <div>
              <dt>Priorities</dt>
              <dd>
                {event.vibe.priorities.length > 0
                  ? event.vibe.priorities.map((priority) => PRIORITY_LABELS[priority]).join(', ')
                  : 'Still open'}
              </dd>
            </div>
            <div>
              <dt>Style</dt>
              <dd>
                {event.vibe.styles.length > 0
                  ? event.vibe.styles.map((style) => STYLE_LABELS[style]).join(', ')
                  : 'Open to suggestion'}
              </dd>
            </div>
            <div>
              <dt>Dietary</dt>
              <dd>
                {event.vibe.dietary.length > 0
                  ? event.vibe.dietary.map((need) => DIETARY_LABELS[need]).join(', ')
                  : 'No needs recorded yet'}
              </dd>
            </div>
            <div>
              <dt>Access</dt>
              <dd>
                {event.vibe.accessibility.length > 0
                  ? event.vibe.accessibility.map((need) => ACCESSIBILITY_LABELS[need]).join(', ')
                  : 'No needs recorded yet'}
              </dd>
            </div>
            {event.vibe.notes && (
              <div>
                <dt>Notes</dt>
                <dd>{event.vibe.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="panel" aria-labelledby="source-title">
          <div className="panel-head">
            <div>
              <p className="eyebrow">How this was made</p>
              <h2 id="source-title">Local first, AI optional</h2>
            </div>
            <Badge tone={ai.configured ? 'accent' : 'sage'}>
              {ai.configured ? 'AI available' : 'Local only'}
            </Badge>
          </div>
          <div className="how-made">
            <div>
              <WandSparkles size={18} aria-hidden="true" />
              <div>
                <strong>Local plan engine</strong>
                <p>
                  Matches your priorities and styles against a curated planning library. It runs on
                  this device and always provides a complete starting plan.
                </p>
              </div>
            </div>
            <div>
              <Sparkles size={18} aria-hidden="true" />
              <div>
                <strong>AI refresh</strong>
                <p>
                  Sends a summary — no guest names, emails, or phone numbers — to your chosen
                  provider. The response is validated before anything is added to the plan.
                </p>
              </div>
            </div>
            <div>
              <Info size={18} aria-hidden="true" />
              <div>
                <strong>What is still an assumption</strong>
                <p>
                  Costs are allocation estimates, not quotes. Venue rules, permits, and local
                  accessibility requirements must be confirmed with the responsible people.
                </p>
              </div>
            </div>
          </div>
          {!ai.configured && (
            <button type="button" className="btn btn-secondary" onClick={() => ai.openSettings()}>
              <Settings2 size={15} aria-hidden="true" /> Connect a provider
            </button>
          )}
        </section>

        {event.aiNotes && (
          <section className="panel ai-notes-panel" aria-labelledby="ai-notes-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">AI perspective</p>
                <h2 id="ai-notes-title">Notes from your latest refresh</h2>
              </div>
              <Badge tone="accent">AI</Badge>
            </div>
            <p>{event.aiNotes.summary}</p>
            {event.aiNotes.budgetTips.length > 0 && (
              <div className="ai-notes-block">
                <h3>Budget levers</h3>
                <ul>
                  {event.aiNotes.budgetTips.slice(0, 3).map((tip) => (
                    <li key={tip.title}>
                      <strong>{tip.title}</strong> — {tip.detail}
                    </li>
                  ))}
                </ul>
                <button type="button" className="text-button" onClick={() => navigate('budget')}>
                  Open budget view <ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function IdeaCard({ idea, onPin }: { idea: Idea; onPin: () => void }) {
  return (
    <article className={`idea-card${idea.pinned ? ' is-pinned' : ''}`}>
      <div className="idea-card-top">
        <span className="idea-category">{idea.category}</span>
        <button
          type="button"
          className={`pin-button${idea.pinned ? ' is-pinned' : ''}`}
          onClick={onPin}
          aria-pressed={idea.pinned}
          aria-label={idea.pinned ? `Unpin ${idea.title}` : `Pin ${idea.title}`}
          title={idea.pinned ? 'Unpin idea' : 'Keep this idea'}
        >
          {idea.pinned ? <PinOff size={15} aria-hidden="true" /> : <Pin size={15} aria-hidden="true" />}
        </button>
      </div>
      <h3>{idea.title}</h3>
      <p>{idea.description}</p>
      <div className="idea-why">
        <Sparkles size={14} aria-hidden="true" />
        <span>{idea.whyItFits}</span>
      </div>
      <div className="idea-meta">
        <Badge tone={COST_TONE[idea.costBand]}>{COST_BAND_LABELS[idea.costBand]}</Badge>
        <span>{EFFORT_LABELS[idea.effort]}</span>
        {idea.source === 'ai' && (
          <span className="idea-ai-mark">
            <Sparkles size={12} aria-hidden="true" /> AI
          </span>
        )}
      </div>
      {idea.pinned && (
        <span className="pinned-label">
          <Check size={12} aria-hidden="true" /> Kept
        </span>
      )}
    </article>
  );
}
