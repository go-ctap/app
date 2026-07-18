import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
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

import {
  completeSecurityStatusLoad,
  emptySecurityResourceState,
  failSecurityStatusLoadAtRuntime,
  securityStatus,
} from "$lib/features/security/state";
import { setAppLocale } from "$lib/i18n";
import { resetAppStateForTest, seedSelectionForTest } from "$lib/store-test-utils";
import { failureForCode } from "$lib/test-failure";

import Security from "./Security.svelte";

const token = new DeviceReport({
  fingerprint: "token-1",
  ordinalAlias: "token-1",
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  product: "Test authenticator",
});

function statusEnvelope(maxPINLength = 63): ConfigStatusEnvelope {
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
      maxPINLength,
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
      maxPINLength,
      maxRPIDsForSetMinPINLength: 3,
    }),
  });

  return {
    operationId: "security-status-1",
    selectionId: "authenticator-1",
    kind: OperationKind.OperationConfigStatus,
    result: { report },
  } as ConfigStatusEnvelope;
}

describe("Security screen", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
    seedSelectionForTest(token.fingerprint, token, { state: "ready", selectionId: "authenticator-1" });
    completeSecurityStatusLoad(statusEnvelope());
  });

  afterEach(() => cleanup());

  it("shows the current verification configuration and supported controls", () => {
    render(Security);

    expect(screen.getByText(/Client PIN or built-in UV/)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Always UV" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Factory reset" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reload overview" })).not.toBeInTheDocument();
  });

  it("shows and enforces the effective CTAP maximum PIN length", () => {
    completeSecurityStatusLoad(statusEnvelope());
    render(Security);

    expect(screen.getByRole("spinbutton", { name: "Minimum PIN length" })).toHaveAttribute("max", "63");
    expect(screen.getByText(/Maximum PIN length: 63/)).toBeInTheDocument();
  });

  it("keeps a status-load failure out of the empty state", () => {
    securityStatus.set(emptySecurityResourceState());
    failSecurityStatusLoadAtRuntime(failureForCode(Code.CodePINInvalid));

    render(Security);

    expect(screen.getByText("This authenticator does not expose the requested security capability.")).toBeInTheDocument();
    expect(screen.queryByText("The PIN is invalid.")).not.toBeInTheDocument();
  });
});
