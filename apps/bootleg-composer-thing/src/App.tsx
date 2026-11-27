import { BridgethingClient, type ConnectionState } from '@bridgething/client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Holds, PROTOCOL, type Cmd, type ComposerState } from './composer';
import { daemonUrl } from './daemon';
import { Draw } from './Draw';
import { Keys } from './Keys';
import { Loop } from './Loop';
import { Pads } from './Pads';
import { Btn, Icon, Pill } from './ui';

type Page = 'pads' | 'keys' | 'draw' | 'loop';

// ?demo shows the pages with a made-up song and keeps what they would send in window.__sent (screenshots, tests)
const DEMO = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
const DEMO_STATE: ComposerState = {
  type: 'state',
  v: PROTOCOL,
  song: 'demo',
  bpm: 124,
  playing: false,
  looping: true,
  armed: false,
  octave: 0,
  start: 0,
  songSteps: 256,
  riff: { name: 'bassline 2', i: 1, n: 6, len: 16, notes: 9 },
  sound: 'Sub Bass',
  drums: false,
  bends: true,
  pads: ['Kick 1', 'Snare', 'Closed Hat', 'Open Hat', 'Clap', 'Rim', 'Tom Lo', 'Tom Hi', 'Crash', null, null, null, null, null, null, null],
  looper: { state: 'playing', layers: 2, beats: 8, div: 0.75, fb: 0.35, mix: 0.3 },
};
const PAGES: Page[] = ['pads', 'keys', 'draw', 'loop'];
const ICONS = { pads: 'pads', keys: 'keys', draw: 'draw', loop: 'tape' } as const;

