import { useState } from 'react';
import {
  ArrowRight,
  CakeSlice,
  CalendarCheck,
  Heart,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { GalaMark, Wordmark } from './Brand';
import { EventWizard } from './EventWizard';
import { EVENT_TYPE_META } from '../domain/catalog';
import type { EventDraft, EventType } from '../types';

const TYPE_ICONS = {
  wedding: Heart,
  birthday: CakeSlice,
  community: Users,
} as const;

interface Props {
  aiConfigured: boolean;
  onCreate: (draft: EventDraft) => void;
  onSample: () => void;
  onOpenSettings: () => void;
}

export function Onboarding({ aiConfigured, onCreate, onSample, onOpenSettings }: Props) {
  const [activeType, setActiveType] = useState<EventType | null>(null);

  return (
    <div className="onboarding">
      <a href="#onboarding-main" className="skip-link">
        Skip to content
      </a>
      <header className="onboarding-header">
        <div className="brand">
          <GalaMark />
          <Wordmark />
        </div>
        <div className="onboarding-header-actions">
          <span className="local-pill">
            <ShieldCheck size={15} aria-hidden="true" /> Local-first
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={onOpenSettings}
            aria-label="Open AI and privacy settings"
          >
            <Settings2 size={16} aria-hidden="true" />
            {aiConfigured ? 'AI connected' : 'AI settings'}
          </button>
        </div>
      </header>

      <main id="onboarding-main">
        {activeType ? (
          <EventWizard
            initialType={activeType}
            onCancel={() => setActiveType(null)}
            onCreate={onCreate}
          />
        ) : (
          <>
            <section className="welcome-hero" aria-labelledby="welcome-title">
              <div className="welcome-copy">
                <p className="eyebrow">A calmer way to plan</p>
                <h1 id="welcome-title">
                  Plan the moment.
                  <br />
                  <em>We’ll hold the details.</em>
                </h1>
                <p className="welcome-lede">
                  Gala is a private planning studio for weddings, birthdays, and community
                  gatherings. It keeps the moving pieces — budget, guests, vendors, timeline, and
                  the small personal touches — in one clear place.
                </p>
                <div className="welcome-actions">
                  <button type="button" className="btn btn-primary btn-large" onClick={onSample}>
                    Open Live Dashboard <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-large"
                    onClick={() => setActiveType('wedding')}
                  >
                    Create New Event
                  </button>
                </div>
                <ul className="welcome-points" aria-label="What makes Gala different">
                  <li>No account</li>
                  <li>Works offline</li>
                  <li>AI when you want it</li>
                </ul>
              </div>

              <div className="welcome-visual" aria-hidden="true">
                <div className="preview-card preview-plan">
                  <div className="preview-topline">
                    <span>Plan confidence</span>
                    <span className="preview-dot" />
                  </div>
                  <div className="preview-score">
                    86<small>/100</small>
                  </div>
                  <div className="preview-meter">
                    <span style={{ width: '86%' }} />
                  </div>
                  <div className="preview-label-row">
                    <span>Budget</span>
                    <span>Timeline</span>
                    <span>Vendors</span>
                  </div>
                  <div className="preview-bars">
                    <span style={{ height: '72%' }} />
                    <span style={{ height: '90%' }} />
                    <span style={{ height: '58%' }} />
                    <span style={{ height: '80%' }} />
                    <span style={{ height: '64%' }} />
                    <span style={{ height: '42%' }} />
                  </div>
                </div>
                <div className="preview-card preview-next">
                  <p className="preview-kicker">Next up</p>
                  <div className="preview-task">
                    <span className="preview-check is-done">✓</span>
                    <span>Book the venue</span>
                  </div>
                  <div className="preview-task">
                    <span className="preview-check" />
                    <span>Confirm final headcount</span>
                  </div>
                  <div className="preview-task">
                    <span className="preview-check" />
                    <span>Share the run-of-show</span>
                  </div>
                  <div className="preview-palette" aria-hidden="true">
                    <span style={{ background: '#3E5C4B' }} />
                    <span style={{ background: '#D9C7A7' }} />
                    <span style={{ background: '#B4472C' }} />
                    <span style={{ background: '#F4EEE3' }} />
                  </div>
                </div>
                <div className="preview-card preview-note">
                  <Sparkles size={16} />
                  <p>“A candlelit courtyard, long tables, and dessert for dinner.”</p>
                </div>
              </div>
            </section>

            <section className="choose-event" id="choose-event" aria-labelledby="choose-title">
              <div className="section-head">
                <div>
                  <p className="eyebrow">Choose a starting point</p>
                  <h2 id="choose-title">What are we planning?</h2>
                </div>
                <p>You can change the type, date, or budget at any time.</p>
              </div>
              <div className="event-type-grid">
                {(['wedding', 'birthday', 'community'] as const).map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      className="event-type-card"
                      onClick={() => setActiveType(type)}
                    >
                      <span className="event-type-icon">
                        <Icon size={25} aria-hidden="true" />
                      </span>
                      <span className="event-type-body">
                        <span className="event-type-name">{EVENT_TYPE_META[type].label}</span>
                        <span className="event-type-description">
                          {EVENT_TYPE_META[type].description}
                        </span>
                        <span className="event-type-example">{EVENT_TYPE_META[type].example}</span>
                      </span>
                      <span className="event-type-arrow" aria-hidden="true">
                        <ArrowRight size={18} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="feature-strip" aria-label="How Gala helps">
              <div>
                <Wallet size={21} aria-hidden="true" />
                <h3>A budget that reacts</h3>
                <p>Change the guest count or a quote and see the plan, trade-offs, and warnings update.</p>
              </div>
              <div>
                <Store size={21} aria-hidden="true" />
                <h3>Vendors with real questions</h3>
                <p>Every essential category comes with the questions that surface the full cost.</p>
              </div>
              <div>
                <CalendarCheck size={21} aria-hidden="true" />
                <h3>A timeline that fits</h3>
                <p>Start six months out or six weeks out. Milestones compress to the time you have.</p>
              </div>
            </section>

            <section className="ai-callout">
              <div className="ai-callout-icon" aria-hidden="true">
                <Sparkles size={25} />
              </div>
              <div>
                <h2>A local planner first. A second brain when you want one.</h2>
                <p>
                  Gala’s local engine builds a solid plan with no network requests. Connect Google
                  Gemini or OpenAI for a more bespoke concept, budget review, and vendor emails.
                  Your key stays in your browser and is never exported.
                </p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={onOpenSettings}>
                {aiConfigured ? 'Manage AI settings' : 'Connect an AI provider'}
              </button>
            </section>
          </>
        )}
      </main>

      <footer className="onboarding-footer">
        <span>Gala Studio · An open-source Prompt Wars project</span>
        <span className="footer-sep">·</span>
        <span>Your data lives in this browser</span>
      </footer>
    </div>
  );
}
