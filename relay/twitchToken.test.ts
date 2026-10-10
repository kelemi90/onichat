import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadRefreshToken, requestTwitchTokenRefresh, saveRefreshToken } from "./twitchToken";

describe("Twitch token refresh", () => {
  let temporaryDirectory: string | undefined;

  afterEach(async () => {
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  });

  it("sends the refresh grant and returns the rotated token", async () => {
    const fetcher: typeof fetch = async (_input, init) => {
      expect(init?.method).toBe("POST");
      const body = init?.body;
      expect(body).toBeInstanceOf(URLSearchParams);
      if (!(body instanceof URLSearchParams)) throw new Error("refresh request body must be form encoded");
      expect(body.get("client_id")).toBe("client-id");
      expect(body.get("client_secret")).toBe("client-secret");
      expect(body.get("refresh_token")).toBe("old-refresh-token");
      expect(body.get("grant_type")).toBe("refresh_token");
      return new Response(JSON.stringify({ access_token: "new-access-token", refresh_token: "new-refresh-token", expires_in: 14_400 }), { status: 200 });
    };

    await expect(requestTwitchTokenRefresh("old-refresh-token", "client-id", "client-secret", fetcher)).resolves.toEqual({
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresIn: 14_400,
    });
  });

  it("rejects unsuccessful and incomplete Twitch responses", async () => {
    const unauthorized: typeof fetch = async () => new Response("", { status: 401 });
    await expect(requestTwitchTokenRefresh("refresh", "client-id", undefined, unauthorized)).rejects.toThrow("HTTP 401");

    const incomplete: typeof fetch = async () => new Response(JSON.stringify({ access_token: "access" }), { status: 200 });
    await expect(requestTwitchTokenRefresh("refresh", "client-id", undefined, incomplete)).rejects.toThrow("incomplete");
  });

  it("persists rotated refresh tokens and uses the environment value until a file exists", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "oni-chat-token-"));
    const path = join(temporaryDirectory, "refresh-token");
    await expect(loadRefreshToken(path, "env-refresh-token")).resolves.toBe("env-refresh-token");

    await saveRefreshToken(path, "rotated-refresh-token");
    await expect(loadRefreshToken(path, "env-refresh-token")).resolves.toBe("rotated-refresh-token");
    await expect(readFile(path, "utf8")).resolves.toBe("rotated-refresh-token\n");
  });
});
