# bootleg-bridge-thing

A Spotify Car Thing app (via [bridgething](https://bridgething.com)) that remote-controls the [bootleg](../bootleg) desktop player:
now playing with cover art, transport, seek, volume, per-stem mute/solo for stem renders, and bootleg's own visualizer packs running on the device. Touch-first UI (every control 64px+) in bootleg's theme.

```
bootleg (Tauri/web)  --ws 127.0.0.1:8899-->  desktop extension (Deno)  --client.forward-->  Car Thing webapp
```

- `apps/bootleg-bridge-thing/extension/main.ts` — hosts the localhost socket bootleg connects to; relays state/cover/frames to the device and commands back; caches state for late-joining devices.
- `apps/bootleg-bridge-thing/src/` — the 800x480 webapp (now playing, visualizer, stems pages).
- bootleg side: `src/lib/bridge.js` there. Turn it on in bootleg → Settings → Car Thing.

Controls: dial = volume (selection on the stems page), click = play/pause (mute on stems), presets 1–4 = prev / play-pause / next / shuffle, Mode = cycle pages, Back = now playing.

Needs the bridgething desktop app running (extensions are desktop-only) and the Car Thing over USB. Dev: `bun run dev`; check: `bun run check`.

## Visualizers
`public/viz/` is a copy of the bootleg-vizualizer runtime and packs (`node scripts/vendor-viz.mjs [path]` refreshes it; do not edit by hand).
Packs draw in 1920x1080 design units, so the device renders them into a smaller backing canvas: the vendored `pack-runtime.js` has one patch, `window.__K`
(canvas scale). The app starts at 0.42 (about the screen's own resolution) and steps down to 0.2 if the frame rate falls under ~22 fps. Look/FX (WebGL) passes are left out.
bootleg streams each analysed frame (spectrum, waveform, bass/mid/high/beat/level, per-stem levels and bands) and the device rebuilds the `A` object packs expect.
The pack choice is local to the device (saved on it); with no choice yet it follows the pack open in bootleg. Pack params use their defaults.
