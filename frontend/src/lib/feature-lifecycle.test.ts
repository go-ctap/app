import { describe, expect, it, vi } from "vitest";

import { DeviceFeatureLifecycleRegistry } from "$lib/feature-lifecycle.js";

describe("DeviceFeatureLifecycleRegistry", () => {
  it("resets loaded features at the authenticator boundary", () => {
    const registry = new DeviceFeatureLifecycleRegistry();
    const resetForAuthenticatorChange = vi.fn();

    registry.register("lab", { resetForAuthenticatorChange });
    registry.resetForAuthenticatorChange();

    expect(resetForAuthenticatorChange).toHaveBeenCalledOnce();
  });

  it("allows a loaded feature to leave the registry", () => {
    const registry = new DeviceFeatureLifecycleRegistry();
    const resetForAuthenticatorChange = vi.fn();
    const dispose = registry.register("overview", {
      resetForAuthenticatorChange,
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
    });

    registry.register("security", {
      resetForAuthenticatorChange: secondReset,
    });

    disposeFirst();
    registry.resetForAuthenticatorChange();

    expect(firstReset).not.toHaveBeenCalled();
    expect(secondReset).toHaveBeenCalledOnce();
  });
});
