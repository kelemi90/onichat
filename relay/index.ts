import { createServer } from "node:http";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import { WebSocketServer, type WebSocket } from "ws";
import { parsePrivmsg, parseUserNotice, reconnectDelay } from "./parser";
import { ConnectionLimiter, isOriginAllowed, normalizeChannel, parseAllowedOrigins } from "./security";

const port = Number(process.env.RELAY_PORT ?? 8787);
const username = (process.env.TWITCH_BOT_USERNAME ?? "").trim().toLowerCase();
const token = (process.env.TWITCH_OAUTH_TOKEN ?? "").trim().replace(/^oauth:/i, "");
const channel = normalizeChannel(process.env.TWITCH_CHANNEL ?? "") ?? "";
const maxClients = Math.min(500, Math.max(1, Number(process.env.RELAY_MAX_CLIENTS ?? 100)));
const allowedOrigins = parseAllowedOrigins(process.env.RELAY_ALLOWED_ORIGINS);
const connectionLimiter = new ConnectionLimiter(30, 60_000);

if (!username || !token || !channel) {
  console.warn("[relay] Missing TWITCH_BOT_USERNAME, TWITCH_OAUTH_TOKEN, or TWITCH_CHANNEL. Relay will stay online but not connect.");
}

const clients = new Set<WebSocket>();
let twitch: TLSSocket | null = null;
let reconnectTimer: NodeJS.Timeout | undefined;
let reconnectAttempt = 0;
let connected = false;

function broadcast(payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of clients) if (client.readyState === 1) client.send(data);
}



function send(line: string) { if (twitch && !twitch.destroyed) twitch.write(`${line}\r\n`); }

function connectTwitch() {
  if (!username || !token || !channel) return;
  twitch?.destroy();
  twitch = tlsConnect({ host: "irc-ws.chat.twitch.tv", port: 6697, servername: "irc-ws.chat.twitch.tv" });
  twitch.setEncoding("utf8");
  let buffer = "";
  twitch.on("secureConnect", () => { send(`PASS oauth:${token}`); send(`NICK ${username}`); send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"); send(`JOIN #${channel}`); });
  twitch.on("data", (chunk) => { buffer += chunk; const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ""; for (const line of lines) { if (line.startsWith("PING")) send("PONG :tmi.twitch.tv"); const message = parsePrivmsg(line) ?? parseUserNotice(line); if (message) broadcast(message); if (line.includes(" JOIN #")) { connected = true; reconnectAttempt = 0; broadcast({ type: "status", state: "connected", channel }); } } });
  twitch.on("error", (error) => { connected = false; broadcast({ type: "status", state: "error", channel, detail: error.message }); });
  twitch.on("close", () => { connected = false; broadcast({ type: "status", state: "reconnecting", channel }); const delay = reconnectDelay(reconnectAttempt++); reconnectTimer = setTimeout(connectTwitch, delay); });
}

const httpServer = createServer((req, res) => { if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, connected, clients: clients.size, channel })); return; } res.writeHead(404); res.end(); });
const wss = new WebSocketServer({ server: httpServer, path: "/ws/chat", maxPayload: 1024, perMessageDeflate: false });
wss.on("connection", (socket, request) => {
  const origin = request.headers.origin;
  const ip = request.socket.remoteAddress ?? "unknown";
  const requested = normalizeChannel(new URL(request.url ?? "/", "http://relay.local").searchParams.get("channel") ?? "");
  if (!isOriginAllowed(origin, allowedOrigins)) { socket.close(1008, "origin is not allowed"); return; }
  if (!connectionLimiter.allow(ip)) { socket.close(1013, "connection rate limit exceeded"); return; }
  if (clients.size >= maxClients) { socket.close(1013, "relay at capacity"); return; }
  if (!requested || requested !== channel) { socket.close(1008, "channel is not configured on this relay"); return; }
  clients.add(socket);
  socket.send(JSON.stringify({ type: "status", state: connected ? "connected" : "connecting", channel }));
  socket.on("close", () => clients.delete(socket));
});
httpServer.listen(port, "0.0.0.0", () => console.log(`[relay] listening on port ${port}`));
connectTwitch();
