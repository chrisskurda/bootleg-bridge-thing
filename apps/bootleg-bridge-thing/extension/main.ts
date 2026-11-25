import { asJson, defineExtension, json, type ExtensionContext } from '@bridgething/extension';

// bootleg connects out to this socket; the device talks to it through forwards. state and cover are cached so a device
// that connects late is current immediately.
const HOST = '127.0.0.1';
const PORT = 8899;

type Msg = { type?: string; cmd?: string; on?: boolean } & Record<string, unknown>;

let bootleg: WebSocket | null = null;
let lastState: Msg | null = null;
let lastCover: Msg | null = null;
let wantFrames = false;
let server: Deno.HttpServer | undefined;

function toBootleg(msg: Msg) {
  if (bootleg?.readyState === WebSocket.OPEN) bootleg.send(JSON.stringify(msg));
}

function link(ctx: ExtensionContext) {
  ctx.broadcast(json({ type: 'link', up: bootleg?.readyState === WebSocket.OPEN }));
}

defineExtension({
  start(ctx) {
    ctx.on('device', event => {
      if (event.type === 'disconnected') return;
      const d = event.device;
      d.send(json({ type: 'link', up: bootleg?.readyState === WebSocket.OPEN }));
      if (lastState) d.send(json(lastState));
      if (lastCover) d.send(json(lastCover));
    });

    ctx.on('message', (_device, message) => {
      const m = asJson<Msg>(message);
      if (!m?.cmd) return;
      if (m.cmd === 'frames') {
        wantFrames = !!m.on;
        toBootleg({ cmd: 'frames', on: wantFrames });
        return;
      }
      toBootleg(m);
    });

    server = Deno.serve({ hostname: HOST, port: PORT, onListen: () => ctx.log.info(`listening on ${HOST}:${PORT}`) }, req => {
      if (req.headers.get('upgrade') !== 'websocket') return new Response('bootleg bridge', { status: 426 });
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.onopen = () => {
        bootleg?.close();
        bootleg = socket;
        ctx.log.info('bootleg connected');
        if (wantFrames) toBootleg({ cmd: 'frames', on: true });
        link(ctx);
      };
      socket.onmessage = e => {
        let m: Msg;
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (m.type === 'state') lastState = m;
        else if (m.type === 'cover') lastCover = m;
        else if (m.type !== 'frame') return;
        ctx.broadcast(json(m));
      };
      socket.onclose = () => {
        if (bootleg !== socket) return;
        bootleg = null;
        ctx.log.info('bootleg disconnected');
        link(ctx);
      };
      return response;
    });
  },
  async stop() {
    bootleg?.close();
    await server?.shutdown();
  },
});
