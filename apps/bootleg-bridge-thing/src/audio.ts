import type { BootlegState, WireFrame } from './bridge';

// rebuilds the `A` object packs read (SPEC §2) from a wire frame. functions (past, stem) are re-attached here
type Win = Window & {
  VisStems?: { attach(A: unknown, list: unknown[]): unknown };
  metaAt?: (meta: unknown, t: number) => { section: unknown; track: unknown };
};

const dec = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const unit = (bytes: Uint8Array, wave = false) => Float32Array.from(bytes, v => (wave ? (v / 255) * 2 - 1 : v / 255));

export type Meta = Record<string, unknown>;

export function metaOf(track: BootlegState['track'], cover: string | null): Meta {
  if (!track) return {};
  return {
    title: track.title,
    artist: track.artist,
    album: track.album,
    year: track.year,
    bpm: track.bpm ?? undefined,
    key: track.key,
    sections: track.sections,
    cover: cover ?? undefined,
  };
}

export class AudioBuilder {
  private hist: { t: number; s: Float32Array }[] = [];

  build(f: WireFrame, meta: Meta, duration: number) {
    const w = window as Win;
    const spectrum = unit(dec(f.s));
    const now = performance.now() / 1000;
    this.hist.push({ t: now, s: spectrum });
    if (this.hist.length > 150) this.hist.shift();
    const [bass, mid, high, beat, level] = f.f.map(v => v / 255);
    const full = { ...meta, duration };
    const A: Record<string, unknown> = {
      live: true,
      t: f.t,
      duration,
      bass,
      mid,
      high,
      beat,
      level,
      spectrum,
      wave: f.w ? unit(dec(f.w), true) : new Float32Array(128),
      meta: full,
      ...(w.metaAt?.(full, f.t) ?? {}),
    };
    A.past = (sec: number) => {
      const want = now - sec;
      for (let i = this.hist.length - 1; i >= 0; i--) if (this.hist[i].t <= want) return this.hist[i].s;
      return this.hist[0].s;
    };
    const stems = f.stems.map(s => ({
      name: s.n,
      role: s.r,
      level: s.l / 255,
      beat: s.b / 255,
      spectrum: unit(dec(s.s)),
      gainDb: s.g,
      gain: Math.pow(10, s.g / 20),
      muted: !!s.m,
      audible: !!s.a,
      label: s.lb,
      kit: s.k || null,
      clip: null,
      estimated: false,
    }));
    w.VisStems?.attach(A, stems);
    return A;
  }
}
