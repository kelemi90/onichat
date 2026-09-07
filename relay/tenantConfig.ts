import { normalizeChannel, parseAllowedOrigins } from "./security";

export type RelayTenantConfig = {
  id: string;
  channel: string;
  username: string;
  token: string;
  allowedOrigins: string[];
};

const tenantIdPattern = /^[a-z0-9][a-z0-9_-]{0,47}$/;

export function normalizeTenantId(value: string | undefined | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  return tenantIdPattern.test(normalized) ? normalized : null;
}

function fromRecord(value: unknown): RelayTenantConfig | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const id = normalizeTenantId(typeof record.id === "string" ? record.id : null);
  const channel = normalizeChannel(typeof record.channel === "string" ? record.channel : null);
  const username = typeof record.username === "string" ? record.username.trim().toLowerCase() : "";
  const token = typeof record.token === "string" ? record.token.trim().replace(/^oauth:/i, "") : "";
  const origins = Array.isArray(record.origins) ? record.origins.filter((origin): origin is string => typeof origin === "string") : [];
  if (!id || !channel || !username || !token || origins.length === 0) return null;
  return { id, channel, username, token, allowedOrigins: parseAllowedOrigins(origins.join(",")) };
}

export function parseRelayTenants(raw: string | undefined, fallback: RelayTenantConfig | null = null) {
  const tenants = new Map<string, RelayTenantConfig>();
  if (raw?.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const value of parsed) {
          const tenant = fromRecord(value);
          if (tenant) tenants.set(tenant.id, tenant);
        }
      }
    } catch {
      console.warn("[relay] RELAY_TENANTS_JSON is not valid JSON; no JSON tenants loaded");
    }
  }
  if (fallback && !tenants.has(fallback.id)) tenants.set(fallback.id, fallback);
  return tenants;
}

export function legacyTenantFromEnv(env: NodeJS.ProcessEnv): RelayTenantConfig | null {
  const channel = normalizeChannel(env.TWITCH_CHANNEL);
  const username = (env.TWITCH_BOT_USERNAME ?? "").trim().toLowerCase();
  const token = (env.TWITCH_OAUTH_TOKEN ?? "").trim().replace(/^oauth:/i, "");
  const allowedOrigins = parseAllowedOrigins(env.RELAY_ALLOWED_ORIGINS);
  if (!channel || !username || !token || allowedOrigins.length === 0) return null;
  return { id: "default", channel, username, token, allowedOrigins };
}
