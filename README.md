# bootleg-bridge-thing

A Spotify Car Thing app (via [bridgething](https://bridgething.com)) that remote-controls the [bootleg](../bootleg) desktop player:
now playing with cover art, transport, seek, volume on the dial, per-stem mute/solo for stem renders, and a live spectrum visualizer.

```
bootleg (Tauri/web)  --ws 127.0.0.1:8899-->  desktop extension (Deno)  --client.forward-->  Car Thing webapp
```

- `apps/bootleg-bridge-thing/extension/main.ts` — hosts the localhost socket bootleg connects to; relays state/cover/frames to the device and commands back; caches state for late-joining devices.
- `apps/bootleg-bridge-thing/src/` — the 800x480 webapp (now playing, visualizer, stems pages).
- bootleg side: `src/lib/bridge.js` there. Turn it on in bootleg → Settings → Car Thing.

Controls: dial = volume (selection on the stems page), click = play/pause (mute on stems), presets 1–4 = prev / play-pause / next / shuffle, Mode = cycle pages, Back = now playing.

Needs the bridgething desktop app running (extensions are desktop-only) and the Car Thing over USB. Dev: `bun run dev`; check: `bun run check`.
