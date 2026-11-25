#!/usr/bin/env node
// Copies the bootleg-vizualizer runtime and packs into the app's public/viz, so the Car Thing runs the same visualizers as bootleg.
//   node scripts/vendor-viz.mjs [path/to/bootleg-vizualizer]      (default: ../bootleg-vizualizer, then ../bootleg/vendor/bootleg-vizualizer)
// One patch is applied to core/pack-runtime.js: the backing canvas may be smaller than the 1920x1080 design size (window.__K,
// set by the host). Packs draw in design units, so they need no change; the device is too slow for a full-HD backing store.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = [process.argv[2], path.join(root, '../bootleg-vizualizer'), path.join(root, '../bootleg/vendor/bootleg-vizualizer')]
  .filter(Boolean).map(p => path.resolve(p)).find(p => fs.existsSync(path.join(p, 'core/pack-runtime.js')));
if (!src) throw new Error('bootleg-vizualizer not found; pass its path');
const out = path.join(root, 'apps/bootleg-bridge-thing/public/viz');
fs.rmSync(out, { recursive: true, force: true });

const CORE = ['pack-runtime.js', 'stems.js', 'meta.js', 'look.js'];   // fx-gl.js (WebGL passes) is left out on purpose
fs.mkdirSync(path.join(out, 'core'), { recursive: true });
for (const f of CORE) fs.copyFileSync(path.join(src, 'core', f), path.join(out, 'core', f));

const rt = path.join(out, 'core/pack-runtime.js');
const was = 'const wantK = () => render ? dpr() :';
let js = fs.readFileSync(rt, 'utf8');
if (!js.includes(was)) throw new Error('pack-runtime.js changed: the render-scale patch no longer applies');
js = js.replace(was, 'const wantK = () => window.__K ? window.__K : render ? dpr() :');
fs.writeFileSync(rt, js);

const list = [];
for (const id of fs.readdirSync(path.join(src, 'packs')).sort()) {
  const dir = path.join(src, 'packs', id);
  if (id.startsWith('_') || !fs.existsSync(path.join(dir, 'pack.json'))) continue;
  fs.cpSync(dir, path.join(out, 'packs', id), { recursive: true, filter: s => !s.includes('/cache') });
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json'), 'utf8'));
  list.push({ id, name: m.name, page: m.page || 'index.html', description: m.description || '', usesStems: !!m.usesStems, params: m.params || {} });
}
fs.writeFileSync(path.join(out, 'packs.json'), JSON.stringify(list));
const version = fs.existsSync(path.join(src, 'VERSION')) ? fs.readFileSync(path.join(src, 'VERSION'), 'utf8').trim() : 'unknown';
fs.writeFileSync(path.join(out, 'VENDORED.md'), `bootleg-vizualizer ${version}, copied by scripts/vendor-viz.mjs. Do not edit: rerun the script.\nOnly change: pack-runtime.js honours window.__K as the backing-canvas scale.\n`);
console.log(`vendored ${list.length} packs from ${src} (${version})`);
