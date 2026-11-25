import { useEffect, useState } from 'react';
import type { WireFrame } from './bridge';
import type { Meta } from './audio';
import { PackViz } from './PackViz';
import type { PackInfo } from './packs';
import { Btn } from './ui';

export function VizPage({
  pack,
  packs,
  setPack,
  frame,
  meta,
  duration,
  playing,
  toggle,
  back,
  listOpen,
  setListOpen,
}: {
  pack: PackInfo | undefined;
  packs: PackInfo[];
  setPack: (id: string) => void;
  frame: React.RefObject<{ f: WireFrame; at: number } | null>;
  meta: Meta;
  duration: number;
  playing: boolean;
  toggle: () => void;
  back: () => void;
  listOpen: boolean;
  setListOpen: (v: boolean) => void;
}) {
  const [ui, setUi] = useState(true);
  const [poke, setPoke] = useState(0);

  // controls fade after a few seconds so the visuals get the whole screen; any touch brings them back
  useEffect(() => {
    if (!ui || listOpen) return;
    const t = setTimeout(() => setUi(false), 5000);
    return () => clearTimeout(t);
  }, [ui, poke, listOpen]);

  const step = (by: number) => {
    if (!packs.length || !pack) return;
    setPack(packs[(packs.indexOf(pack) + by + packs.length) % packs.length].id);
    setPoke(n => n + 1);
  };

  return (
    <div className="absolute inset-0 bg-black" onPointerDown={() => (setUi(true), setPoke(n => n + 1))}>
      {pack ? (
        <PackViz pack={pack} frame={frame} meta={meta} duration={duration} />
      ) : (
        <div className="grid h-full place-items-center text-muted">no visualizers bundled</div>
      )}
      {/* a transparent layer keeps touches from being swallowed by the frame */}
      <div className="absolute inset-0" />

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/85 to-transparent px-4 pt-8 pb-3 transition-opacity ${ui ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
        <Btn icon="back" className="w-20 bg-bg/70" onClick={back} />
        <Btn icon="prev" className="w-20 bg-bg/70" onClick={() => step(-1)} />
        <button
          onClick={() => setListOpen(true)}
          className="h-16 min-w-0 flex-1 truncate rounded-xl border border-line bg-bg/70 px-4 text-lg active:bg-hover">
          {pack?.name ?? 'Visualizer'}
        </button>
        <Btn icon="next" className="w-20 bg-bg/70" onClick={() => step(1)} />
        <Btn icon={playing ? 'pause' : 'play'} className="w-20 bg-bg/70" onClick={toggle} />
      </div>

      {listOpen ? (
        <div className="absolute inset-0 flex flex-col bg-bg/95">
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <Btn icon="back" className="w-20" onClick={() => setListOpen(false)} />
            <div className="text-xl font-semibold">Visualizers</div>
            <div className="text-sm text-faint">{packs.length}</div>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-4 pb-4">
            {packs.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setPack(p.id);
                  setListOpen(false);
                }}
                className={`flex h-16 items-center justify-between gap-2 rounded-xl border px-4 text-left text-lg active:bg-hover ${
                  p.id === pack?.id ? 'border-[#3a4590] bg-on text-accent' : 'border-line bg-panel'
                }`}>
                <span className="truncate">{p.name}</span>
                {p.usesStems ? <span className="text-xs text-faint">stems</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
