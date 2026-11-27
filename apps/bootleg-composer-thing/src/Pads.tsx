import { useRef, useState } from 'react';
import { noteId, type ComposerState, type Holds, type Send } from './composer';

// 4x4 pads; where a pad is hit sets how hard (the top edge is loudest), and the knob bends what is held
export function Pads({ st, send, holds }: { st: ComposerState; send: Send; holds: Holds }) {
  const [lit, setLit] = useState<Set<number>>(new Set());
  const fingers = useRef(new Map<number, { id: number; pad: number }>());

  const light = (pad: number, on: boolean) =>
    setLit(prev => {
      const next = new Set(prev);
      if (on) next.add(pad);
      else next.delete(pad);
      return next;
    });

  const down = (pad: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const vel = Math.max(0.3, Math.min(1, 1 - ((e.clientY - r.top) / r.height) * 0.7));
    const id = noteId();
    fingers.current.set(e.pointerId, { id, pad });
    send({ cmd: 'on', id, pad, vel });
    holds.down(id);
    light(pad, true);
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fingers.current.get(e.pointerId);
    if (!f) return;
    fingers.current.delete(e.pointerId);
    holds.up(f.id);
    light(f.pad, false);
  };

  return (
    <div className="grid h-full grid-cols-4 grid-rows-4 gap-2 p-2">
      {Array.from({ length: 16 }, (_, i) => {
        // pad 0 bottom left, as on a drum machine
        const pad = (3 - Math.floor(i / 4)) * 4 + (i % 4);
        const name = st.pads[pad];
        return (
          <div
            key={pad}
            data-pad={pad}
            onPointerDown={name !== null ? down(pad) : undefined}
            onPointerUp={up}
            onPointerCancel={up}
            className={`flex touch-none items-end rounded-xl border p-2 text-sm leading-tight ${
              name === null
                ? 'border-line bg-panel text-faint'
                : lit.has(pad)
                  ? 'border-accent bg-on text-ink'
                  : 'border-line bg-panel2 text-muted'
            }`}>
            <span className="line-clamp-2 break-all">{name ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}
