import { useEffect, useRef, useState } from 'react';
import type { Send } from './composer';
import { Btn } from './ui';

const N = 128;
const SHAPES: Record<string, (x: number) => number> = {
  sine: x => Math.sin(x * Math.PI * 2),
  saw: x => 1 - 2 * x,
  square: x => (x < 0.5 ? 0.8 : -0.8),
  organ: x => (Math.sin(x * Math.PI * 2) + 0.5 * Math.sin(x * Math.PI * 4) + 0.33 * Math.sin(x * Math.PI * 6)) / 1.5,
};

// one cycle of a wave, drawn left to right with a finger; "play it" turns it into a sample in Composer and goes to
// the keys to play it
export function Draw({ send, onDone }: { send: Send; onDone: () => void }) {
  const [pts, setPts] = useState<number[]>(() => Array.from({ length: N }, (_, i) => SHAPES.sine(i / N)));
  const cv = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ i: number; v: number } | null>(null);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const { width: w, height: h } = c;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#272d42';
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    g.strokeStyle = '#7c8cff';
    g.lineWidth = 4;
    g.beginPath();
    pts.forEach((v, i) => {
      const x = (i / (N - 1)) * w;
      const y = h / 2 - v * (h / 2 - 8);
      if (i) g.lineTo(x, y);
      else g.moveTo(x, y);
    });
    g.stroke();
  }, [pts]);

  const at = (e: React.PointerEvent<HTMLElement>) => {
    const r = cv.current!.getBoundingClientRect();
    const i = Math.max(0, Math.min(N - 1, Math.round(((e.clientX - r.left) / r.width) * (N - 1))));
    const v = Math.max(-1, Math.min(1, 1 - ((e.clientY - r.top) / r.height) * 2));
    return { i, v };
  };
  const paint = (p: { i: number; v: number }) => {
    const from = last.current ?? p;
    setPts(prev => {
      const next = prev.slice();
      const [a, b] = from.i <= p.i ? [from, p] : [p, from];
      for (let i = a.i; i <= b.i; i++) next[i] = b.i === a.i ? p.v : a.v + ((b.v - a.v) * (i - a.i)) / (b.i - a.i);
      return next;
    });
    last.current = p;
  };

  return (
    <div className="flex h-full flex-col gap-2 p-2">
      {/* touches land on the area around the canvas too (its rounded corners would refuse them), clamped to it */}
      <div
        className="min-h-0 flex-1 touch-none"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture(e.pointerId);
          last.current = null;
          paint(at(e));
        }}
        onPointerMove={e => e.buttons && paint(at(e))}
        onPointerUp={() => (last.current = null)}>
        <canvas ref={cv} width={784} height={300} className="pointer-events-none h-full w-full rounded-xl border border-line bg-panel" />
      </div>
      <div className="flex gap-2">
        {Object.entries(SHAPES).map(([name, f]) => (
          <Btn key={name} label={name} className="flex-1" onClick={() => setPts(Array.from({ length: N }, (_, i) => f(i / N)))} />
        ))}
        <Btn
          label="play it"
          on
          className="flex-[1.6]"
          onClick={() => {
            send({ cmd: 'wave', points: pts.map(v => Math.round(v * 1000) / 1000) });
            onDone();
          }}
        />
      </div>
    </div>
  );
}
