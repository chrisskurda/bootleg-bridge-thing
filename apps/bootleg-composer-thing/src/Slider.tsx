import { useRef, useState } from 'react';

// a fat horizontal slider: the whole 56px-tall row is the touch target, the visible track is slim.
// onCommit fires on release; with `live` it also fires while dragging (throttled), for things like volume.
export function Slider({
  value,
  onCommit,
  live = false,
  className = '',
}: {
  value: number;
  onCommit: (v: number) => void;
  live?: boolean;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const sent = useRef(0);

  const at = (e: React.PointerEvent) => {
    const r = el.current!.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  const move = (e: React.PointerEvent) => {
    if (drag === null) return;
    const v = at(e);
    setDrag(v);
    const now = performance.now();
    if (live && now - sent.current > 80) {
      sent.current = now;
      onCommit(v);
    }
  };

  const shown = drag ?? value;
  return (
    <div
      ref={el}
      className={`relative flex h-14 cursor-pointer touch-none items-center ${className}`}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag(at(e));
      }}
      onPointerMove={move}
      onPointerUp={e => {
        if (drag === null) return;
        onCommit(at(e));
        setDrag(null);
      }}
      onPointerCancel={() => setDrag(null)}>
      <div className="h-3 w-full overflow-hidden rounded-full bg-panel2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${shown * 100}%` }} />
      </div>
      <div
        className="absolute h-7 w-7 -translate-x-1/2 rounded-full border-2 border-bg bg-ink"
        style={{ left: `${shown * 100}%` }}
      />
    </div>
  );
}
