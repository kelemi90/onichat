import { createServer } from "node:http";
import { WebSocketServer, WebSocket as TwitchWebSocket, type WebSocket } from "ws";
import { parsePrivmsg, parseUserNotice, reconnectDelay } from "./parser";
import { ConnectionLimiter, isOriginAllowed, normalizeChannel, parseAllowedOrigins } from "./security";
import type { OverlayChatMessage } from "../shared/chat";
import { TwitchBadgeCatalog } from "./badges";
import { loadRefreshToken, requestTwitchTokenRefresh, saveRefreshToken } from "./twitchToken";

const port = Number(process.env.RELAY_PORT ?? 8787);
const username = (process.env.TWITCH_BOT_USERNAME ?? "").trim().toLowerCase();
let token = (process.env.TWITCH_OAUTH_TOKEN ?? "").trim().replace(/^oauth:/i, "");
let refreshToken = (process.env.TWITCH_REFRESH_TOKEN ?? "").trim() || undefined;
const refreshTokenFile = process.env.TWITCH_REFRESH_TOKEN_FILE?.trim() || "/tmp/oni-chat-relay/refresh-token";
const clientId = process.env.TWITCH_CLIENT_ID?.trim() ?? "";
const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim() || undefined;
const channel = normalizeChannel(process.env.TWITCH_CHANNEL ?? "") ?? "";
const badgeCatalog = new TwitchBadgeCatalog(clientId, token, channel);
const maxClients = Math.min(500, Math.max(1, Number(process.env.RELAY_MAX_CLIENTS ?? 100)));
const allowedOrigins = parseAllowedOrigins(process.env.RELAY_ALLOWED_ORIGINS);
const connectionLimiter = new ConnectionLimiter(30, 60_000);

const clients = new Set<WebSocket>();
const recentMessages: OverlayChatMessage[] = [];
let twitch: TwitchWebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | undefined;
let reconnectAttempt = 0;
let connected = false;
let receivedMessages = 0;
let lastMessageTextLength = 0;
let tokenRefreshTimer: NodeJS.Timeout | undefined;
let tokenRefreshAttempt = 0;
let relayStarted = false;

function broadcast(payload: unknown) {
  const data = JSON.stringify(payload);
  for (const client of clients) if (client.readyState === 1) client.send(data);
}



function send(line: string) { if (twitch?.readyState === TwitchWebSocket.OPEN) twitch.send(`${line}\r\n`); }

function scheduleTokenRefresh(delay: number) {
  if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
  tokenRefreshTimer = setTimeout(() => void refreshTwitchToken(), delay);
  tokenRefreshTimer.unref();
}

async function refreshTwitchToken() {
  if (!refreshToken || !clientId) return;
  try {
    const refreshed = await requestTwitchTokenRefresh(refreshToken, clientId, clientSecret);
    try {
      await saveRefreshToken(refreshTokenFile, refreshed.refreshToken);
    } catch (error) {
      console.error("[relay] Twitch rotated its refresh token, but it could not be saved; it will not survive a restart:", error instanceof Error ? error.message : "unknown error");
    }
    const accessTokenChanged = token !== refreshed.accessToken;
    token = refreshed.accessToken;
    refreshToken = refreshed.refreshToken;
    badgeCatalog.setToken(token);
    tokenRefreshAttempt = 0;
    const refreshIn = Math.max(1_000, refreshed.expiresIn * 1_000 - Math.min(5 * 60_000, refreshed.expiresIn * 500));
    scheduleTokenRefresh(refreshIn);
    if (relayStarted && !badgeCatalog.isLoaded()) void badgeCatalog.load();
    if (accessTokenChanged && twitch) twitch.close();
    else if (accessTokenChanged) connectTwitch();
    console.log(`[relay] Twitch access token refreshed; next refresh in ${Math.round(refreshIn / 60_000)} minutes`);
  } catch (error) {
    console.error(`[relay] Twitch token refresh failed: ${error instanceof Error ? error.message : "unknown error"}`);
    const retryIn = Math.min(60_000, 5_000 * 2 ** Math.min(tokenRefreshAttempt++, 4));
    scheduleTokenRefresh(retryIn);
  }
}

function connectTwitch() {
  if (!username || !token || !channel) return;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  twitch?.close();
  console.log("[relay] connecting to Twitch IRC over WebSocket");
  const socket = new TwitchWebSocket("wss://irc-ws.chat.twitch.tv:443", { handshakeTimeout: 10_000 });
  twitch = socket;
  let buffer = "";
  socket.on("open", () => { console.log(`[relay] connected to Twitch IRC; joining #${channel}`); send(`PASS oauth:${token}`); send(`NICK ${username}`); send("CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"); send(`JOIN #${channel}`); });
  socket.on("message", (data) => { buffer += data.toString(); const lines = buffer.split(/\r?\n/); buffer = lines.pop() ?? ""; for (const line of lines) { if (line.startsWith("PING")) send("PONG :tmi.twitch.tv"); if (line.includes(" NOTICE ") || /\s\d{3}\s/.test(line)) console.log(`[relay] Twitch: ${line}`); const message = parsePrivmsg(line, (type, version) => badgeCatalog.getUrl(type, version)) ?? parseUserNotice(line); if (message) { receivedMessages += 1; lastMessageTextLength = message.text.length; recentMessages.push(message); recentMessages.splice(0, Math.max(0, recentMessages.length - 30)); console.log(`[relay] received chat message from ${message.username} (text length: ${lastMessageTextLength})`); broadcast(message); } if (line.includes(" JOIN #")) { connected = true; reconnectAttempt = 0; console.log(`[relay] joined #${channel}`); broadcast({ type: "status", state: "connected", channel }); } } });
  socket.on("error", (error) => { connected = false; console.error(`[relay] Twitch connection error: ${error.message}`); broadcast({ type: "status", state: "error", channel, detail: error.message }); });
  socket.on("close", () => {
    if (twitch !== socket) return;
    connected = false;
    console.warn("[relay] Twitch connection closed; retrying");
    broadcast({ type: "status", state: "reconnecting", channel });
    const delay = reconnectDelay(reconnectAttempt++);
    reconnectTimer = setTimeout(connectTwitch, delay);
  });
}

const httpServer = createServer((req, res) => { if (req.url === "/health") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: true, connected, clients: clients.size, receivedMessages, lastMessageTextLength, channel })); return; } res.writeHead(404); res.end(); });
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
  for (const message of recentMessages) socket.send(JSON.stringify(message));
  socket.on("close", () => clients.delete(socket));
});
httpServer.listen(port, "0.0.0.0", () => console.log(`[relay] listening on port ${port}`));
async function startTwitchRelay() {
  try {
    refreshToken = await loadRefreshToken(refreshTokenFile, refreshToken);
  } catch (error) {
    console.error(`[relay] unable to load Twitch refresh token: ${error instanceof Error ? error.message : "unknown error"}`);
  }
  if (refreshToken && !clientId) {
    console.error("[relay] TWITCH_REFRESH_TOKEN is set but TWITCH_CLIENT_ID is missing; automatic token refresh is disabled");
  } else if (refreshToken) {
    await refreshTwitchToken();
  }
  if (!username || !token || !channel) {
    console.warn("[relay] Missing TWITCH_BOT_USERNAME, an access or refresh token, or TWITCH_CHANNEL. Relay will stay online but not connect.");
  }
  if (!twitch) connectTwitch();
  void badgeCatalog.load();
  relayStarted = true;
}
void startTwitchRelay();
