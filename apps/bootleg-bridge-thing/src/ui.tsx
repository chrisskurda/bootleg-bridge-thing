import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  play: <path d="M8 5v14l11-7z" />,
  pause: <path d="M6 5h4v14H6zM14 5h4v14h-4z" />,
  next: <path d="M6 5v14l9-7zM17 5h2v14h-2z" />,
  prev: <path d="M18 5v14l-9-7zM5 5h2v14H5z" />,
  shuffle: (
    <path d="M16 3h5v5l-1.8-1.8L4 21.4 2.6 20 17.8 4.8zM3 4.4 4.4 3l5 5-1.4 1.4zM15 15l1.4-1.4 3.8 3.8L21 16v5h-5l1.8-1.8z" />
  ),
  repeat: <path d="M7 7h10v3l4-4-4-4v3H5v6h2zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2z" />,
  one: <path d="M11 9h2v6h-1.5v-4.4L10 11V9.6z" />,
  viz: <path d="M4 14h3v6H4zm5-6h3v12H9zm5 3h3v9h-3zm5-7h3v16h-3z" />,
  stems: <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3zM8 4h2v6H8zm7 5h2v6h-2zM6 14h2v6H6z" />,
  back: <path d="M15 5l-7 7 7 7-1.5 1.5L5 12l8.5-8.5z" />,
  minus: <path d="M5 11h14v2H5z" />,
  plus: <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" />,
  list: <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />,
};

export function Icon({ name, size = 28 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      {paths[name]}
    </svg>
  );
}

// every control is at least 64px tall: this is a thumb on a small screen, not a pointer
export function Btn({
  icon,
  label,
  on,
  onClick,
  className = '',
}: {
  icon?: keyof typeof paths;
  label?: string;
  on?: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-16 items-center justify-center gap-2 rounded-xl border text-lg transition active:scale-95 ${
        on ? 'border-[#3a4590] bg-on text-accent' : 'border-line bg-panel2 text-ink active:bg-hover'
      } ${className}`}>
      {icon ? <Icon name={icon} /> : null}
      {label ? <span>{label}</span> : null}
    </button>
  );
}

export function Pill({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'bad' }) {
  const c = tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-muted';
  return <span className={`rounded-full bg-panel2 px-3 py-1 text-sm ${c}`}>{children}</span>;
}
