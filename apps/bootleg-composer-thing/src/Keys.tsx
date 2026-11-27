import { useRef, useState } from 'react';
import { noteId, type ComposerState, type Holds, type Send } from './composer';

const WHITES = [0, 2, 4, 5, 7, 9, 11];
const OCTAVES = 2;
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// two octaves and a top C. a held key bends as the finger slides sideways, one key's width a semitone or so, like a
// ribbon; lower on a key plays harder
export function Keys({ st, send, holds }: { st: ComposerState; send: Send; holds: Holds }) {
  const [lit, setLit] = useState<Map<number, number>>(new Map());
  const fingers = useRef(new Map<number, { id: number; key: number; x: number }>());
  const box = useRef<HTMLDivElement>(null);
  const whites = OCTAVES * 7 + 1;

  const keys: { key: number; black: boolean; left: number }[] = [];
  for (let w = 0; w < whites; w++) {
    const o = Math.floor(w / 7);
    const semi = o * 12 + WHITES[w % 7];
    keys.push({ key: semi, black: false, left: w });
    if (w < whites - 1 && [0, 2, 5, 7, 9].includes(WHITES[w % 7])) keys.push({ key: semi + 1, black: true, left: w + 0.68 });
  }

  const down = (key: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect();
    const vel = Math.max(0.35, Math.min(1, 0.4 + ((e.clientY - r.top) / r.height) * 0.6));
    const id = noteId();
    fingers.current.set(e.pointerId, { id, key, x: e.clientX });
    send({ cmd: 'on', id, key, vel });
    holds.down(id);
    setLit(m => new Map(m).set(e.pointerId, key));
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fingers.current.get(e.pointerId);
    if (!f || !st.bends || !box.current) return;
    const whiteW = box.current.clientWidth / whites;
    const semis = ((e.clientX - f.x) * 12) / (7 * whiteW);
    holds.slide(f.id, Math.round(semis * 20) / 20);
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fingers.current.get(e.pointerId);
    if (!f) return;
    fingers.current.delete(e.pointerId);
    holds.up(f.id);
    setLit(m => {
      const n = new Map(m);
      n.delete(e.pointerId);
      return n;
    });
  };
  const on = new Set(lit.values());
  const base = 12 * (5 + st.octave); // midi number of the keys' C: middle C (60) at octave 0

  return (
    <div ref={box} className="relative h-full w-full touch-none select-none p-2">
      {keys.map(k => {
        const w = 100 / whites;
        const style = k.black
          ? { left: `${k.left * w}%`, width: `${w * 0.64}%`, height: '58%', top: 0 }
          : { left: `${k.left * w}%`, width: `${w}%`, height: '100%', top: 0 };
        return (
          <div
            key={k.key}
            data-key={k.key}
            onPointerDown={down(k.key)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            style={style}
            className={`absolute flex items-end justify-center rounded-b-lg border pb-2 text-xs ${
              k.black
                ? `z-10 border-bg ${on.has(k.key) ? 'bg-accent' : 'bg-[#0a0c12]'} text-faint`
                : `border-line ${on.has(k.key) ? 'bg-accent/70' : 'bg-[#d9dcea]'} text-[#4a5070]`
            }`}>
            {!k.black && k.key % 12 === 0 ? `${NAMES[0]}${(base + k.key) / 12 - 1}` : ''}
          </div>
        );
      })}
    </div>
  );
}
