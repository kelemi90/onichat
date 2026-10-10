import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

type TwitchTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export type RefreshedTwitchToken = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export async function requestTwitchTokenRefresh(
  refreshToken: string,
  clientId: string,
  clientSecret: string | undefined,
  fetcher: typeof fetch = fetch,
): Promise<RefreshedTwitchToken> {
  const params = new URLSearchParams({
    client_id: clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  if (clientSecret) params.set("client_secret", clientSecret);

  const response = await fetcher("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) throw new Error(`Twitch token refresh failed (HTTP ${response.status})`);

  const token = await response.json() as TwitchTokenResponse;
  if (!token.access_token || !token.expires_in || token.expires_in <= 0) {
    throw new Error("Twitch refresh response was incomplete");
  }
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token || refreshToken,
    expiresIn: token.expires_in,
  };
}

export async function loadRefreshToken(path: string, fallback?: string): Promise<string | undefined> {
  try {
    const token = (await readFile(path, "utf8")).trim();
    if (!token) throw new Error(`Twitch refresh token file is empty: ${path}`);
    return token;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function saveRefreshToken(path: string, token: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${token}\n`, { encoding: "utf8", mode: 0o600, flag: "wx" });
    await rename(temporaryPath, path);
  } catch (error) {
    const { unlink } = await import("node:fs/promises");
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
