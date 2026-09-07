import nodemailer from "nodemailer";

export const STREAMER_REQUEST_RECIPIENT = "lakimmo@protonmail.com";

export type StreamerRequestEmailInput = {
  tenant: string;
  channel: string;
  note?: string;
};

export function buildStreamerRequestEmail(input: StreamerRequestEmailInput) {
  const note = input.note?.trim() || "none";
  const subject = `New Oni streamer access request: ${input.tenant}`;
  const text = [
    "A new Oni Chat Overlay streamer access request was submitted.",
    "",
    `Streamer ID: ${input.tenant}`,
    `Twitch channel: #${input.channel}`,
    `Note: ${note}`,
    "",
    `Review the request in the Oni admin panel and correspond with the requester via ${STREAMER_REQUEST_RECIPIENT}.`,
  ].join("\n");

  return {
    subject,
    text,
    to: STREAMER_REQUEST_RECIPIENT,
  };
}

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER?.trim();
  const password = process.env.SMTP_PASSWORD?.trim();
  const from = process.env.SMTP_FROM?.trim();

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !from) return null;

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
    from,
  };
}

export async function sendStreamerRequestEmail(input: StreamerRequestEmailInput) {
  const config = smtpConfig();
  if (!config) {
    console.warn("[request-email] SMTP is not configured; request email was not sent");
    return { sent: false as const, reason: "not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  const message = buildStreamerRequestEmail(input);
  const result = await transporter.sendMail({
    from: config.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
  });

  return { sent: true as const, messageId: result.messageId };
}

export function smtpIsConfigured() {
  return smtpConfig() !== null;
}

export async function verifySmtpConnection() {
  const config = smtpConfig();
  if (!config) return { verified: false as const, reason: "not_configured" as const };

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });
  await transporter.verify();
  return { verified: true as const };
}
