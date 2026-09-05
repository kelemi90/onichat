import { useEffect, useState } from "react";
import type { OverlayChatMessage } from "@shared/chat";

type Props = { message: OverlayChatMessage; duration: number; showBadges: boolean; showTimestamps: boolean; showUsernames: boolean; showEmotes: boolean; compact: boolean; animation: string; speed: number };

function Badge({ type, url }: { type: string; url?: string }) {
  const labels: Record<string, string> = { broadcaster: "LIVE", moderator: "MOD", subscriber: "SUB", vip: "VIP", bits: "BITS", founder: "FOUNDER", partner: "PARTNER" };
  return <span className={`chat-badge badge-${type}`} aria-label={`${type} badge`}>{url ? <img src={url} alt="" loading="lazy" /> : labels[type] ?? type.toUpperCase()}</span>;
}

function MessageContent({ message, showEmotes }: { message: OverlayChatMessage; showEmotes: boolean }) {
  if (!showEmotes || message.emotes.length === 0) return <>{message.text}</>;
  const ranges = [...message.emotes].sort((a, b) => a.start - b.start);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((emote, index) => {
    if (emote.start < cursor) return;
    if (emote.start > cursor) parts.push(message.text.slice(cursor, emote.start));
    parts.push(<img key={`${emote.id}-${index}`} className="chat-emote" src={emote.url} alt={emote.name || message.text.slice(emote.start, emote.end + 1)} />);
    cursor = emote.end + 1;
  });
  if (cursor < message.text.length) parts.push(message.text.slice(cursor));
  return <>{parts}</>;
}

export default function ChatMessage({ message, duration, showBadges, showTimestamps, showUsernames, showEmotes, compact, animation, speed }: Props) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), duration * 1000);
    return () => window.clearTimeout(timer);
  }, [duration]);

  return <article className={`chat-message animation-${animation} ${visible ? "is-visible" : "is-leaving"} ${compact ? "is-compact" : ""} ${message.system ? `system-${message.system}` : ""}`} style={{ animationDuration: `${0.42 / speed}s` }}>
    <div className="message-rail" />
    <div className="message-body">
      <div className="message-meta">
        {showBadges && message.badges.map((badge, index) => <Badge key={`${badge.type}-${index}`} type={badge.type} url={badge.url} />)}
        {showUsernames && <span className="message-name" style={{ color: message.color }}>{message.displayName}</span>}
        {showTimestamps && <time>{new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}
        {message.bits && <span className="message-event">+{message.bits} BITS</span>}
      </div>
      <div className="message-text"><MessageContent message={message} showEmotes={showEmotes} /></div>
    </div>
  </article>;
}
