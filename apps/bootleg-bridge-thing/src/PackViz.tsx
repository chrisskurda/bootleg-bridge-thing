import { useEffect, useRef, useState } from 'react';
import { AudioBuilder, type Meta } from './audio';
import type { WireFrame } from './bridge';
import { loadHelpers, type PackInfo } from './packs';

// design size is 1920x1080; the backing canvas is a fraction of that. start near the screen's own resolution and
// step down if the device can't hold the frame rate.
const K_START = 0.42;
const K_MIN = 0.2;
const FPS_FLOOR = 22;

type PackWindow = Window & Record<string, unknown>;

export function PackViz({
  pack,
  frame,
  meta,
  duration,
}: {
  pack: PackInfo;
  frame: React.RefObject<{ f: WireFrame; at: number } | null>;
  meta: Meta;
  duration: number;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [stale, setStale] = useState(false);
  const live = useRef({ meta, duration });
  live.current = { meta, duration };

  useEffect(() => {
    let raf = 0;
    let dead = false;
    let k = K_START;
    let last = performance.now();
    let fps = 30;
    let since = last;
    const builder = new AudioBuilder();
    let seen: WireFrame | null = null;
    let A: unknown = null;

    const tick = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(tick);
      fps += (1000 / Math.max(1, now - last) - fps) * 0.1;
      last = now;
      if (now - since > 2500) {
        since = now;
        if (fps < FPS_FLOOR && k > K_MIN) k = Math.max(K_MIN, k * 0.8);
      }
      const w = ref.current?.contentWindow as PackWindow | null | undefined;
      if (!w) return;
      try {
        w.__K = k;
        w.__PARAMS = {};
        w.__META = live.current.meta;
        const fr = frame.current;
        // frames from an older bootleg lack the packed bands: say so instead of silently showing the idle animation
        const old = !!fr && typeof fr.f.s !== 'string';
        setStale(s => (s === old ? s : old));
        if (fr && !old && now - fr.at < 1500) {
          if (fr.f !== seen) {
            seen = fr.f;
            A = builder.build(fr.f, live.current.meta, live.current.duration);
          }
          w.__AUDIO = A;
        } else w.__AUDIO = undefined;
      } catch {
        /* the pack page is still loading */
      }
    };

    loadHelpers().then(() => {
      if (!dead) raf = requestAnimationFrame(tick);
    });
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
    };
  }, [pack.id, frame]);

  return (
    <>
      <iframe
        key={pack.id}
        ref={ref}
        title={pack.name}
        src={`viz/packs/${pack.id}/${pack.page}`}
        className="absolute inset-0 h-full w-full border-0 bg-black"
      />
      {stale ? (
        <div className="absolute inset-x-0 top-3 mx-auto w-fit rounded-xl bg-bg/90 px-4 py-2 text-lg text-bad">
          Update bootleg: it is sending old-format audio frames
        </div>
      ) : null}
    </>
  );
}
