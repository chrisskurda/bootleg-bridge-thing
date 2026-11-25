import { BridgethingClient, type ConnectionState } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { metaOf } from './audio';
import type { BootlegState, Cmd, WireFrame } from './bridge';
import { daemonUrl } from './daemon';
import { NowPage } from './NowPage';
import { loadPacks, type PackInfo } from './packs';
import { StemsPage } from './StemsPage';
import { Pill } from './ui';
import { VizPage } from './VizPage';

type View = 'now' | 'viz' | 'stems';
type Cover = { id: string | null; data: string | null };

export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: daemonUrl() }), []);
  const [conn, setConn] = useState<ConnectionState>(client.connectionState);
  const [fwd, setFwd] = useState<boolean | null>(null);
  const [up, setUp] = useState(false);
  const [st, setSt] = useState<BootlegState | null>(null);
  const [cover, setCover] = useState<Cover | null>(null);
  const [view, setView] = useState<View>('now');
  const [sel, setSel] = useState(0);
  const [packs, setPacks] = useState<PackInfo[]>([]);
  const [packId, setPackId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [, tick] = useState(0);
  const at = useRef(0);
  const frame = useRef<{ f: WireFrame; at: number } | null>(null);
  const stRef = useRef(st);
  stRef.current = st;

  const send = useCallback((c: Cmd) => void client.forward.json(c), [client]);

  useEffect(() => {
    const offConn = client.on(e => {
      if (e.type === 'open' || e.type === 'close' || e.type === 'connecting') setConn(client.connectionState);
    });
    client.capabilities.get().then(r => setFwd(r.ok && r.response.capabilities.available.forward));
    const offMsg = client.forward.onJson(raw => {
      const m = raw as { type?: string; up?: boolean };
      if (m.type === 'frame') frame.current = { f: m as WireFrame, at: performance.now() };
      else if (m.type === 'state') {
        at.current = performance.now();
        setSt(m as BootlegState);
      } else if (m.type === 'cover') setCover(m as Cover);
      else if (m.type === 'link') {
        setUp(!!m.up);
        if (!m.up) setSt(null);
      }
    });
    loadPacks().then(setPacks);
    client.store.get({ key: 'pack' }).then(r => {
      if (r.ok && typeof r.response.value === 'string') setPackId(r.response.value);
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
  useEffect(() => {
    if (view === 'stems' && !stems.length) setView('now');
  }, [view, stems.length]);

  // a pick sticks; with none, follow whatever pack bootleg has up
  const pack = packs.find(p => p.id === (packId ?? st?.packId)) ?? packs.find(p => p.id === 'spec-radial') ?? packs[0];
  const choosePack = useCallback(
    (id: string) => {
      setPackId(id);
      void client.store.put({ key: 'pack', value: id });
    },
    [client],
  );
  const stepPack = useCallback(
    (by: number) => {
      if (!packs.length || !pack) return;
      choosePack(packs[(packs.indexOf(pack) + by + packs.length) % packs.length].id);
    },
    [packs, pack, choosePack],
  );

  // dial: volume, or selection on the stems page, or pack on the visualizer
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
      else if (view === 'viz') stepPack(dir);
      else send({ cmd: 'volume', to: Math.max(0, Math.min(1, s.volume + dir * 0.03)) });
    };
    const onKey = (e: KeyboardEvent) => {
      const s = stRef.current;
      if (e.key === '1') send({ cmd: 'prev' });
      else if (e.key === '2') send({ cmd: 'toggle' });
      else if (e.key === '3') send({ cmd: 'next' });
      else if (e.key === '4') send({ cmd: 'shuffle' });
      else if (e.key === 'm') setView(v => (v === 'now' ? 'viz' : v === 'viz' && s?.stems.length ? 'stems' : 'now'));
      else if (e.key === 'Escape') (listOpen ? setListOpen(false) : setView('now'));
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
  }, [view, sel, send, stepPack, listOpen]);

  const pos = st ? Math.min(st.dur, st.pos + (st.playing ? (performance.now() - at.current) / 1000 : 0)) : 0;
  const t = st?.track ?? null;
  const art = t && cover?.id === t.id ? cover.data : null;
  const meta = useMemo(() => metaOf(t, art), [t, art]);

  const blocked =
    conn !== 'open'
      ? 'Connecting to the Car Thing…'
      : fwd === false
        ? 'Open the bridgething desktop app and keep it running. This app talks to bootleg through it.'
        : !up
          ? 'Waiting for bootleg. Open the player and turn on the Car Thing bridge in Settings → Extensions.'
          : null;

  if (blocked || !st)
    return (
      <div className="grid h-full place-items-center p-12 text-center">
        <div>
          <div className="text-5xl tracking-wide">
            boot<b className="text-accent">leg</b>
          </div>
          <div className="mx-auto mt-4 max-w-[560px] text-2xl text-muted">{blocked ?? 'Waiting for bootleg…'}</div>
        </div>
      </div>
    );

  if (view === 'viz')
    return (
      <VizPage
        pack={pack}
        packs={packs}
        setPack={choosePack}
        frame={frame}
        meta={meta}
        duration={st.dur}
        playing={st.playing}
        toggle={() => send({ cmd: 'toggle' })}
        back={() => setView('now')}
        listOpen={listOpen}
        setListOpen={setListOpen}
      />
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 flex-none items-center justify-between px-5">
        <div className="text-lg tracking-wide">
          boot<b className="text-accent">leg</b>
        </div>
        <div className="flex gap-2">
          {stems.length ? <Pill>{stems.length} stems</Pill> : null}
          <Pill tone="ok">● connected</Pill>
        </div>
      </div>
      {view === 'stems' ? (
        <StemsPage st={st} sel={sel} setSel={setSel} send={send} back={() => setView('now')} />
      ) : (
        <NowPage st={st} pos={pos} art={art} send={send} open={setView} />
      )}
    </div>
  );
}
