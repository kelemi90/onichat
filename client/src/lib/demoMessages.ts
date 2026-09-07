import type { OverlayChatMessage } from "@shared/chat";

export const demoMessages: OverlayChatMessage[] = [
  { id: "demo-1", username: "nightbyte", displayName: "NightByte", color: "#57e6ff", text: "the neon skyline is immaculate tonight", badges: [{ type: "vip" }], emotes: [], timestamp: Date.now() - 5200 },
  { id: "demo-2", username: "oni_signal", displayName: "Oni_Signal", color: "#ff4fba", text: "this build has serious after-hours energy", badges: [{ type: "subscriber" }], emotes: [], timestamp: Date.now() - 4100 },
  { id: "demo-3", username: "mod_kitsune", displayName: "Mod_Kitsune", color: "#b7a5ff", text: "welcome in, runners. keep it clean and enjoy the stream.", badges: [{ type: "moderator" }], emotes: [], timestamp: Date.now() - 3100 },
  { id: "demo-4", username: "chromed_heart", displayName: "Chromed_Heart", color: "#ff6c91", text: "THE DROP!!!", badges: [{ type: "bits" }], emotes: [], timestamp: Date.now() - 1500, bits: 100 },
];