// presets 1-4 pick the page; mode cycles pages; the knob bends held notes, sets the delay feedback on the loop page,
// and otherwise scrubs the song; its click records on the loop page and elsewhere plays and stops; back stops all
export default function App() {
  const client = useMemo(() => new BridgethingClient({ url: daemonUrl() }), []);
  const [conn, setConn] = useState<ConnectionState>(client.connectionState);
  const [fwd, setFwd] = useState<boolean | null>(null);
  const [up, setUp] = useState(false);
  const [st, setSt] = useState<ComposerState | null>(DEMO ? DEMO_STATE : null);
  const [pos, setPos] = useState(0);
  const [loopAt, setLoopAt] = useState<number | null>(DEMO ? 0.4 : null);
  const [level, setLevel] = useState(0);
  const [page, setPage] = useState<Page>('pads');
  const send = useCallback(
    (c: Cmd) => {
      if (DEMO) ((window as unknown as { __sent: Cmd[] }).__sent ??= []).push(c);
      else void client.forward.json(c);
    },
    [client],
  );
  const holds = useMemo(() => new Holds(send), [send]);
  const scrub = useRef(0);
  const pageRef = useRef(page);
  pageRef.current = page;
  const stRef = useRef(st);
  stRef.current = st;

  useEffect(() => {
    const offConn = client.on(e => {
      if (e.type === 'open' || e.type === 'close' || e.type === 'connecting') setConn(client.connectionState);
    });
    client.capabilities.get().then(r => setFwd(r.ok && r.response.capabilities.available.forward));
    const offMsg = client.forward.onJson(raw => {
      const m = raw as { type?: string; up?: boolean; step?: number; loop?: number | null; level?: number };
      if (m.type === 'state') setSt(m as ComposerState);
      else if (m.type === 'pos') {
        setPos(m.step ?? 0);
        setLoopAt(m.loop ?? null);
        setLevel(m.level ?? 0);
      }
      else if (m.type === 'link' && !DEMO) {
        setUp(!!m.up);
        if (!m.up) setSt(null);
      }
    });
    send({ cmd: 'hello' });
    return () => {
      offConn();
      offMsg();
    };
  }, [client, send]);

  // nothing may stay held if the page goes away
  useEffect(() => () => holds.releaseAll(), [holds]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const s = stRef.current;
      if (e.key >= '1' && e.key <= '4') setPage(PAGES[Number(e.key) - 1]);
      else if (e.key === 'm') setPage(p => PAGES[(PAGES.indexOf(p) + 1) % PAGES.length]);
      else if (e.key === 'Enter') send(pageRef.current === 'loop' ? { cmd: 'looprec' } : { cmd: s?.playing ? 'stop' : 'play' });
      else if (e.key === 'Escape') {
        holds.releaseAll();
        send({ cmd: 'stop' });
      } else return;
      e.preventDefault();
    };
    const wheel = (e: WheelEvent) => {
      const d = e.deltaX || e.deltaY;
      if (!d) return;
      e.preventDefault();
      if (holds.any) {
        holds.knob(d / 60);
        return;
      }
      const s = stRef.current;
      if (pageRef.current === 'loop' && s) {
        const fb = Math.max(0, Math.min(0.95, s.looper.fb + d / 1200));
        setSt({ ...s, looper: { ...s.looper, fb } });
        send({ cmd: 'loopfx', fb });
        return;
      }
      // a detent is a 16th; a fast spin moves in bars
      scrub.current += d;
      const n = Math.trunc(scrub.current / 30);
      if (!n) return;
      scrub.current -= n * 30;
      send({ cmd: 'scrub', by: Math.abs(n) > 3 ? n * 4 : n });
    };
    window.addEventListener('keydown', key);
    window.addEventListener('wheel', wheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('wheel', wheel);
    };
  }, [send, holds]);

  if (!st) {
    const why =
      conn !== 'open'
        ? `connecting to the Car Thing (${conn})`
        : fwd === false
          ? 'this needs the bridgething desktop app, with this app installed there'
          : !up
            ? 'open bootleg Composer and turn on Settings > Server & network > Car Thing companion'
            : 'waiting for bootleg Composer';
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-bg p-12 text-center">
        <Icon name="keys" size={56} />
        <div className="text-2xl">bootleg composer</div>
        <div className="max-w-xl text-lg text-muted">{why}</div>
      </div>
    );
  }

  const len = st.riff?.len || 16;
  const at = st.looping ? pos % len : st.playing ? pos : st.start;
  const bar = (s: number) => `${Math.floor(s / 16) + 1}.${Math.floor((s % 16) / 4) + 1}`;

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <header className="flex h-[72px] shrink-0 items-center gap-2 px-2">
        {PAGES.map(p => (
          <Btn key={p} icon={ICONS[p]} on={page === p} className="w-14" onClick={() => setPage(p)} />
        ))}
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Btn icon="prev" className="w-14 shrink-0" onClick={() => send({ cmd: 'riff', by: -1 })} />
          <div className="min-w-0 flex-1 text-center leading-tight">
            <div className="truncate text-lg">{st.riff?.name ?? 'no riff'}</div>
            <div className="truncate text-xs text-muted">
              {st.sound} · {Math.round(st.bpm)} bpm · {st.looping ? 'loop' : 'bar'} {bar(at)}
              {page === 'keys' ? ` · oct ${st.octave > 0 ? '+' : ''}${st.octave}` : ''}
            </div>
          </div>
          <Btn icon="next" className="w-14 shrink-0" onClick={() => send({ cmd: 'riff', by: 1 })} />
        </div>
        {page === 'keys' ? (
          <>
            <Btn icon="minus" className="w-12" onClick={() => send({ cmd: 'octave', by: -1 })} />
            <Btn icon="plus" className="w-12" onClick={() => send({ cmd: 'octave', by: 1 })} />
          </>
        ) : null}
        <Btn icon="loop" on={st.looping} className="w-14" onClick={() => send({ cmd: 'loop' })} />
        <Btn
          icon="rec"
          on={st.armed}
          className={`w-14 ${st.armed ? '!text-bad' : ''}`}
          onClick={() => send({ cmd: 'arm', on: !st.armed })}
        />
        <Btn icon={st.playing ? 'stop' : 'play'} on={st.playing} className="w-14" onClick={() => send({ cmd: st.playing ? 'stop' : 'play' })} />
      </header>
      <div className="h-1 shrink-0 bg-panel">
        <div className="h-1 bg-accent" style={{ width: `${(100 * at) / Math.max(1, st.looping ? len : st.songSteps)}%` }} />
      </div>
      <main className="min-h-0 flex-1">
        {page === 'pads' ? <Pads st={st} send={send} holds={holds} /> : null}
        {page === 'keys' ? <Keys st={st} send={send} holds={holds} /> : null}
        {page === 'draw' ? <Draw send={send} onDone={() => setPage('keys')} /> : null}
        {page === 'loop' ? <Loop lp={st.looper} at={loopAt} level={level} send={send} /> : null}
      </main>
      {st.v !== PROTOCOL ? (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <Pill tone="bad">Composer speaks protocol {st.v}; this app knows {PROTOCOL}</Pill>
        </div>
      ) : null}
    </div>
  );
}
