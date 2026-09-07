import { and, eq, isNotNull } from "drizzle-orm";
import { streamerTenants } from "../drizzle/schema";
import { decryptCredential, encryptCredential } from "../server/credentialEncryption";
import { getDb } from "../server/db";
import { parseAllowedOrigins } from "./security";
import { legacyTenantFromEnv, type RelayTenantConfig } from "./tenantConfig";

export type LoadedRelayTenant = RelayTenantConfig & { accessTokenExpiresAt?: Date };

async function refreshAccessToken(tenant: typeof streamerTenants.$inferSelect, refreshToken: string) {
  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Twitch OAuth client credentials are missing");
  const response = await fetch("https://id.twitch.tv/oauth2/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }) });
  if (!response.ok) throw new Error(`Twitch token refresh failed (${response.status})`);
  const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!token.access_token || !token.expires_in) throw new Error("Twitch refresh response was incomplete");
  const db = await getDb();
  if (db) await db.update(streamerTenants).set({ encryptedAccessToken: encryptCredential(token.access_token), encryptedRefreshToken: encryptCredential(token.refresh_token ?? refreshToken), accessTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000) }).where(eq(streamerTenants.id, tenant.id));
  return { accessToken: token.access_token, expiresAt: new Date(Date.now() + token.expires_in * 1000) };
}

export async function loadRelayTenants(): Promise<LoadedRelayTenant[]> {
  const db = await getDb();
  if (!db) {
    const legacy = legacyTenantFromEnv(process.env);
    return legacy ? [{ ...legacy, accessTokenExpiresAt: undefined }] : [];
  }
  const rows = await db.select().from(streamerTenants).where(and(isNotNull(streamerTenants.encryptedAccessToken), isNotNull(streamerTenants.encryptedRefreshToken)));
  const tenants: LoadedRelayTenant[] = [];
  for (const row of rows) {
    try {
      let accessToken = decryptCredential(row.encryptedAccessToken!);
      let expiresAt = row.accessTokenExpiresAt ?? undefined;
      const refreshToken = decryptCredential(row.encryptedRefreshToken!);
      if (!expiresAt || expiresAt.getTime() < Date.now() + 60_000) {
        const refreshed = await refreshAccessToken(row, refreshToken);
        accessToken = refreshed.accessToken;
        expiresAt = refreshed.expiresAt;
      }
      if (!row.twitchLogin) continue;
      tenants.push({ id: row.slug, channel: row.channel, username: row.twitchLogin, token: accessToken, allowedOrigins: parseAllowedOrigins(row.allowedOrigin), accessTokenExpiresAt: expiresAt });
    } catch (error) {
      console.error(`[relay] unable to load tenant ${row.slug}:`, error instanceof Error ? error.message : "unknown error");
    }
  }
  if (tenants.length === 0) {
    const legacy = legacyTenantFromEnv(process.env);
    if (legacy) tenants.push({ ...legacy, accessTokenExpiresAt: undefined });
  }
  return tenants;
}
