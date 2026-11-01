import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  DatabaseBackup,
  Printer,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import type { AiSettings, EventBasics, EventDraft, ViewId } from './types';
import { VIEW_IDS } from './types';
import { usePlanner } from './state/usePlanner';
import { AppProvider, type ToastTone } from './state/AppContext';
import {
  aiIsConfigured,
  clearApiKey,
  loadAiSettings,
  loadApiKey,
  saveAiSettings,
  saveApiKey,
} from './state/aiSettings';
import { emptyWorkspace, initialWorkspace } from './domain/factory';
import { AppHeader } from './components/AppHeader';
import { Onboarding } from './components/Onboarding';
import { EventWizard } from './components/EventWizard';
import { AiSettingsModal } from './components/AiSettingsModal';
import { EditEventModal } from './components/EditEventModal';
import { EditBriefModal } from './components/EditBriefModal';
import { WorkspaceDataModal } from './components/WorkspaceDataModal';
import { GalaMark, Wordmark } from './components/Brand';
import { ToastViewport, type ToastState } from './components/Toast';
import { OverviewView } from './views/OverviewView';
import { ConceptView } from './views/ConceptView';
import { BudgetView } from './views/BudgetView';
import { GuestsView } from './views/GuestsView';
import { VendorsView } from './views/VendorsView';
import { TimelineView } from './views/TimelineView';
import { StudioView } from './views/StudioView';

const VIEW_TITLES: Record<ViewId, string> = {
  overview: 'Overview',
  concept: 'Concept',
  budget: 'Budget',
  guests: 'Guests',
  vendors: 'Vendors',
  timeline: 'Timeline',
  studio: 'AI Studio',
};

function viewFromHash(): ViewId {
  const hash = window.location.hash.replace('#', '');
  return VIEW_IDS.includes(hash as ViewId) ? (hash as ViewId) : 'overview';
}

function keyStores() {
  return { local: window.localStorage, session: window.sessionStorage };
}

