import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  ClipboardCheck,
  Clock,
  Eraser,
  Loader2,
  Lock,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
} from 'lucide-react';
import type { ChatMessage, Insight } from '../types';
import { useApp } from '../state/AppContext';
import { computePlanHealth, buildInsights } from '../domain/health';
import { eventBrief, localCoachReply } from '../domain/plan';
import { formatDate } from '../domain/dates';
import { PROVIDER_LABELS } from '../state/aiSettings';
import { AiError, generateText } from '../ai/client';
import { buildChatPrompt, chatSystemPrompt } from '../ai/prompts';
import { ProgressRing } from '../components/Charts';
import { Badge, SourceBadge, ViewHeader } from '../components/ui';
import { createId } from '../utils';

const SUGGESTED_PROMPTS = [
  'What should I book next?',
  'Where can I find room in the budget?',
  'Check my guest count against the plan',
  'What accessibility details should I confirm?',
  'Suggest a personal touch for this crowd',
];

const TOOL_CARDS = [
  {
    id: 'concept',
    title: 'Refresh the concept',
    description: 'Generate a new creative direction and personal ideas.',
    icon: Sparkles,
  },
  {
    id: 'budget',
    title: 'Review the budget',
    description: 'Find practical savings and protect your priorities.',
    icon: ClipboardCheck,
  },
  {
    id: 'vendors',
    title: 'Draft a vendor email',
    description: 'Ask the questions that reveal the full cost.',
    icon: Bot,
  },
  {
    id: 'timeline',
    title: 'Check the timeline',
    description: 'See what is next and what is slipping.',
    icon: Clock,
  },
] as const;

const SEVERITY_DOT: Record<Insight['severity'], string> = {
  critical: 'var(--danger)',
  warning: 'var(--gold)',
  good: 'var(--sage)',
  info: 'var(--ink-soft)',
};

