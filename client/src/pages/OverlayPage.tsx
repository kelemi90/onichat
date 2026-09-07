import { useEffect, useMemo, useState } from "react";
import { readOverlayConfig } from "@/lib/overlayConfig";
import { useChatStream } from "@/hooks/useChatStream";
import ChatMessage from "@/components/overlay/ChatMessage";
import { getActiveMessages } from "@/lib/messageLifecycle";

export default function OverlayPage() {
  const config = useMemo(() => readOverlayConfig(), []);
  const { messages, status } = useChatStream(config.channel, config.demo, config.maxMessages);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    document.documentElement.classList.add("overlay-document");
    document.body.classList.add("overlay-document");
    return () => {
      document.documentElement.classList.remove("overlay-document");
      document.body.classList.remove("overlay-document");
    };
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);
  const activeMessages = getActiveMessages(messages, now, config.duration);

  return <main className={`overlay-shell theme-${config.theme} accent-${config.accent} horizontal-${config.horizontal} vertical-${config.vertical} ${config.compact ? "compact" : ""}`} style={{ "--chat-width": `${config.width}px`, "--font-size": `${config.fontSize}px`, "--message-color": config.messageColor, "--overlay-opacity": config.opacity } as React.CSSProperties}>
    <div className="overlay-scanlines" aria-hidden="true" />
    <div className="overlay-corner overlay-corner-a" aria-hidden="true" />
    <div className="overlay-corner overlay-corner-b" aria-hidden="true" />
    <section className="chat-stack" aria-live="polite" aria-label="Twitch chat">
      {activeMessages.map((message) => <ChatMessage key={message.id} message={message} duration={config.duration} showBadges={config.showBadges} showTimestamps={config.showTimestamps} showUsernames={config.showUsernames} showEmotes={config.showEmotes} compact={config.compact} animation={config.animation} speed={config.speed} messageColor={config.messageColor} />)}
    </section>
    {!config.demo && status.state !== "connected" && <div className="relay-status">{status.detail ?? "LINKING TO RELAY"}</div>}
  </main>;
}
