import { describe, expect, it } from "vitest";
import { parsePrivmsg, parseUserNotice, reconnectDelay } from "./parser";

describe("Twitch IRC parser", () => {
  it("normalizes a tagged PRIVMSG with badges, emotes, color, and bits", () => {
    const message = parsePrivmsg("@badge-info=subscriber/12;badges=broadcaster/1,moderator/1,subscriber/12;bits=100;color=#ff4fba;display-name=NeonFox;emotes=25:0-4 :neonfox!u@h PRIVMSG #oni :Kappa hello");
    expect(message).toMatchObject({ displayName: "NeonFox", username: "neonfox", color: "#ff4fba", bits: 100, text: "Kappa hello" });
    expect(message?.badges.map((badge) => badge.type)).toEqual(["broadcaster", "moderator", "subscriber"]);
    expect(message?.badges[0]?.url).toContain("/badges/v1/broadcaster/1/1");
    expect(message?.emotes[0]).toMatchObject({ id: "25", start: 0, end: 4 });
  });

  it("ignores non-chat IRC lines", () => {
    expect(parsePrivmsg("PING :tmi.twitch.tv")).toBeNull();
  });

  it("normalizes subscription and raid notices", () => {
    expect(parseUserNotice("@display-name=NeonFox;msg-id=sub USERNOTICE #oni :")).toMatchObject({ system: "subscription", displayName: "NeonFox" });
    expect(parseUserNotice("@display-name=RaidBoss;msg-id=raid;msg-param-viewerCount=42 USERNOTICE #oni :")).toMatchObject({ system: "raid", text: "RaidBoss is raiding with 42 viewers" });
  });
});

describe("reconnect delay", () => {
  it("backs off and caps at thirty seconds", () => {
    expect(reconnectDelay(0)).toBe(1000);
    expect(reconnectDelay(3)).toBe(8000);
    expect(reconnectDelay(8)).toBe(30000);
  });
});
