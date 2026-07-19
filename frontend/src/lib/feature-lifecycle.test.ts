import { describe, expect, it, vi } from "vitest";

import { DeviceFeatureLifecycleRegistry } from "./feature-lifecycle.js";

describe("DeviceFeatureLifecycleRegistry", () => {
  it("resets only the lifecycle appropriate to the boundary", () => {
    const registry = new DeviceFeatureLifecycleRegistry();
    const resetForAuthenticatorChange = vi.fn();
    const resetForTest = vi.fn();

    registry.register("lab", { resetForAuthenticatorChange, resetForTest });
    registry.resetForAuthenticatorChange();

    expect(resetForAuthenticatorChange).toHaveBeenCalledOnce();
    expect(resetForTest).not.toHaveBeenCalled();

    registry.resetForTest();
    expect(resetForTest).toHaveBeenCalledOnce();
  });

  it("allows a loaded feature to leave the registry", () => {
    const registry = new DeviceFeatureLifecycleRegistry();
    const resetForAuthenticatorChange = vi.fn();
    const dispose = registry.register("overview", {
      resetForAuthenticatorChange,
      resetForTest: vi.fn(),
    });

    dispose();
    registry.resetForAuthenticatorChange();

    expect(resetForAuthenticatorChange).not.toHaveBeenCalled();
  });

  it("does not unregister a replacement lifecycle through a stale disposer", () => {
    const registry = new DeviceFeatureLifecycleRegistry();
    const firstReset = vi.fn();
    const secondReset = vi.fn();
    const disposeFirst = registry.register("security", {
      resetForAuthenticatorChange: firstReset,
      resetForTest: vi.fn(),
    });
    registry.register("security", {
      resetForAuthenticatorChange: secondReset,
      resetForTest: vi.fn(),
    });

    disposeFirst();
    registry.resetForAuthenticatorChange();

    expect(firstReset).not.toHaveBeenCalled();
    expect(secondReset).toHaveBeenCalledOnce();
  });
});
