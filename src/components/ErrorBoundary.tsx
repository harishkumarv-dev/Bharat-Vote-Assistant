import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * A last-resort boundary. It deliberately avoids showing stack traces or any
 * plan data on screen, and offers a reload instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the console only; never surface user data in the UI.
    console.error('Gala UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="crash-screen" role="alert">
        <div className="crash-card">
          <span className="crash-icon" aria-hidden="true">
            <ShieldAlert size={28} />
          </span>
          <p className="eyebrow">Something unexpected happened</p>
          <h1>The studio needs a refresh.</h1>
          <p>
            Your plans are saved in this browser. Reloading should bring you straight back. If the
            problem continues, export any data you can from a fresh session before clearing browser
            storage.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            <RefreshCw size={16} aria-hidden="true" /> Reload Gala
          </button>
        </div>
      </div>
    );
  }
}
