import { useEffect, useRef } from 'react';
import type { BootlegState, Cmd } from './bridge';
import { Btn } from './ui';

export function StemsPage({
  st,
  sel,
  setSel,
  send,
  back,
}: {
  st: BootlegState;
  sel: number;
  setSel: (i: number) => void;
  send: (c: Cmd) => void;
  back: () => void;
}) {
  const rows = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => rows.current[sel]?.scrollIntoView({ block: 'nearest' }), [sel]);

  return (
    <div className="flex h-[440px] flex-col gap-3 px-5 pt-2">
      <div className="flex items-center gap-4">
        <Btn icon="back" label="Back" className="w-32" onClick={back} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-2xl font-semibold">{st.track?.title}</div>
          <div className="text-sm text-faint">
            {st.stems.length} stems · tap M to mute, S to solo · dial selects, click mutes
          </div>
        </div>
      </div>
      <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto pb-4">
        {st.stems.map((s, i) => (
          <div
            key={s.name}
            ref={el => {
              rows.current[i] = el;
            }}
            onClick={() => setSel(i)}
            className={`flex h-16 items-center gap-2 rounded-xl border pr-1 pl-4 ${
              i === sel ? 'border-[#3a4590] bg-on' : 'border-line bg-panel'
            } ${s.mute ? 'opacity-50' : ''}`}>
            <div className="min-w-0 flex-1">
              <div className="truncate text-lg">{s.name}</div>
              <div className="truncate text-xs text-faint">{s.role}</div>
            </div>
            <Toggle on={s.mute} tone="bad" onClick={() => send({ cmd: 'stemMute', name: s.name })}>
              M
            </Toggle>
            <Toggle on={s.solo} tone="accent" onClick={() => send({ cmd: 'stemSolo', name: s.name })}>
              S
            </Toggle>
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  on,
  tone,
  children,
  onClick,
}: {
  on: boolean;
  tone: 'bad' | 'accent';
  children: React.ReactNode;
  onClick: () => void;
}) {
  const active = tone === 'bad' ? 'border-bad bg-bad text-bg' : 'border-accent bg-accent text-bg';
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className={`h-14 w-14 rounded-xl border text-lg font-semibold transition active:scale-95 ${
        on ? active : 'border-line bg-panel2 text-muted'
      }`}>
      {children}
    </button>
  );
}
