import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { WebSocket as RelayWebSocket, WebSocketServer } from "ws";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.close(() => resolve(true));
    });

    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const relayPort = Number(process.env.RELAY_PORT ?? 8787);
  const relayHost = process.env.RELAY_HOST ?? "relay";
  const relayProxy = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    if (!request.url?.startsWith("/ws/chat")) {
      socket.destroy();
      return;
    }

    relayProxy.handleUpgrade(request, socket, head, (client) => {
      const relay = new RelayWebSocket(`ws://${relayHost}:${relayPort}${request.url}`, {
        headers: request.headers.origin ? { origin: request.headers.origin } : undefined,
      });

      client.on("message", (data) => {
        if (relay.readyState === RelayWebSocket.OPEN) relay.send(data);
      });
      relay.on("message", (data) => {
        if (client.readyState === RelayWebSocket.OPEN) client.send(data.toString());
      });
      client.on("close", () => relay.close());
      relay.on("close", () => client.close());
      relay.on("error", () => client.close());
    });
  });

  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()"
    );
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; connect-src 'self' wss:; img-src 'self' https://static-cdn.jtvnw.net data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'"
    );

    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );

    next();
  });

  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ limit: "256kb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  serveStatic(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(
      `Port ${preferredPort} is busy, using port ${port} instead`
    );
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});
