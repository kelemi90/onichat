export const CHANNEL_PATTERN = /^[a-z0-9_]{1,25}$/;

export function normalizeChannel(value: string) {
  const normalized = value.trim().replace(/^#/, "").toLowerCase();
  return CHANNEL_PATTERN.test(normalized) ? normalized : null;
}

export function parseAllowedOrigins(value: string | undefined) {
  return new Set((value ?? "").split(",").map((origin) => origin.trim()).filter(Boolean));
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: Set<string>) {
  if (!origin) return false;
  return allowedOrigins.has(origin);
}

export class ConnectionLimiter {
  private readonly attempts = new Map<string, number[]>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(ip: string, now = Date.now()) {
    const cutoff = now - this.windowMs;
    const recent = (this.attempts.get(ip) ?? []).filter((timestamp) => timestamp > cutoff);
    if (recent.length >= this.limit) {
      this.attempts.set(ip, recent);
      return false;
    }
    recent.push(now);
    this.attempts.set(ip, recent);
    return true;
  }
}
