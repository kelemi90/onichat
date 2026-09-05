import { describe, expect, it } from "vitest";
import { readOverlayConfig, toOverlayUrl } from "./overlayConfig";

describe("overlay configuration", () => {
  it("clamps unsafe values and normalizes the channel", () => {
    const config = readOverlayConfig("?channel=%23My_Channel&duration=999&fontSize=4&maxMessages=99&demo=true");
    expect(config.channel).toBe("my_channel");
    expect(config.duration).toBe(120);
    expect(config.fontSize).toBe(12);
    expect(config.maxMessages).toBe(30);
    expect(config.demo).toBe(true);
  });

  it("creates a copyable overlay URL without credentials", () => {
    const config = readOverlayConfig("?channel=oni&theme=oni&accent=magenta&demo=true");
    const url = toOverlayUrl(config, "https://chat.example.test");
    expect(url).toContain("/overlay?");
    expect(url).toContain("channel=oni");
    expect(url).toContain("demo=true");
    expect(url).not.toMatch(/token|oauth|secret/i);
  });
});
