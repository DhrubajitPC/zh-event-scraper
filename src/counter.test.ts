import { describe, expect, it } from "vitest";

import { incrementCount } from "./counter";

describe("incrementCount", () => {
  it("increments the current count by one", () => {
    expect(incrementCount(0)).toBe(1);
    expect(incrementCount(4)).toBe(5);
  });
});