export function App() {
  const { workspace, activeEvent, dispatch, loadError, saveError } = usePlanner();
  const [view, setView] = useState<ViewId>(viewFromHash);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editBriefOpen, setEditBriefOpen] = useState(false);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [ai, setAi] = useState<{ settings: AiSettings; apiKey: string }>(() => {
    const settings = loadAiSettings(window.localStorage);
    return { settings, apiKey: loadApiKey(keyStores(), settings) };
  });
  const mainRef = useRef<HTMLElement>(null);
  const firstViewRender = useRef(true);
  const startupNoticeShown = useRef(false);

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    setToastState({ id: Date.now() + Math.random(), message, tone });
  }, []);

  const dismissToast = useCallback(() => setToastState(null), []);

  const navigate = useCallback((next: ViewId) => {
    setView(next);
    if (window.location.hash !== `#${next}`) {
      window.location.hash = next;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const aiConfigured = aiIsConfigured(ai.settings, ai.apiKey);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (loadError && !startupNoticeShown.current) {
      startupNoticeShown.current = true;
      notify(loadError, 'error');
    }
  }, [loadError, notify]);

  useEffect(() => {
    const eventTitle = activeEvent?.basics.name ?? 'Plan the moment';
    document.title = `${eventTitle} · ${VIEW_TITLES[view]} · Gala`;
  }, [activeEvent, view]);

  useEffect(() => {
    if (firstViewRender.current) {
      firstViewRender.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [view, activeEvent?.id]);

  function saveSettings(settings: AiSettings, key: string) {
    saveAiSettings(window.localStorage, settings);
    saveApiKey(keyStores(), key, settings.rememberKey);
    setAi({ settings, apiKey: key });
    notify(
      settings.provider === 'local'
        ? 'Local mode selected. No requests will leave this device.'
        : 'AI settings saved in this browser.',
      'success',
    );
  }

  function removeSavedKey() {
    clearApiKey(keyStores());
    setAi((current) => ({ ...current, apiKey: '' }));
    notify('Saved API key removed from this browser.', 'info');
  }

  function openSettings() {
    setSettingsOpen(true);
  }

  function createEventFromDraft(draft: EventDraft) {
    dispatch({ type: 'CREATE_EVENT', draft });
    setNewEventOpen(false);
    setView('overview');
    window.location.hash = 'overview';
    notify('Your first draft is ready. Everything is saved locally.', 'success');
  }

  function startSample() {
    dispatch({ type: 'REPLACE_WORKSPACE', workspace: initialWorkspace() });
    setView('overview');
    window.location.hash = 'overview';
    notify('Sample wedding loaded. Explore freely — your own plan can start fresh anytime.', 'success');
  }

  function startNewEvent() {
    if (workspace.events.length >= 12) {
      notify('Gala can hold up to 12 events in one workspace. Export a backup and reset to start over.', 'info');
      return;
    }
    setNewEventOpen(true);
  }

  const settingsModal = (
    <AiSettingsModal
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      settings={ai.settings}
      apiKey={ai.apiKey}
      onSave={saveSettings}
      onClearKey={removeSavedKey}
    />
  );

  const toasts = (
    <ToastViewport toast={toastState} onDismiss={dismissToast} />
  );

  if (!activeEvent) {
    return (
      <>
        <Onboarding
          aiConfigured={aiConfigured}
          onCreate={createEventFromDraft}
          onSample={startSample}
          onOpenSettings={openSettings}
        />
        {settingsModal}
        {toasts}
      </>
    );
  }

  if (newEventOpen) {
    return (
      <div className="wizard-screen">
        <header className="wizard-screen-header">
          <div className="brand">
            <GalaMark />
            <Wordmark />
          </div>
          <span className="local-pill">
            <ShieldCheck size={15} aria-hidden="true" /> One workspace, {workspace.events.length}{' '}
            event{workspace.events.length === 1 ? '' : 's'}
          </span>
        </header>
        <main className="wizard-screen-main">
          <EventWizard
            initialType="wedding"
            onCancel={() => setNewEventOpen(false)}
            onCreate={createEventFromDraft}
          />
        </main>
        {settingsModal}
        {toasts}
      </div>
    );
  }

  const contextValue = {
    event: activeEvent,
    dispatch,
    navigate,
    toast: notify,
    ai: {
      settings: ai.settings,
      apiKey: ai.apiKey,
      configured: aiConfigured,
      openSettings,
    },
  };

  return (
    <AppProvider value={contextValue}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <AppHeader
        events={workspace.events}
        event={activeEvent}
        view={view}
        onNavigate={navigate}
        onSelectEvent={(id) => {
          dispatch({ type: 'SELECT_EVENT', eventId: id });
          setView('overview');
          window.location.hash = 'overview';
        }}
        onNewEvent={startNewEvent}
        onEditEvent={() => setEditEventOpen(true)}
        onOpenSettings={openSettings}
        aiConfigured={aiConfigured}
      />

      {(loadError || saveError) && (
        <div className="app-notices" role="status">
          {loadError && (
            <div className="inline-notice notice-warning">
              <div>
                <strong>Your saved data could not be fully restored</strong>
                <p>{loadError}</p>
              </div>
            </div>
          )}
          {saveError && (
            <div className="inline-notice notice-danger">
              <div>
                <strong>Changes may not be saving</strong>
                <p>{saveError} Export a backup from the footer if this continues.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <main id="main-content" className="app-main" ref={mainRef} tabIndex={-1}>
        {view === 'overview' && <OverviewView onEditEvent={() => setEditEventOpen(true)} />}
        {view === 'concept' && <ConceptView onEditBrief={() => setEditBriefOpen(true)} />}
        {view === 'budget' && <BudgetView onEditEvent={() => setEditEventOpen(true)} />}
        {view === 'guests' && <GuestsView />}
        {view === 'vendors' && <VendorsView />}
        {view === 'timeline' && <TimelineView />}
        {view === 'studio' && <StudioView />}
      </main>

      <footer className="app-footer">
        <div className="app-footer-brand">
          <span className="footer-mark" aria-hidden="true">
            gala
          </span>
          <span>Plan the moment. We’ll hold the details.</span>
        </div>
        <div className="footer-local">
          <ShieldCheck size={14} aria-hidden="true" /> Local-first · autosaved in this browser
        </div>
        <div className="app-footer-actions">
          <button type="button" className="footer-button" onClick={() => setDataOpen(true)}>
            <DatabaseBackup size={14} aria-hidden="true" /> Data & backups
          </button>
          <button type="button" className="footer-button" onClick={openSettings}>
            <Settings2 size={14} aria-hidden="true" /> AI & privacy
          </button>
          <button type="button" className="footer-button" onClick={() => window.print()}>
            <Printer size={14} aria-hidden="true" /> Print view
          </button>
          <button
            type="button"
            className="footer-button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <ArrowUp size={14} aria-hidden="true" /> Top
          </button>
        </div>
      </footer>

      {settingsModal}
      <WorkspaceDataModal
        open={dataOpen}
        onClose={() => setDataOpen(false)}
        workspace={workspace}
        toast={notify}
        onReplace={(next) => {
          dispatch({ type: 'REPLACE_WORKSPACE', workspace: next });
          setView('overview');
          window.location.hash = 'overview';
        }}
        onReset={() => {
          dispatch({ type: 'REPLACE_WORKSPACE', workspace: emptyWorkspace() });
          setView('overview');
          window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }}
      />
      <EditEventModal
        open={editEventOpen}
        onClose={() => setEditEventOpen(false)}
        event={activeEvent}
        onSave={(patch: Partial<EventBasics>) => {
          const dateChanged = Boolean(patch.date && patch.date !== activeEvent.basics.date);
          dispatch({ type: 'UPDATE_BASICS', patch });
          notify(
            dateChanged
              ? 'Event details updated. Incomplete milestones moved with the new date.'
              : 'Event details updated.',
            'success',
          );
        }}
        onDelete={() => {
          const deletedName = activeEvent.basics.name;
          dispatch({ type: 'DELETE_EVENT', eventId: activeEvent.id });
          setEditEventOpen(false);
          setView('overview');
          notify(`${deletedName} was removed from this workspace.`, 'info');
        }}
      />
      <EditBriefModal
        open={editBriefOpen}
        onClose={() => setEditBriefOpen(false)}
        event={activeEvent}
        onSave={(vibe) => {
          dispatch({ type: 'UPDATE_VIBE', patch: vibe });
          notify('Brief saved. Refresh the concept when you want the ideas to catch up.', 'success');
        }}
      />
      {toasts}
    </AppProvider>
  );
}
