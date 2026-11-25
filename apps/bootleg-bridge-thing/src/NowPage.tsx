import type { BootlegState } from './bridge';
import { Slider } from './Slider';
import { Btn, Icon, Pill } from './ui';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function NowPage({
  st,
  pos,
  art,
  send,
  open,
}: {
  st: BootlegState;
  pos: number;
  art: string | null;
  send: (c: import('./bridge').Cmd) => void;
  open: (v: 'viz' | 'stems') => void;
}) {
  const t = st.track;
  const hasStems = st.stems.length > 0;
  return (
    <div className="flex h-[440px] gap-6 px-5 pt-2">
      <div className="flex w-[248px] shrink-0 flex-col gap-2.5">
        <button
          onClick={() => open('viz')}
          className="h-[248px] w-[248px] overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-on to-[#2a1b4a] active:opacity-80">
          {art ? (
            <img src={art} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center text-6xl text-faint">♪</span>
          )}
        </button>
        <div className="grid grid-cols-2 gap-2">
          <Btn icon="shuffle" label="Shuffle" on={st.shuffle} onClick={() => send({ cmd: 'shuffle' })} />
          <Btn
            icon={st.repeat === 'one' ? 'one' : 'repeat'}
            label="Repeat"
            on={st.repeat !== 'off'}
            onClick={() => send({ cmd: 'repeat' })}
          />
          <Btn icon="viz" label="Visuals" onClick={() => open('viz')} />
          <Btn
            icon="stems"
            label="Stems"
            className={hasStems ? '' : 'opacity-40'}
            onClick={() => hasStems && open('stems')}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between pb-3">
        <div className="min-h-[118px]">
          {t ? (
            <>
              <div className="line-clamp-2 text-[30px] leading-[1.15] font-semibold">{t.title}</div>
              <div className="mt-1 truncate text-xl text-muted">{t.artist || 'Unknown artist'}</div>
              <div className="truncate text-[15px] text-faint">{t.album}</div>
            </>
          ) : (
            <div className="pt-6 text-2xl text-muted">Nothing playing</div>
          )}
        </div>

        <div>
          <Slider value={st.dur ? pos / st.dur : 0} onCommit={v => send({ cmd: 'seek', to: v })} />
          <div className="-mt-1 flex justify-between font-mono text-sm text-muted">
            <span>{mmss(pos)}</span>
            <span className="flex gap-2">
              {t?.bpm ? <Pill>{Math.round(t.bpm)} bpm</Pill> : null}
              {t?.key ? <Pill>{t.key}</Pill> : null}
              {st.count > 1 ? (
                <Pill>
                  {st.index + 1}/{st.count}
                </Pill>
              ) : null}
            </span>
            <span>{mmss(st.dur)}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Btn icon="prev" className="h-24 flex-1" onClick={() => send({ cmd: 'prev' })} />
          <button
            onClick={() => send({ cmd: 'toggle' })}
            className="grid h-24 flex-[1.5] place-items-center rounded-2xl bg-accent text-bg transition active:scale-95 active:bg-[#95a2ff]">
            <Icon name={st.playing ? 'pause' : 'play'} size={48} />
          </button>
          <Btn icon="next" className="h-24 flex-1" onClick={() => send({ cmd: 'next' })} />
        </div>

        <div className="flex items-center gap-3">
          <Btn
            icon="minus"
            className="w-16"
            onClick={() => send({ cmd: 'volume', to: Math.max(0, st.volume - 0.05) })}
          />
          <div className="min-w-0 flex-1">
            <Slider live value={st.volume} onCommit={v => send({ cmd: 'volume', to: v })} />
          </div>
          <Btn
            icon="plus"
            className="w-16"
            onClick={() => send({ cmd: 'volume', to: Math.min(1, st.volume + 0.05) })}
          />
          <span className="w-12 text-right font-mono text-muted">{Math.round(st.volume * 100)}</span>
        </div>
      </div>
    </div>
  );
}
