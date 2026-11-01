import type { ReactNode } from 'react';
import { Sparkles, WandSparkles } from 'lucide-react';

export function ViewHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="view-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="view-description">{description}</p>}
      </div>
      {actions && <div className="view-actions">{actions}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'sage' | 'gold' | 'danger' | 'ink';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ProgressBar({
  value,
  label,
  tone = 'sage',
  showValue = true,
}: {
  value: number;
  label: string;
  tone?: 'sage' | 'accent' | 'gold' | 'danger';
  showValue?: boolean;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="progress-wrap">
      <div
        className="progress-bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
      >
        <span className={`progress-fill progress-${tone}`} style={{ width: `${safe}%` }} />
      </div>
      {showValue && <span className="progress-value">{safe}%</span>}
    </div>
  );
}

export function ToggleChip({
  active,
  onClick,
  children,
  disabled,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      className={`toggle-chip${active ? ' is-active' : ''}`}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

export function SourceBadge({ source }: { source: 'local' | 'ai' }) {
  return (
    <span className={`source-badge source-${source}`}>
      {source === 'ai' ? (
        <Sparkles size={13} aria-hidden="true" />
      ) : (
        <WandSparkles size={13} aria-hidden="true" />
      )}
      {source === 'ai' ? 'AI-generated' : 'Local plan'}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`inline-notice notice-${tone}`}>
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
      {action}
    </div>
  );
}
