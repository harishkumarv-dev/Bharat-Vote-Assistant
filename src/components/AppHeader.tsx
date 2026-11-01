import {
  CalendarDays,
  ChevronDown,
  House,
  Palette,
  PencilLine,
  Plus,
  Settings2,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import type { EventPlan, ViewId } from '../types';
import { VIEW_IDS } from '../types';
import { EVENT_TYPE_META } from '../domain/catalog';
import { formatDateShort } from '../domain/dates';
import { GalaMark, Wordmark } from './Brand';

const NAV_ITEMS: Array<{ id: ViewId; label: string; icon: typeof House }> = [
  { id: 'overview', label: 'Overview', icon: House },
  { id: 'concept', label: 'Concept', icon: Palette },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'guests', label: 'Guests', icon: Users },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'studio', label: 'AI Studio', icon: Sparkles },
];

interface Props {
  events: EventPlan[];
  event: EventPlan;
  view: ViewId;
  onNavigate: (view: ViewId) => void;
  onSelectEvent: (id: string) => void;
  onNewEvent: () => void;
  onEditEvent: () => void;
  onOpenSettings: () => void;
  aiConfigured: boolean;
}

export function AppHeader({
  events,
  event,
  view,
  onNavigate,
  onSelectEvent,
  onNewEvent,
  onEditEvent,
  onOpenSettings,
  aiConfigured,
}: Props) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <button
          type="button"
          className="brand brand-button"
          onClick={() => onNavigate('overview')}
          aria-label="Gala home — overview"
        >
          <GalaMark />
          <Wordmark />
        </button>

        <div className="event-switcher">
          <span className={`event-type-dot event-type-${event.type}`} aria-hidden="true" />
          <label htmlFor="event-switcher-select" className="sr-only">
            Switch event
          </label>
          <div className="event-switcher-select-wrap">
            <select
              id="event-switcher-select"
              className="event-switcher-select"
              value={event.id}
              onChange={(changeEvent) => {
                if (changeEvent.target.value === '__new__') onNewEvent();
                else onSelectEvent(changeEvent.target.value);
              }}
            >
              {events.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.basics.name}
                </option>
              ))}
              <option value="__new__">＋ New event…</option>
            </select>
            <ChevronDown size={15} className="event-switcher-chevron" aria-hidden="true" />
          </div>
          <span className="event-switcher-meta">
            {EVENT_TYPE_META[event.type].shortLabel} · {formatDateShort(event.basics.date)}
          </span>
        </div>

        <div className="header-actions">
          <span className="saved-pill" title="Saved automatically in this browser">
            <span className="saved-dot" aria-hidden="true" />
            Saved locally
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={onEditEvent}
            aria-label="Edit event details"
            title="Edit event details"
          >
            <PencilLine size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onOpenSettings}
            aria-label="AI and privacy settings"
            title="AI and privacy settings"
          >
            <Settings2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav className="main-nav" aria-label="Plan sections">
        <div className="nav-scroller">
          {NAV_ITEMS.filter((item) => VIEW_IDS.includes(item.id)).map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item${active ? ' is-active' : ''}${
                  item.id === 'studio' ? ' nav-item-ai' : ''
                }`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon size={16} aria-hidden="true" />
                {item.label}
                {item.id === 'studio' && aiConfigured && (
                  <span className="nav-ai-dot" role="status" aria-label="AI connected" />
                )}
              </button>
            );
          })}
          <button type="button" className="nav-item nav-item-new" onClick={onNewEvent}>
            <Plus size={16} aria-hidden="true" />
            New
          </button>
        </div>
      </nav>
    </header>
  );
}
