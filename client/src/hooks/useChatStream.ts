import { useEffect, useRef, useState } from "react";
import type { OverlayChatMessage, RelayStatus } from "@shared/chat";
import { demoMessages } from "@/lib/demoMessages";

export function useChatStream(channel: string, demo: boolean, maxMessages: number) {
  const [messages, setMessages] = useState<OverlayChatMessage[]>(demo ? demoMessages : []);
  const [status, setStatus] = useState<RelayStatus>({ state: demo ? "connected" : "connecting", channel });
  const retryRef = useRef(0);

  useEffect(() => {
    if (demo || !channel) {
      setMessages(demo ? demoMessages : []);
      setStatus({ state: demo ? "connected" : "error", channel, detail: demo ? "Demo signal active" : "Add a channel in the control room" });
      if (!demo) return;
      let cursor = demoMessages.length;
      const timer = window.setInterval(() => {
        const next = { ...demoMessages[cursor % demoMessages.length], id: `demo-${Date.now()}`, timestamp: Date.now() };
        cursor += 1;
        setMessages((current) => [...current, next].slice(-maxMessages));
      }, 3200);
      return () => window.clearInterval(timer);
    }

    let socket: WebSocket | null = null;
    let timer: number | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus({ state: retryRef.current ? "reconnecting" : "connecting", channel });
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/chat?channel=${encodeURIComponent(channel)}`);
      socket.onopen = () => {
        retryRef.current = 0;
        setStatus({ state: "connected", channel, detail: "Live relay connected" });
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as OverlayChatMessage | (RelayStatus & { type: "status" });
          if ("type" in payload && payload.type === "status") {
            setStatus({ state: payload.state, channel: payload.channel, detail: payload.detail });
            return;
          }
          const message = payload as OverlayChatMessage;
          if (message.id && message.username) setMessages((current) => [...current, message].slice(-maxMessages));
        } catch {
          setStatus({ state: "error", channel, detail: "Relay sent an unreadable message" });
        }
      };
      socket.onerror = () => setStatus({ state: "error", channel, detail: "Relay connection error" });
      socket.onclose = () => {
        if (disposed) return;
        const delay = Math.min(30000, 1000 * 2 ** retryRef.current);
        retryRef.current += 1;
        timer = window.setTimeout(connect, delay);
      };
    };

    connect();
    return () => {
      disposed = true;
      if (timer) window.clearTimeout(timer);
      socket?.close();
    };
  }, [channel, demo, maxMessages]);

  return { messages, status };
}