export function StudioView() {
  const { event, ai, navigate, toast } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const greeting = localCoachReply(event, 'hello');
    return [
      {
        id: createId('chat'),
        role: 'assistant',
        content: greeting.reply,
        source: 'local',
        createdAt: new Date().toISOString(),
      },
    ];
  });
  const [suggestions, setSuggestions] = useState<string[]>(() => {
    const greeting = localCoachReply(event, 'hello');
    return greeting.followUps;
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mountedRef = useRef(true);

  const health = useMemo(() => computePlanHealth(event), [event]);
  const insights = useMemo(() => buildInsights(event), [event]);
  const brief = useMemo(() => eventBrief(event), [event]);
  const healthColor =
    health.score >= 85 ? 'var(--sage)' : health.score >= 60 ? 'var(--gold)' : 'var(--danger)';

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, busy]);

  async function send(raw: string) {
    const text = raw.trim().slice(0, 600);
    if (!text || busy) return;
    setError(null);
    setInput('');
    const userMessage: ChatMessage = {
      id: createId('chat'),
      role: 'user',
      content: text,
      source: 'local',
      createdAt: new Date().toISOString(),
    };
    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    setMessages((current) => [...current, userMessage]);
    setBusy(true);

    if (!ai.configured) {
      const local = localCoachReply(event, text);
      setMessages((current) => [
        ...current,
        {
          id: createId('chat'),
          role: 'assistant',
          content: local.reply,
          source: 'local',
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestions(local.followUps);
      setBusy(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await generateText({
        settings: ai.settings,
        apiKey: ai.apiKey,
        system: chatSystemPrompt(),
        user: buildChatPrompt(event, history, text),
        signal: controller.signal,
      });
      if (!mountedRef.current) return;
      setMessages((current) => [
        ...current,
        {
          id: createId('chat'),
          role: 'assistant',
          content: reply.slice(0, 4000),
          source: 'ai',
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestions([
        'What should I confirm with the venue?',
        'Where is the plan weakest?',
        'Give me a lower-cost version of one idea',
      ]);
    } catch (requestError) {
      if (!mountedRef.current || (requestError instanceof AiError && requestError.code === 'aborted')) {
        return;
      }
      const local = localCoachReply(event, text);
      setMessages((current) => [
        ...current,
        {
          id: createId('chat'),
          role: 'assistant',
          content: local.reply,
          source: 'local',
          createdAt: new Date().toISOString(),
        },
      ]);
      setSuggestions(local.followUps);
      setError(
        requestError instanceof AiError
          ? `${requestError.message} This answer came from the local coach.`
          : 'The AI request could not be completed. This answer came from the local coach.',
      );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }

  function clearChat() {
    const greeting = localCoachReply(event, 'hello');
    setMessages([
      {
        id: createId('chat'),
        role: 'assistant',
        content: greeting.reply,
        source: 'local',
        createdAt: new Date().toISOString(),
      },
    ]);
    setSuggestions(greeting.followUps);
    setError(null);
    setBusy(false);
    textareaRef.current?.focus();
    toast('Conversation cleared. Your plan is untouched.', 'info');
  }

  return (
    <div className="view studio-view">
      <ViewHeader
        eyebrow="A second brain, on your terms"
        title="AI Studio"
        description="Ask about the plan, pressure-test a decision, or find the next useful step. The local coach always works; a connected provider adds a more conversational second opinion."
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => ai.openSettings()}
            >
              <Settings2 size={16} aria-hidden="true" />
              {ai.configured ? 'AI settings' : 'Connect AI'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={clearChat}>
              <Eraser size={16} aria-hidden="true" /> Clear chat
            </button>
          </>
        }
      />

      <div className="studio-layout">
        <section className="studio-chat panel" aria-labelledby="chat-title">
          <div className="studio-chat-head">
            <div>
              <p className="eyebrow">Planning conversation</p>
              <h2 id="chat-title">What are you weighing?</h2>
            </div>
            <div className="studio-mode">
              <Badge tone={ai.configured ? 'accent' : 'sage'}>
                {ai.configured
                  ? ai.settings.provider === 'local'
                    ? 'Local coach'
                    : PROVIDER_LABELS[ai.settings.provider]
                  : 'Local coach'}
              </Badge>
              <span>{ai.configured ? 'AI available' : 'No network requests'}</span>
            </div>
          </div>

          <div className="studio-context-strip">
            <span>
              <Sparkles size={14} aria-hidden="true" />
              Looking at {event.basics.name}
            </span>
            <span>{formatDate(event.basics.date, { month: 'short', day: 'numeric' })}</span>
            <span>{event.basics.guestCount.toLocaleString('en-US')} guests</span>
            <button
              type="button"
              aria-expanded={briefOpen}
              aria-controls="brief-drawer-panel"
              onClick={() => setBriefOpen((current) => !current)}
            >
              {briefOpen ? 'Hide plan summary' : 'What the coach sees'}
            </button>
          </div>

          {briefOpen && (
            <div id="brief-drawer-panel" className="brief-drawer">
              <div className="brief-drawer-head">
                <strong>Plan summary shared with the coach</strong>
                <span>No guest names, emails, or phone numbers</span>
              </div>
              <pre>{brief}</pre>
            </div>
          )}

          {error && (
            <div className="inline-notice notice-warning studio-error" role="alert">
              <div>{error}</div>
            </div>
          )}

          <div
            className="chat-scroll"
            role="log"
            aria-live="polite"
            aria-label="Planning conversation"
          >
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-message chat-${message.role}`}
              >
                <div className="chat-avatar" aria-hidden="true">
                  {message.role === 'assistant' ? (
                    message.source === 'ai' ? (
                      <Sparkles size={16} />
                    ) : (
                      <WandSparkles size={16} />
                    )
                  ) : (
                    <UserRound size={16} />
                  )}
                </div>
                <div className="chat-bubble">
                  <div className="chat-meta">
                    <strong>{message.role === 'assistant' ? 'Gala' : 'You'}</strong>
                    {message.role === 'assistant' && <SourceBadge source={message.source === 'ai' ? 'ai' : 'local'} />}
                    <time dateTime={message.createdAt}>
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <div className="chat-content">{message.content}</div>
                </div>
              </article>
            ))}
            {busy && (
              <article className="chat-message chat-assistant">
                <div className="chat-avatar" aria-hidden="true">
                  <Loader2 size={16} className="spin" />
                </div>
                <div className="chat-bubble typing-bubble">
                  <span />
                  <span />
                  <span />
                  <span className="sr-only">Gala is thinking</span>
                </div>
              </article>
            )}
            <div ref={endRef} />
          </div>

          <div className="chat-suggestions" aria-label="Suggested questions">
            {suggestions.slice(0, 4).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => void send(suggestion)}
                disabled={busy}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form
            className="chat-composer"
            onSubmit={(submitEvent) => {
              submitEvent.preventDefault();
              void send(input);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask the planning coach
            </label>
            <textarea
              ref={textareaRef}
              id="chat-input"
              className="textarea-control chat-input"
              rows={1}
              value={input}
              maxLength={600}
              placeholder="Ask about the budget, guests, vendors, timeline, or a personal detail…"
              onChange={(changeEvent) => setInput(changeEvent.target.value)}
              onKeyDown={(keyEvent) => {
                if (
                  keyEvent.key === 'Enter' &&
                  !keyEvent.shiftKey &&
                  !keyEvent.nativeEvent.isComposing
                ) {
                  keyEvent.preventDefault();
                  void send(input);
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-primary chat-send"
              disabled={!input.trim() || busy}
            >
              {busy ? (
                <Loader2 size={16} className="spin" aria-hidden="true" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              <span className="sr-only">Send message</span>
            </button>
          </form>
          <p className="chat-disclaimer">
            <Lock size={13} aria-hidden="true" />
            {ai.configured
              ? 'A plan summary is sent directly to your provider when you ask. Never guest contact details or your key.'
              : 'The local coach answers from the plan on this device. Nothing is sent anywhere.'}{' '}
            Estimates and suggestions are a starting point, not professional advice.
          </p>
        </section>

        <aside className="studio-sidebar">
          <section className="panel studio-health" aria-labelledby="studio-health-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Plan confidence</p>
                <h2 id="studio-health-title">{health.label}</h2>
              </div>
              <Badge tone={health.score >= 85 ? 'sage' : health.score >= 60 ? 'gold' : 'danger'}>
                {health.score}/100
              </Badge>
            </div>
            <div className="studio-health-body">
              <ProgressRing value={health.score} label="Plan confidence" size={104} stroke={8} color={healthColor}>
                <strong>{health.score}</strong>
              </ProgressRing>
              <ul className="studio-factors">
                {health.factors.map((factor) => (
                  <li key={factor.id}>
                    <span>{factor.label}</span>
                    <div className="mini-bar">
                      <span style={{ width: `${factor.score}%` }} />
                    </div>
                    <strong>{factor.score}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="panel studio-tools" aria-labelledby="studio-tools-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Shortcuts</p>
                <h2 id="studio-tools-title">Take action</h2>
              </div>
            </div>
            <div className="studio-tool-list">
              {TOOL_CARDS.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    type="button"
                    className="studio-tool"
                    onClick={() => navigate(tool.id)}
                  >
                    <span className="studio-tool-icon" aria-hidden="true">
                      <Icon size={17} />
                    </span>
                    <span>
                      <strong>{tool.title}</strong>
                      <small>{tool.description}</small>
                    </span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel studio-insights" aria-labelledby="studio-insights-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Worth a look</p>
                <h2 id="studio-insights-title">Current signals</h2>
              </div>
            </div>
            <ul>
              {insights.slice(0, 4).map((insight) => (
                <li key={insight.id}>
                  <span className="signal-dot" style={{ background: SEVERITY_DOT[insight.severity] }} />
                  <div>
                    <strong>{insight.title}</strong>
                    <p>{insight.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className={`panel studio-provider${ai.configured ? ' is-connected' : ''}`} aria-labelledby="studio-provider-title">
            <div className="studio-provider-head">
              {ai.configured ? <Sparkles size={18} aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
              <h2 id="studio-provider-title">
                {ai.configured ? 'Provider connected' : 'Private by default'}
              </h2>
            </div>
            <p>
              {ai.configured
                ? `Using ${PROVIDER_LABELS[ai.settings.provider]} with the key stored in this browser. Requests go straight to the provider.`
                : 'The local coach uses deterministic planning rules and your plan data. No account, no network, no key.'}
            </p>
            {!ai.configured && (
              <button type="button" className="btn btn-secondary btn-small" onClick={() => ai.openSettings()}>
                <Settings2 size={14} aria-hidden="true" /> Connect a provider
              </button>
            )}
            <p className="provider-caveat">
              If a provider request is blocked by the browser, the local coach remains available. Teams
              deploying Gala for shared use should add a server-side proxy.
            </p>
          </section>

          <section className="panel studio-suggestions" aria-labelledby="studio-suggestions-title">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Try asking</p>
                <h2 id="studio-suggestions-title">Good places to start</h2>
              </div>
              <Check size={17} aria-hidden="true" />
            </div>
            <ul className="starter-list">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <li key={prompt}>
                  <button type="button" onClick={() => void send(prompt)} disabled={busy}>
                    {prompt}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
