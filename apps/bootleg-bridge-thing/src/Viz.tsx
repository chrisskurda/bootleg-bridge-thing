import { useEffect, useRef } from 'react';
import type { Frame } from './bridge';

// spectrum bars, mirrored, with a beat pulse. smoothing lives here so the link can be lossy.
export function Viz({ frame }: { frame: React.RefObject<Frame | null> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const g = c.getContext('2d')!;
    const bars = new Float32Array(64);
    let pulse = 0;
    let raf = 0;
    const tick = () => {
      const f = frame.current;
      if (f) {
        for (let i = 0; i < 64; i++) {
          const v = (f.spec[i] ?? 0) / 255;
          bars[i] = v > bars[i] ? v : bars[i] * 0.88;
        }
        pulse = f.beat ? 1 : pulse * 0.9;
      } else {
        for (let i = 0; i < 64; i++) bars[i] *= 0.9;
        pulse *= 0.9;
      }
      g.fillStyle = '#060809';
      g.fillRect(0, 0, 800, 480);
      g.fillStyle = `rgba(0,168,232,${0.05 + pulse * 0.12})`;
      g.fillRect(0, 0, 800, 480);
      const w = 800 / 64;
      for (let i = 0; i < 64; i++) {
        const h = Math.pow(bars[i], 0.8) * 400 + 2;
        g.fillStyle = `hsl(${195 + i * 0.9}, 90%, ${45 + bars[i] * 25}%)`;
        g.fillRect(i * w + 1, 240 - h / 2, w - 2, h);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frame]);

  return <canvas ref={ref} width={800} height={480} className="absolute inset-0" />;
}
