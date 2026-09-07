import { describe, expect, it } from "vitest";
import { legacyTenantFromEnv, parseRelayTenants } from "./tenantConfig";

describe("relay tenant configuration", () => {
  it("loads valid tenants and rejects invalid tenant records", () => {
    const tenants = parseRelayTenants(JSON.stringify([
      { id: "alpha", channel: "alpha_channel", username: "bot", token: "oauth:token", origins: ["https://alpha.example"] },
      { id: "bad tenant", channel: "bad", username: "bot", token: "token", origins: ["https://bad.example"] },
    ]));
    expect(tenants.get("alpha")).toMatchObject({ channel: "alpha_channel", username: "bot", token: "token" });
    expect(tenants.has("bad tenant")).toBe(false);
  });

  it("preserves the legacy single-tenant environment fallback", () => {
    expect(legacyTenantFromEnv({ TWITCH_BOT_USERNAME: "bot", TWITCH_OAUTH_TOKEN: "oauth:token", TWITCH_CHANNEL: "channel", RELAY_ALLOWED_ORIGINS: "https://oni.laiki.fi" })).toMatchObject({ id: "default", channel: "channel", token: "token" });
  });
});
