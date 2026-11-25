import { BridgethingClient, type ConnectionState } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BootlegState, Cmd, Frame } from './bridge';
import { daemonUrl } from './daemon';
import { Viz } from './Viz';

type View = 'now' | 'viz' | 'stems';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: daemonUrl() }), []);
  const [conn, setConn] = useState<ConnectionState>(client.connectionState);
  const [fwd, setFwd] = useState<boolean | null>(null);
  const [up, setUp] = useState(false);
  const [st, setSt] = useState<BootlegState | null>(null);
  const [cover, setCover] = useState<{ id: string | null; data: string | null } | null>(null);
  const [view, setView] = useState<View>('now');
  const [sel, setSel] = useState(0);
  const [, tick] = useState(0);
  const at = useRef(0);
  const frame = useRef<Frame | null>(null);
  const stRef = useRef(st);
  stRef.current = st;

  const send = useCallback((c: Cmd) => void client.forward.json(c), [client]);

  useEffect(() => {
    const offConn = client.on(e => {
      if (e.type === 'open' || e.type === 'close' || e.type === 'connecting') setConn(client.connectionState);
    });
    client.capabilities.get().then(r => setFwd(r.ok && r.response.capabilities.available.forward));
    const offMsg = client.forward.onJson(raw => {
      const m = raw as { type?: string };
      if (m.type === 'state') {
        at.current = performance.now();
        setSt(m as BootlegState);
      } else if (m.type === 'frame') frame.current = m as Frame;
      else if (m.type === 'cover') setCover(m as { id: string | null; data: string | null });
      else if (m.type === 'link') {
        setUp((m as { up: boolean }).up);
        if (!(m as { up: boolean }).up) setSt(null);
      }
    });
    return () => {
      offConn();
      offMsg();
    };
  }, [client]);

  // the playhead advances locally between state pushes
  useEffect(() => {
    const t = setInterval(() => tick(n => n + 1), 250);
    return () => clearInterval(t);
  }, []);

  // spectrum frames only flow while the visualizer is on screen
  useEffect(() => {
    if (!up) return;
    send({ cmd: 'frames', on: view === 'viz' });
    if (view !== 'viz') frame.current = null;
  }, [up, view, send]);

  const stems = st?.stems ?? [];
  const views: View[] = stems.length ? ['now', 'viz', 'stems'] : ['now', 'viz'];
  const nextView = useCallback(() => setView(v => views[(views.indexOf(v) + 1) % views.length] ?? 'now'), [views.length]);

  useEffect(() => {
    if (view === 'stems' && !stems.length) setView('now');
  }, [view, stems.length]);

  // dial: volume by default, selection on the stems page
  const wheel = useRef(0);
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      wheel.current += e.deltaX || e.deltaY;
      if (Math.abs(wheel.current) < 20) return;
      const dir = Math.sign(wheel.current);
      wheel.current = 0;
      const s = stRef.current;
      if (!s) return;
      if (view === 'stems') setSel(i => Math.max(0, Math.min(s.stems.length - 1, i + dir)));
      else send({ cmd: 'volume', to: Math.max(0, Math.min(1, s.volume + dir * 0.03)) });
    };
    const onKey = (e: KeyboardEvent) => {
      const s = stRef.current;
      if (e.key === '1') send({ cmd: 'prev' });
      else if (e.key === '2') send({ cmd: 'toggle' });
      else if (e.key === '3') send({ cmd: 'next' });
      else if (e.key === '4') send({ cmd: 'shuffle' });
      else if (e.key === 'm') nextView();
      else if (e.key === 'Escape') setView('now');
      else if (e.key === 'Enter') {
        if (view === 'stems' && s?.stems[sel]) send({ cmd: 'stemMute', name: s.stems[sel].name });
        else send({ cmd: 'toggle' });
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [view, sel, send, nextView]);

  const pos = st ? Math.min(st.dur, st.pos + (st.playing ? (performance.now() - at.current) / 1000 : 0)) : 0;
  const t = st?.track ?? null;
  const art = t && cover?.id === t.id ? cover.data : null;

  if (conn !== 'open' || fwd === false || !up)
    return (
      <Shell>
        <Center title="bootleg">
          {conn !== 'open'
            ? 'connecting to the car thing daemon...'
            : fwd === false
              ? 'open the bridgething desktop app and keep it running: this app talks to bootleg through it'
              : 'waiting for bootleg. open the desktop player; it connects on its own'}
        </Center>
      </Shell>
    );

  if (view === 'viz')
    return (
      <Shell>
        <Viz frame={frame} />
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-6"
          onClick={() => setView('now')}>
          <div>
            <div className="font-display text-2xl leading-tight">{t?.title ?? ''}</div>
            <div className="text-soft">{[t?.artist, st?.pack].filter(Boolean).join('  ·  ')}</div>
          </div>
          <div className="flex gap-3">
            <Btn onClick={e => (e.stopPropagation(), send({ cmd: 'pack', by: -1 }))}>‹ pack</Btn>
            <Btn onClick={e => (e.stopPropagation(), send({ cmd: 'pack', by: 1 }))}>pack ›</Btn>
          </div>
        </div>
      </Shell>
    );

  if (view === 'stems')
    return (
      <Shell>
        <div className="flex h-full flex-col gap-3 p-8">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-2xl">{t?.title}</div>
            <Btn onClick={() => setView('now')}>back</Btn>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-hidden">
            {stems.slice(0, 10).map((s, i) => (
              <div
                key={s.name}
                onClick={() => setSel(i)}
                className={`flex items-center justify-between border px-4 py-3 ${i === sel ? 'border-accent bg-accent-soft' : 'border-rule'} ${s.mute ? 'opacity-50' : ''}`}>
                <span className="font-mono text-row">{s.name}</span>
                <span className="flex gap-2">
                  <Tog on={s.mute} onClick={() => send({ cmd: 'stemMute', name: s.name })}>M</Tog>
                  <Tog on={s.solo} onClick={() => send({ cmd: 'stemSolo', name: s.name })}>S</Tog>
                </span>
              </div>
            ))}
          </div>
          <div className="font-mono text-hint text-dim">dial: select · click: mute</div>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <div className="flex h-full flex-col justify-center gap-6 p-10">
        <div className="flex items-center gap-10">
          <div className="h-[248px] w-[248px] shrink-0 border border-rule bg-screen" onClick={() => setView('viz')}>
            {art ? (
              <img src={art} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center font-mono text-dim">♪</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {t ? (
              <>
                <div className="font-display text-[34px] leading-tight font-medium tracking-display">{t.title}</div>
                <div className="mt-1 truncate text-xl text-soft">{t.artist}</div>
                <div className="truncate font-mono text-hint text-dim">{t.album}</div>
                <div className="mt-4 flex gap-3 font-mono text-hint text-dim">
                  {t.bpm ? <span>{Math.round(t.bpm)} bpm</span> : null}
                  {t.key ? <span>{t.key}</span> : null}
                  {st && st.count > 1 ? (
                    <span>
                      {st.index + 1}/{st.count}
                    </span>
                  ) : null}
                  {stems.length ? <span>{stems.length} stems</span> : null}
                </div>
              </>
            ) : (
              <div className="text-title text-soft">nothing playing</div>
            )}
          </div>
        </div>

        <div>
          <div
            className="h-3 w-full cursor-pointer border border-rule bg-screen"
            onClick={e => {
              const r = e.currentTarget.getBoundingClientRect();
              send({ cmd: 'seek', to: (e.clientX - r.left) / r.width });
            }}>
            <div className="h-full bg-accent" style={{ width: `${st && st.dur ? (pos / st.dur) * 100 : 0}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-hint text-dim">
            <span>{mmss(pos)}</span>
            <span>vol {Math.round((st?.volume ?? 0) * 100)}</span>
            <span>{mmss(st?.dur ?? 0)}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Btn on={st?.shuffle} onClick={() => send({ cmd: 'shuffle' })}>shuf</Btn>
          <Btn onClick={() => send({ cmd: 'prev' })}>◀◀</Btn>
          <button
            className="w-28 border border-accent bg-accent py-3 font-mono text-row text-screen active:opacity-80"
            onClick={() => send({ cmd: 'toggle' })}>
            {st?.playing ? '❚❚' : '▶'}
          </button>
          <Btn onClick={() => send({ cmd: 'next' })}>▶▶</Btn>
          <Btn on={st?.repeat !== 'off'} onClick={() => send({ cmd: 'repeat' })}>
            {st?.repeat === 'one' ? 'rep 1' : 'rep'}
          </Btn>
          <Btn onClick={() => setView('viz')}>viz</Btn>
          {stems.length ? <Btn onClick={() => setView('stems')}>stems</Btn> : null}
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="relative h-full w-full overflow-hidden bg-bg text-off-white">{children}</div>;
}

function Center({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid h-full place-items-center p-12 text-center">
      <div>
        <div className="font-display text-screen-title">{title}</div>
        <div className="mt-3 text-title text-soft">{children}</div>
      </div>
    </div>
  );
}

function Btn({ on, children, onClick }: { on?: boolean; children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className={`border px-5 py-3 font-mono text-row active:bg-neutral-soft ${on ? 'border-accent text-accent' : 'border-edge text-near'}`}>
      {children}
    </button>
  );
}

function Tog({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={e => (e.stopPropagation(), onClick())}
      className={`h-10 w-10 border font-mono ${on ? 'border-accent bg-accent text-screen' : 'border-edge text-near'}`}>
      {children}
    </button>
  );
}
