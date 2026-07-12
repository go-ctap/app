import { describe, expect, it } from "vitest";

import { resolveWindowPlatform, windowPlatformFromOS } from "$lib/window-platform";

describe("window platform", () => {
  it.each([
    ["darwin", "macos"],
    ["linux", "linux"],
    ["windows", "windows"],
    ["plan9", null],
  ] as const)("maps %s to %s", (os, expected) => {
    expect(windowPlatformFromOS(os)).toBe(expected);
  });

  it("resolves the platform asynchronously when startup flags are not ready", async () => {
    expect(await resolveWindowPlatform()).toBe("linux");
  });
});
