import { describe, expect, it } from "vitest";
import { getActiveMessages } from "./messageLifecycle";

describe("message lifecycle", () => {
  it("removes messages past their configured display duration", () => {
    const now = 20_000;
    const messages = [
      { id: "fresh", timestamp: 15_000 },
      { id: "expired", timestamp: 9_999 },
    ] as never[];
    expect(getActiveMessages(messages, now, 8).map((message) => message.id)).toEqual(["fresh"]);
  });
});
