export type PackInfo = { id: string; name: string; page: string; description: string; usesStems: boolean };

let cache: Promise<PackInfo[]> | null = null;

export function loadPacks(): Promise<PackInfo[]> {
  cache ??= fetch('viz/packs.json')
    .then(r => r.json() as Promise<PackInfo[]>)
    .catch(() => []);
  return cache;
}

// the runtime helpers the host needs in this window too (metaAt, VisStems); packs load their own copies inside the frame
let helpers: Promise<void> | null = null;

export function loadHelpers(): Promise<void> {
  helpers ??= (async () => {
    for (const f of ['meta.js', 'stems.js']) {
      await new Promise<void>(resolve => {
        const s = document.createElement('script');
        s.src = `viz/core/${f}`;
        s.onload = s.onerror = () => resolve();
        document.head.append(s);
      });
    }
  })();
  return helpers;
}
