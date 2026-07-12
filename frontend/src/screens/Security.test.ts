import { cleanup, render, screen, within } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import {
  AuthenticatorConfigStatus,
  BioStatus,
  CapabilityState,
  LimitsStatus,
  PINStatus,
  ResetHints,
  RetryState,
  StateValue,
  StatusReport,
  UVStatus,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { ConfigStatusEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { completeSecurityStatusLoad } from "$lib/features/security/state";
import { setAppLocale } from "$lib/i18n";
import { resetAppStateForTest, seedSelectionForTest } from "$lib/store-test-utils";

import Security from "./Security.svelte";

const token = new DeviceReport({
  deviceId: "token-1",
  ordinalAlias: "token-1",
  stableId: true,
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  product: "Test authenticator",
});

function statusEnvelope(): ConfigStatusEnvelope {
  const unsupported = new CapabilityState({
    state: StateValue.StateUnsupported,
    supported: false,
  });
  const report = new StatusReport({
    device: token,
    pin: new PINStatus({
      state: StateValue.StateConfigured,
      supported: true,
      configured: true,
      protocolSupported: true,
      minPINLength: 4,
      maxPINLength: 63,
      retries: new RetryState({ state: StateValue.StateConfigured, remaining: 8 }),
    }),
    uv: new UVStatus({
      state: StateValue.StateSupported,
      supported: true,
      configured: false,
      retries: new RetryState({ state: StateValue.StateUnknown }),
    }),
    bio: new BioStatus({
      state: StateValue.StateUnsupported,
      supported: false,
      configured: false,
      uvBioEnroll: unsupported,
    }),
    authenticatorConfig: new AuthenticatorConfigStatus({
      state: StateValue.StateSupported,
      supported: true,
      uvAcfg: new CapabilityState({ state: StateValue.StateSupported, supported: true }),
      alwaysUv: new CapabilityState({
        state: StateValue.StateConfigured,
        supported: true,
        configured: false,
      }),
      setMinPINLength: new CapabilityState({ state: StateValue.StateSupported, supported: true }),
    }),
    resetHints: new ResetHints({ longTouchForReset: StateValue.StateSupported }),
    limits: new LimitsStatus({
      minPINLength: 4,
      maxPINLength: 63,
      maxRPIDsForSetMinPINLength: 3,
    }),
  });

  return {
    operationId: "security-status-1",
    sessionId: "session-1",
    kind: OperationKind.OperationConfigStatus,
    result: { report },
  } as ConfigStatusEnvelope;
}

describe("Security screen", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
    seedSelectionForTest(token.deviceId, token, { state: "ready", sessionId: "session-1" });
    completeSecurityStatusLoad(statusEnvelope(), "2026-07-12T00:00:00.000Z");
  });

  afterEach(() => cleanup());

  it("renders the required heading hierarchy without a redundant in-page navigation", () => {
    render(Security);

    expect(screen.getByRole("heading", { level: 1, name: "Security" })).toBeInTheDocument();
    for (const name of [
      "Security overview",
      "PIN",
      "User verification",
      "Biometric enrollments",
      "PIN policy",
      "Factory reset",
    ]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByRole("heading", { level: 3, name: "Always UV" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Biometric sensor" })).toBeInTheDocument();
    expect(screen.getByText(/Client PIN or built-in UV/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Always UV" })).toBeEnabled();

    const overview = document.getElementById("security-overview");
    expect(overview).not.toBeNull();
    expect(overview!.querySelectorAll(".security-summary")).toHaveLength(3);
    expect(within(overview!).getByRole("heading", { level: 3, name: "User verification" })).toBeInTheDocument();
    expect(within(overview!).queryByRole("heading", { level: 3, name: "Biometrics" })).not.toBeInTheDocument();

    const expectedAnchors = [
      "security-overview",
      "security-pin",
      "security-user-verification",
      "security-always-uv",
      "security-biometric-sensor",
      "security-biometric-enrollments",
      "security-pin-policy",
      "security-factory-reset",
    ];
    expect(screen.queryByRole("navigation", { name: "Security sections" })).not.toBeInTheDocument();
    for (const id of expectedAnchors) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });
});
