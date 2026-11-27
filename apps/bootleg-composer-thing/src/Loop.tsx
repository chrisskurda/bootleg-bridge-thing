import type { LooperState, Send } from './composer';
import { Slider } from './Slider';
import { Btn } from './ui';

// delay times in beats, as composer offers them
const DIVS: [number, string][] = [
  [0.25, '1/16'],
  [0.5, '1/8'],
  [0.75, '1/8.'],
  [1, '1/4'],
  [1.5, '1/4.'],
];

// the looper: the big button records (the first take sets the loop, snapped to beats), then overdubs; it plays
// through a ping-pong delay. the knob sets the feedback, its click records
export function Loop({ lp, at, level, send }: { lp: LooperState; at: number | null; level: number; send: Send }) {
  const rec = lp.state === 'recording' || lp.state === 'overdubbing';
  const label = { empty: 'record', recording: 'stop', overdubbing: 'stop', playing: 'overdub', stopped: 'overdub' }[lp.state];
  const ring = at === null ? 0 : at;
  const C = 2 * Math.PI * 112;
  return (
    <div className="flex h-full gap-3 p-3">
      <button
        data-looprec
        onClick={() => send({ cmd: 'looprec' })}
        className="relative grid aspect-square h-full shrink-0 place-items-center rounded-full active:scale-95">
        <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full">
          <circle cx="120" cy="120" r="112" fill="#151925" stroke="#272d42" strokeWidth="10" />
          <circle
            cx="120"
            cy="120"
            r="112"
            fill="none"
            stroke={rec ? '#ff6b7a' : '#7c8cff'}
            strokeWidth="10"
            strokeDasharray={`${ring * C} ${C}`}
            transform="rotate(-90 120 120)"
          />
          {rec ? <circle cx="120" cy="120" r={30 + 70 * Math.min(1, level)} fill="#ff6b7a" opacity="0.18" /> : null}
        </svg>
        <div className="relative flex flex-col items-center gap-1">
          <div className={`text-3xl ${rec ? 'text-bad' : 'text-ink'}`}>{label}</div>
          <div className="text-sm text-muted">
            {lp.layers ? `${lp.layers} layer${lp.layers > 1 ? 's' : ''} · ${lp.beats} beats` : 'from this Mac’s input'}
          </div>
        </div>
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="grid grid-cols-4 gap-2">
          <Btn
            icon={lp.state === 'playing' ? 'stop' : 'play'}
            on={lp.state === 'playing'}
            onClick={() => send({ cmd: 'loopplay', on: lp.state !== 'playing' })}
          />
          <Btn label="undo" onClick={() => send({ cmd: 'loopundo' })} />
          <Btn label="clear" onClick={() => send({ cmd: 'loopclear' })} />
          <Btn label="keep" onClick={() => send({ cmd: 'loopkeep' })} />
        </div>
        <div className="mt-1 text-sm text-muted">delay</div>
        <div className="grid grid-cols-5 gap-2">
          {DIVS.map(([d, name]) => (
            <Btn key={d} label={name} on={Math.abs(lp.div - d) < 1e-3} onClick={() => send({ cmd: 'loopfx', div: d })} />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm text-muted">feedback</span>
          <Slider value={lp.fb / 0.95} live className="flex-1" onCommit={v => send({ cmd: 'loopfx', fb: v * 0.95 })} />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm text-muted">mix</span>
          <Slider value={lp.mix} live className="flex-1" onCommit={v => send({ cmd: 'loopfx', mix: v })} />
        </div>
      </div>
    </div>
  );
}
