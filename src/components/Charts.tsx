import type { ReactNode } from 'react';

export function ProgressRing({
  value,
  label,
  size = 132,
  stroke = 9,
  color = 'var(--sage)',
  children,
}: {
  value: number;
  label: string;
  size?: number;
  stroke?: number;
  color?: string;
  children?: ReactNode;
}) {
  const safe = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="progress-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${safe} out of 100`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${safe} ${100 - safe}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="progress-ring-center">{children ?? <strong>{safe}</strong>}</div>
    </div>
  );
}

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  label,
  size = 190,
  thickness = 11,
  children,
}: {
  segments: DonutSegment[];
  label: string;
  size?: number;
  thickness?: number;
  children?: ReactNode;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  let offset = 0;
  return (
    <div
      className="donut-chart"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${Math.round(segment.value)}`).join(', ')}`}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((segment) => {
            const percent = (Math.max(0, segment.value) / total) * 100;
            const dash = Math.max(0, percent - 0.8);
            const circle = (
              <circle
                key={segment.label}
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={segment.color}
                strokeWidth={thickness}
                pathLength="100"
                strokeDasharray={`${dash} ${100 - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 50 50)"
              />
            );
            offset += percent;
            return circle;
          })}
      </svg>
      <div className="donut-center">{children}</div>
    </div>
  );
}
