import crypto from "node:crypto";

export function parseTags(raw: string) {
  const tags: Record<string, string> = {};
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.split("=");
    tags[key] = rest.join("=").replace(/\\s/g, " ").replace(/\\:/g, ";");
  }
  return tags;
}

export function parsePrivmsg(line: string) {
  const tagMatch = line.match(/^@([^ ]+) /);
  const tags = tagMatch ? parseTags(tagMatch[1]) : {};
  const privmsg = line.match(/ PRIVMSG #[^ ]+ :(.+)$/);
  if (!privmsg) return null;
  const payload = tagMatch ? line.slice(tagMatch[0].length) : line;
  const usernameFromPrefix = payload.match(/^:[^!]+!/)?.[0]?.slice(1, -1) ?? "unknown";
  const displayName = tags["display-name"] || usernameFromPrefix;
  const badges = (tags.badges || "").split(",").filter(Boolean).map((value) => { const [type, version = "1"] = value.split("/"); return { type, url: `https://static-cdn.jtvnw.net/badges/v1/${type}/${version}/1` }; });
  const emotes = (tags.emotes || "").split("/").flatMap((group) => {
    const [id, positions] = group.split(":");
    return (positions || "").split(",").map((range) => { const [start, end] = range.split("-").map(Number); return Number.isFinite(start) ? { id, name: "", url: `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/2.0`, start, end } : null; }).filter(Boolean);
  });
  const bits = Number(tags.bits || 0) || undefined;
  return { id: crypto.randomUUID(), username: usernameFromPrefix, displayName, color: tags.color || "#57e6ff", text: privmsg[1], badges, emotes, timestamp: Date.now(), bits, system: bits ? "cheer" as const : undefined };
}

export function parseUserNotice(line: string) {
  const tagMatch = line.match(/^@([^ ]+) /);
  if (!tagMatch || !line.includes(" USERNOTICE #")) return null;
  const tags = parseTags(tagMatch[1]);
  const messageId = tags["msg-id"];
  if (messageId !== "sub" && messageId !== "resub" && messageId !== "raid") return null;
  const displayName = tags["display-name"] || "Twitch event";
  const text = messageId === "raid" ? `${displayName} is raiding with ${tags["msg-param-viewerCount"] || "new"} viewers` : `${displayName} subscribed${messageId === "resub" ? " again" : ""}`;
  return { id: crypto.randomUUID(), username: displayName.toLowerCase(), displayName, color: tags.color || "#ff4fba", text, badges: [], emotes: [], timestamp: Date.now(), system: messageId === "raid" ? "raid" as const : "subscription" as const };
}

export function reconnectDelay(attempt: number) { return Math.min(30000, 1000 * 2 ** Math.max(0, attempt)); }
