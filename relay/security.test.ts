import { describe, expect, it } from "vitest";
import { ConnectionLimiter, isOriginAllowed, normalizeChannel, parseAllowedOrigins } from "./security";

describe("relay security", () => {
  it("normalizes only safe Twitch channel names", () => {
    expect(normalizeChannel("#Oni_Channel")).toBe("oni_channel");
    expect(normalizeChannel("bad channel")).toBeNull();
    expect(normalizeChannel("<script>alert(1)</script>")).toBeNull();
  });

  it("requires an exact configured browser origin", () => {
    const allowed = parseAllowedOrigins("https://oni.laiki.fi, http://localhost:3000");
    expect(isOriginAllowed("https://oni.laiki.fi", allowed)).toBe(true);
    expect(isOriginAllowed("https://evil.example", allowed)).toBe(false);
    expect(isOriginAllowed(undefined, allowed)).toBe(false);
  });

  it("limits repeated connections from one address", () => {
    const limiter = new ConnectionLimiter(2, 1000);
    expect(limiter.allow("127.0.0.1", 100)).toBe(true);
    expect(limiter.allow("127.0.0.1", 200)).toBe(true);
    expect(limiter.allow("127.0.0.1", 300)).toBe(false);
    expect(limiter.allow("127.0.0.1", 1200)).toBe(true);
  });
});
