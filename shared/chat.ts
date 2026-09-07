export type ChatBadge = {
  type: string;
  url?: string;
};

export type ChatEmote = {
  id: string;
  name: string;
  url: string;
  start: number;
  end: number;
};

export type OverlayChatMessage = {
  id: string;
  username: string;
  displayName: string;
  color: string;
  text: string;
  badges: ChatBadge[];
  emotes: ChatEmote[];
  timestamp: number;
  bits?: number;
  system?: "subscription" | "raid" | "cheer";
};

export type HorizontalPosition = "left" | "center" | "right";
export type VerticalPosition = "top" | "center" | "bottom";

export type RelayStatus = {
  state: "connecting" | "connected" | "reconnecting" | "error";
  channel?: string;
  detail?: string;
};

export const DEFAULT_OVERLAY_CONFIG = {
  channel: "",
  duration: 8,
  maxMessages: 8,
  fontSize: 18,
  width: 520,
  horizontal: "left" as HorizontalPosition,
  vertical: "bottom" as VerticalPosition,
  animation: "hud" as const,
  speed: 1,
  showBadges: true,
  showTimestamps: false,
  showUsernames: true,
  showEmotes: true,
  theme: "oni" as const,
  accent: "magenta" as const,
  messageColor: "#ffffff",
  opacity: 1,
  compact: false,
  demo: false,
};

export type OverlayConfig = typeof DEFAULT_OVERLAY_CONFIG;

export const ALLOWED_HORIZONTAL_POSITIONS = ["left", "center", "right"] as const;
export const ALLOWED_VERTICAL_POSITIONS = ["top", "center", "bottom"] as const;

export const ALLOWED_ANIMATIONS = ["hud", "slide", "fade", "none"] as const;
export const ALLOWED_THEMES = ["oni", "minimal", "matrix"] as const;
export const ALLOWED_ACCENTS = ["magenta", "cyan", "red"] as const;
