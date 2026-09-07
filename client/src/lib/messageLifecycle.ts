import type { OverlayChatMessage } from "@shared/chat";

export function getActiveMessages(messages: OverlayChatMessage[], now: number, durationSeconds: number) {
  return messages.filter((message) => now - message.timestamp < durationSeconds * 1000);
}
