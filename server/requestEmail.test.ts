import { afterEach, describe, expect, it } from "vitest";
import { buildStreamerRequestEmail, sendStreamerRequestEmail, smtpIsConfigured, STREAMER_REQUEST_RECIPIENT, verifySmtpConnection } from "./requestEmail";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("streamer request email", () => {
  it("formats a plain-text request addressed to the configured owner", () => {
    const email = buildStreamerRequestEmail({ tenant: "night-oni", channel: "test_channel", note: "Please review" });
    expect(email.to).toBe(STREAMER_REQUEST_RECIPIENT);
    expect(email.subject).toContain("night-oni");
    expect(email.text).toContain("#test_channel");
    expect(email.text).toContain("Please review");
  });

  it("verifies the configured SMTP endpoint without sending a message", async () => {
    if (!smtpIsConfigured()) return;
    expect(await verifySmtpConnection()).toEqual({ verified: true });
  });

  it("fails safely without attempting SMTP when secrets are absent", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    delete process.env.SMTP_FROM;
    expect(await sendStreamerRequestEmail({ tenant: "night-oni", channel: "test_channel" })).toEqual({ sent: false, reason: "not_configured" });
  });
});
