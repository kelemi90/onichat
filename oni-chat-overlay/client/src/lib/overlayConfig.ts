import {
  ALLOWED_ACCENTS,
  ALLOWED_ANIMATIONS,
  ALLOWED_THEMES,
  DEFAULT_OVERLAY_CONFIG,
  type OverlayConfig,
} from "@shared/chat";

const numberParam = (params: URLSearchParams, key: string, fallback: number, min: number, max: number) => {
  const value = Number(params.get(key));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};

const booleanParam = (params: URLSearchParams, key: string, fallback: boolean) => {
  const value = params.get(key);
  if (value === null) return fallback;
  return value === "true" || value === "1";
};

export function readOverlayConfig(search = window.location.search): OverlayConfig {
  const params = new URLSearchParams(search);
  const animation = params.get("animation");
  const theme = params.get("theme");
  const accent = params.get("accent");

  return {
    ...DEFAULT_OVERLAY_CONFIG,
    channel: (params.get("channel") ?? "").replace(/^#/, "").trim().toLowerCase().slice(0, 25),
    duration: numberParam(params, "duration", DEFAULT_OVERLAY_CONFIG.duration, 2, 120),
    maxMessages: numberParam(params, "maxMessages", DEFAULT_OVERLAY_CONFIG.maxMessages, 1, 30),
    fontSize: numberParam(params, "fontSize", DEFAULT_OVERLAY_CONFIG.fontSize, 12, 42),
    width: numberParam(params, "width", DEFAULT_OVERLAY_CONFIG.width, 240, 1000),
    speed: numberParam(params, "speed", DEFAULT_OVERLAY_CONFIG.speed, 0.5, 2),
    opacity: numberParam(params, "opacity", DEFAULT_OVERLAY_CONFIG.opacity, 0.2, 1),
    animation: ALLOWED_ANIMATIONS.includes(animation as never) ? (animation as OverlayConfig["animation"]) : DEFAULT_OVERLAY_CONFIG.animation,
    theme: ALLOWED_THEMES.includes(theme as never) ? (theme as OverlayConfig["theme"]) : DEFAULT_OVERLAY_CONFIG.theme,
    accent: ALLOWED_ACCENTS.includes(accent as never) ? (accent as OverlayConfig["accent"]) : DEFAULT_OVERLAY_CONFIG.accent,
    showBadges: booleanParam(params, "badges", DEFAULT_OVERLAY_CONFIG.showBadges),
    showTimestamps: booleanParam(params, "timestamps", DEFAULT_OVERLAY_CONFIG.showTimestamps),
    showUsernames: booleanParam(params, "usernames", DEFAULT_OVERLAY_CONFIG.showUsernames),
    showEmotes: booleanParam(params, "emotes", DEFAULT_OVERLAY_CONFIG.showEmotes),
    compact: booleanParam(params, "compact", DEFAULT_OVERLAY_CONFIG.compact),
    demo: booleanParam(params, "demo", DEFAULT_OVERLAY_CONFIG.demo),
  };
}

export function toOverlayUrl(config: OverlayConfig, origin = window.location.origin) {
  const params = new URLSearchParams();
  if (config.channel) params.set("channel", config.channel);
  params.set("duration", String(config.duration));
  params.set("maxMessages", String(config.maxMessages));
  params.set("fontSize", String(config.fontSize));
  params.set("width", String(config.width));
  params.set("animation", config.animation);
  params.set("speed", String(config.speed));
  params.set("theme", config.theme);
  params.set("accent", config.accent);
  params.set("badges", String(config.showBadges));
  params.set("timestamps", String(config.showTimestamps));
  params.set("usernames", String(config.showUsernames));
  params.set("emotes", String(config.showEmotes));
  params.set("compact", String(config.compact));
  if (config.demo) params.set("demo", "true");
  return `${origin}/overlay?${params.toString()}`;
}
