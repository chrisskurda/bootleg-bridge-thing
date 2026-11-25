// the slice of the deno runtime this extension uses; the host runs it under deno
declare namespace Deno {
  interface HttpServer {
    shutdown(): Promise<void>;
  }
  function serve(
    options: { hostname: string; port: number; onListen?: () => void },
    handler: (req: Request) => Response,
  ): HttpServer;
  function upgradeWebSocket(req: Request): { socket: WebSocket; response: Response };
}
