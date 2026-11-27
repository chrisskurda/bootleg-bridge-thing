import { asJson, defineExtension, json, type ExtensionContext } from '@bridgething/extension';

// bootleg Composer connects out to this socket (Settings > Server & network > Car Thing companion); the device talks
// to it through forwards. The last state is kept so a device that arrives late is current at once.
const HOST = '127.0.0.1';
const PORT = 8898;

type Msg = { type?: string; cmd?: string } & Record<string, unknown>;

let composer: WebSocket | null = null;
let lastState: Msg | null = null;
let server: Deno.HttpServer | undefined;

const up = () => composer?.readyState === WebSocket.OPEN;

function toComposer(msg: Msg) {
  if (up()) composer!.send(JSON.stringify(msg));
}

function link(ctx: ExtensionContext) {
  ctx.broadcast(json({ type: 'link', up: up() }));
}

defineExtension({
  start(ctx) {
    ctx.on('device', event => {
      if (event.type === 'disconnected') return;
      event.device.send(json({ type: 'link', up: up() }));
      if (lastState) event.device.send(json(lastState));
    });

    // the device's taps, bends and buttons go straight through; Composer checks them
    ctx.on('message', (_device, message) => {
      const m = asJson<Msg>(message);
      if (m?.cmd) toComposer(m);
    });

    server = Deno.serve({ hostname: HOST, port: PORT, onListen: () => ctx.log.info(`listening on ${HOST}:${PORT}`) }, req => {
      if (req.headers.get('upgrade') !== 'websocket') return new Response('bootleg composer companion', { status: 426 });
      const { socket, response } = Deno.upgradeWebSocket(req);
      socket.onopen = () => {
        composer?.close();
        composer = socket;
        ctx.log.info('composer connected');
        link(ctx);
        toComposer({ cmd: 'hello' });
      };
      socket.onmessage = e => {
        let m: Msg;
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (m.type === 'state') lastState = m;
        else if (m.type !== 'pos') return;
        ctx.broadcast(json(m));
      };
      socket.onclose = () => {
        if (composer !== socket) return;
        composer = null;
        lastState = null;
        ctx.log.info('composer disconnected');
        link(ctx);
      };
      return response;
    });
  },
  async stop() {
    composer?.close();
    await server?.shutdown();
  },
});
