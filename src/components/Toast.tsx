import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastTone } from '../state/AppContext';

export interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export function ToastViewport({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const Icon = ICONS[toast.tone];

  return (
    <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
      <div className={`toast toast-${toast.tone}`}>
        <Icon size={18} aria-hidden="true" />
        <span>{toast.message}</span>
        <button type="button" className="toast-close" onClick={onDismiss} aria-label="Dismiss message">
          <X size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
