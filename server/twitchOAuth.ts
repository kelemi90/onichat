import { randomBytes } from "node:crypto";
import type { Express, Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { and, eq } from "drizzle-orm";
import { streamerTenants } from "../drizzle/schema";
import { getDb } from "./db";
import { encryptCredential } from "./credentialEncryption";
import { getTenantByOwner } from "./streamers";
import { sdk } from "./_core/sdk";

const STATE_COOKIE = "twitch_oauth_state";
const publicOrigin = () => (process.env.PUBLIC_APP_ORIGIN ?? "https://oni.laiki.fi").replace(/\/$/, "");
const callbackUrl = () => `${publicOrigin()}/api/twitch/oauth/callback`;

function secureCookieOptions() {
  return { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 600 };
}

async function currentUser(req: Request) {
  try {
    return await sdk.authenticateRequest(req);
  } catch {
    return null;
  }
}

export function registerTwitchOAuthRoutes(app: Express) {
  app.get("/api/twitch/oauth/start", async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "login required" });
    const tenantSlug = typeof req.query.tenant === "string" ? req.query.tenant : "";
    const tenant = await getTenantByOwner(tenantSlug, user.id);
    if (!tenant) return res.status(404).json({ error: "approved tenant not found" });
    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    if (!clientId) return res.status(503).json({ error: "Twitch OAuth is not configured" });
    const state = randomBytes(24).toString("base64url");
    res.cookie(STATE_COOKIE, `${state}.${tenant.slug}`, secureCookieOptions());
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: callbackUrl(), response_type: "code", scope: "chat:read", state });
    return res.redirect(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
  });

  app.get("/api/twitch/oauth/callback", async (req, res) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).send("Log in to oni.laiki.fi before connecting Twitch.");
    const cookies = parseCookie(req.headers.cookie ?? "");
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const saved = cookies[STATE_COOKIE] ?? "";
    const [savedState, tenantSlug] = saved.split(".");
    if (!state || !savedState || state !== savedState || !tenantSlug) return res.status(403).send("Invalid Twitch OAuth state.");
    res.clearCookie(STATE_COOKIE, { ...secureCookieOptions(), maxAge: 0 });
    const tenant = await getTenantByOwner(tenantSlug, user.id);
    if (!tenant) return res.status(404).send("Approved tenant not found.");
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code) return res.status(400).send("Twitch did not return an authorization code.");
    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return res.status(503).send("Twitch OAuth is not configured.");

    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, grant_type: "authorization_code", redirect_uri: callbackUrl() }) });
    if (!tokenResponse.ok) return res.status(502).send("Twitch token exchange failed.");
    const token = await tokenResponse.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!token.access_token || !token.refresh_token || !token.expires_in) return res.status(502).send("Twitch returned an incomplete token response.");
    const profileResponse = await fetch("https://api.twitch.tv/helix/users", { headers: { Authorization: `Bearer ${token.access_token}`, "Client-Id": clientId } });
    if (!profileResponse.ok) return res.status(502).send("Twitch profile validation failed.");
    const profile = await profileResponse.json() as { data?: Array<{ id: string; login: string }> };
    const twitchUser = profile.data?.[0];
    if (!twitchUser) return res.status(502).send("Twitch returned no user profile.");

    const db = await getDb();
    if (!db) return res.status(503).send("Database is not available.");
    await db.update(streamerTenants).set({ twitchUserId: twitchUser.id, twitchLogin: twitchUser.login, encryptedAccessToken: encryptCredential(token.access_token), encryptedRefreshToken: encryptCredential(token.refresh_token), accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000) }).where(and(eq(streamerTenants.id, tenant.id), eq(streamerTenants.ownerUserId, user.id)));
    return res.redirect("/?twitch=connected");
  });

  app.post("/api/twitch/oauth/disconnect", async (req: Request, res: Response) => {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: "login required" });
    const tenantSlug = typeof req.body?.tenant === "string" ? req.body.tenant : "";
    const tenant = await getTenantByOwner(tenantSlug, user.id);
    if (!tenant) return res.status(404).json({ error: "tenant not found" });
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "database unavailable" });
    await db.update(streamerTenants).set({ twitchUserId: null, twitchLogin: null, encryptedAccessToken: null, encryptedRefreshToken: null, accessTokenExpiresAt: null }).where(and(eq(streamerTenants.id, tenant.id), eq(streamerTenants.ownerUserId, user.id)));
    return res.json({ success: true });
  });
}
