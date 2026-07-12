import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AlwaysUVTarget,
  AuthenticatorConfigStatus,
  CapabilityState,
  PINStatus,
  RetryState,
  StateValue,
  UVStatus,
} from "../../../../bindings/github.com/go-ctap/kit/model/config";

import { setAppLocale } from "$lib/i18n";

import SecurityUserVerification from "./SecurityUserVerification.svelte";

function clientPIN() {
  return new PINStatus({
    state: StateValue.StateConfigured,
    supported: true,
    configured: true,
    protocolSupported: true,
    retries: new RetryState({ state: StateValue.StateConfigured, remaining: 8 }),
  });
}

function builtInUV(supported: boolean) {
  return new UVStatus({
    state: supported ? StateValue.StateConfigured : StateValue.StateUnsupported,
    supported,
    configured: supported ? true : undefined,
    retries: new RetryState({
      state: supported ? StateValue.StateConfigured : StateValue.StateUnknown,
      remaining: supported ? 5 : undefined,
    }),
  });
}

function authenticatorConfig(alwaysUV = false) {
  return new AuthenticatorConfigStatus({
    state: StateValue.StateSupported,
    supported: true,
    alwaysUv: new CapabilityState({
      state: alwaysUV ? StateValue.StateConfigured : StateValue.StateNotConfigured,
      supported: true,
      configured: alwaysUV,
    }),
  });
}

describe("SecurityUserVerification", () => {
  beforeEach(() => setAppLocale("en"));
  afterEach(() => cleanup());

  it("keeps Always UV actionable when only Client PIN can satisfy it", async () => {
    const onAlwaysUVChange = vi.fn(async () => true);
    render(SecurityUserVerification, {
      props: {
        pin: clientPIN(),
        uv: builtInUV(false),
        authenticatorConfig: authenticatorConfig(false),
        disabled: false,
        onAlwaysUVChange,
      },
    });

    const builtInSection = screen.getByRole("heading", { name: "Built-in verification" }).closest("section");
    expect(builtInSection).not.toBeNull();
    expect(within(builtInSection!).getByText("Unsupported")).toBeInTheDocument();

    const alwaysUVSection = screen.getByRole("heading", { name: "Always UV" }).closest("section");
    expect(alwaysUVSection).not.toBeNull();
    expect(within(alwaysUVSection!).getByText("Disabled")).toBeInTheDocument();
    expect(within(alwaysUVSection!).getByText("Client PIN: Configured")).toBeInTheDocument();

    const toggle = within(alwaysUVSection!).getByRole("switch", { name: "Always UV" });
    expect(toggle).toBeEnabled();
    await fireEvent.click(toggle);
    expect(onAlwaysUVChange).toHaveBeenCalledWith(AlwaysUVTarget.AlwaysUVTargetEnable);
  });

  it("shows Client PIN and built-in UV as separate ways to satisfy Always UV", () => {
    render(SecurityUserVerification, {
      props: {
        pin: clientPIN(),
        uv: builtInUV(true),
        authenticatorConfig: authenticatorConfig(true),
        disabled: false,
        onAlwaysUVChange: vi.fn(async () => true),
      },
    });

    const alwaysUVSection = screen.getByRole("heading", { name: "Always UV" }).closest("section");
    expect(alwaysUVSection).not.toBeNull();
    expect(within(alwaysUVSection!).getByText("Client PIN: Configured")).toBeInTheDocument();
    expect(within(alwaysUVSection!).getByText("Built-in verification: Configured")).toBeInTheDocument();
    expect(within(alwaysUVSection!).getByText("Enabled")).toBeInTheDocument();
  });
});
