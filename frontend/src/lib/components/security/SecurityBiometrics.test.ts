import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BioStatus,
  CapabilityState,
  StateValue,
} from "../../../../bindings/github.com/go-ctap/kit/model/config";
import type {
  BioListEnvelope,
  BioSensorEnvelope,
} from "../../../../bindings/github.com/go-ctap/kit/service";

import { emptySecurityResourceState } from "$lib/features/security/state";
import { setAppLocale } from "$lib/i18n";

import SecurityBiometrics from "./SecurityBiometrics.svelte";

function bioStatus(supported: boolean, configured: boolean) {
  return new BioStatus({
    state: supported ? StateValue.StateSupported : StateValue.StateUnsupported,
    supported,
    configured,
    uvBioEnroll: new CapabilityState({
      state: supported ? StateValue.StateSupported : StateValue.StateUnsupported,
      supported,
    }),
  });
}

function renderBiometrics(bio: BioStatus) {
  render(SecurityBiometrics, {
    props: {
      bio,
      sensorState: emptySecurityResourceState<BioSensorEnvelope>(),
      enrollmentState: emptySecurityResourceState<BioListEnvelope>(),
      disabled: false,
      loadDisabled: false,
      onReloadStatus: vi.fn(async () => true),
      onLoadEnrollments: vi.fn(async () => true),
      onEnroll: vi.fn(async () => true),
      onRename: vi.fn(async () => true),
      onRemove: vi.fn(async () => true),
    },
  });
}

describe("SecurityBiometrics", () => {
  beforeEach(() => setAppLocale("en"));
  afterEach(() => cleanup());

  it("does not offer biometric actions when the authenticator does not support them", () => {
    renderBiometrics(bioStatus(false, false));

    expect(screen.queryByRole("button", { name: "Enroll biometric" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load enrollments" })).not.toBeInTheDocument();
  });

  it("offers one enrollment action when biometrics are not configured", () => {
    renderBiometrics(bioStatus(true, false));

    expect(screen.getAllByRole("button", { name: "Enroll biometric" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Load enrollments" })).not.toBeInTheDocument();
  });

  it("keeps enrollment actions in one header when biometrics are configured", () => {
    renderBiometrics(bioStatus(true, true));

    expect(screen.getAllByRole("button", { name: "Enroll biometric" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Load enrollments" })).toHaveLength(1);
  });
});
