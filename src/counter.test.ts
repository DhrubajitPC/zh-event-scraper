import { describe, expect, it } from "vite-plus/test";

import { incrementCount } from "./counter";

describe("incrementCount", () => {
  it("increments the current count by one", () => {
    expect(incrementCount(0)).toBe(1);
    expect(incrementCount(4)).toBe(5);
  });
});
