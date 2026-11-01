export function GalaMark({ size = 38 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Gala"
      className="gala-mark"
    >
      <rect width="64" height="64" rx="16" fill="currentColor" />
      <path
        d="M17 47V31.5C17 22.94 23.94 16 32.5 16S48 22.94 48 31.5V34"
        fill="none"
        stroke="#F6F1E8"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M17 47h17"
        fill="none"
        stroke="#F6F1E8"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <path
        d="M45.5 43.5c.5 2.4 2.1 4 4.5 4.5-2.4.5-4 2.1-4.5 4.5-.5-2.4-2.1-4-4.5-4.5 2.4-.5 4-2.1 4.5-4.5Z"
        fill="var(--accent)"
      />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <span className="wordmark-main">gala</span>
      <span className="wordmark-sub">studio</span>
    </span>
  );
}
