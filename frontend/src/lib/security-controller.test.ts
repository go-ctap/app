import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import {
  AlwaysUVTarget,
  AuthenticatorConfigOperation,
  BioMutationOperation,
  StateValue,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { PreviewMode } from "../../bindings/github.com/go-ctap/kit/model/safety";
import type {
  AuthenticatorConfigEnvelope,
  BioEnrollEnvelope,
  BioListEnvelope,
  BioMutationEnvelope,
  BioSensorEnvelope,
  ConfigStatusEnvelope,
  PINEnvelope,
  ResetFactoryEnvelope,
  SessionSnapshot,
} from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { api } from "./api";
import { failureForCode } from "./failure";
import {
  completeSecurityBioSensorLoad,
  completeSecurityStatusLoad,
  securityEnrollments,
  securityMutation,
  securitySensor,
  securityStatus,
} from "./features/security/state";
import {
  devices,
  selectedSelector,
  sessionStatus,
} from "./features/session/state";
import { activeScreen, statusBar } from "./features/workbench/state";
import { setAppLocale } from "./i18n";
import {
  beginAlwaysUVChange,
  beginBioEnrollment,
  beginBioRename,
  beginFactoryReset,
  beginPINPolicyChange,
  changeAuthenticatorPIN,
  confirmSecurityMutation,
  loadSecurityEnrollments,
  loadSecurityStatus,
  maybeLoadSecurity,
  retrySecurityMutation,
  setAuthenticatorPIN,
} from "./security-controller";
import { reloadSecurity, retrySecurityMutation as retrySecurityMutationWithRecovery } from "./controller";
import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "./store-test-utils";

const TOKEN = device("token-1");

function device(id: string): DeviceReport {
  return {
    deviceId: id,
    ordinalAlias: id,
    stableId: true,
    transport: Mode.ModeHID,
    path: id,
    vendorId: 1,
    productId: 2,
    vendor: Vendor.VendorUnknown,
    product: id,
  };
}

function snapshot(item: DeviceReport, sessionId = `session-${item.deviceId}`): SessionSnapshot {
  return {
    id: sessionId,
    info: { device: item, closed: false },
    running: false,
    openedAt: "2026-07-12T00:00:00.000Z",
    updatedAt: "2026-07-12T00:00:00.000Z",
  } as SessionSnapshot;
}

function statusEnvelope(options: {
  item?: DeviceReport;
  sessionId?: string;
  bioSupported?: boolean;
  bioConfigured?: boolean | null;
  alwaysUVConfigured?: boolean | null;
  minPINLength?: number;
  maxPINLength?: number;
  maxRPIDs?: number;
} = {}): ConfigStatusEnvelope {
  const item = options.item ?? TOKEN;
  const bioSupported = options.bioSupported ?? false;
  const minPINLength = options.minPINLength ?? 4;
  return {
    operationId: "status-1",
    sessionId: options.sessionId ?? "session-1",
    kind: OperationKind.OperationConfigStatus,
    result: {
      report: {
        device: item,
        pin: {
          state: StateValue.StateConfigured,
          supported: true,
          configured: true,
          protocolSupported: true,
          minPINLength,
          maxPINLength: options.maxPINLength ?? 63,
          retries: { state: StateValue.StateConfigured, remaining: 8 },
        },
        uv: {
          state: StateValue.StateConfigured,
          supported: true,
          configured: true,
          retries: { state: StateValue.StateConfigured, remaining: 5 },
        },
        bio: {
          state: bioSupported ? StateValue.StateSupported : StateValue.StateUnsupported,
          supported: bioSupported,
          configured: options.bioConfigured ?? false,
          uvBioEnroll: {
            state: bioSupported ? StateValue.StateSupported : StateValue.StateUnsupported,
            supported: bioSupported,
            configured: options.bioConfigured ?? false,
          },
        },
        authenticatorConfig: {
          state: StateValue.StateSupported,
          supported: true,
          uvAcfg: { state: StateValue.StateSupported, supported: true },
          alwaysUv: {
            state: StateValue.StateSupported,
            supported: true,
            configured: options.alwaysUVConfigured ?? false,
          },
          setMinPINLength: { state: StateValue.StateSupported, supported: true },
        },
        resetHints: { longTouchForReset: StateValue.StateUnknown },
        limits: {
          minPINLength,
          maxPINLength: options.maxPINLength ?? 63,
          maxRPIDsForSetMinPINLength: options.maxRPIDs ?? 3,
        },
      },
    },
  } as unknown as ConfigStatusEnvelope;
}

function bioSensorEnvelope(item = TOKEN, sessionId = "session-1"): BioSensorEnvelope {
  return {
    operationId: "sensor-1",
    sessionId,
    kind: OperationKind.OperationBioSensorInfo,
    result: {
      report: {
        device: item,
        supported: true,
        previewOnly: false,
        maxCaptureSamplesRequiredForEnroll: 4,
        maxTemplateFriendlyName: 32,
      },
    },
  } as unknown as BioSensorEnvelope;
}

function bioListEnvelope(item = TOKEN, sessionId = "session-1"): BioListEnvelope {
  return {
    operationId: "bio-list-1",
    sessionId,
    kind: OperationKind.OperationBioList,
    result: {
      report: {
        device: item,
        supported: true,
        previewOnly: false,
        enrollments: [{ templateIDHex: "cafe", friendlyName: "Index finger" }],
      },
    },
  } as unknown as BioListEnvelope;
}

function pinErrorEnvelope(kind: OperationKind): PINEnvelope {
  return {
    operationId: `pin-error-${kind}`,
    sessionId: "session-1",
    kind,
    error: failureForCode(Code.CodeTransportFailure),
  } as PINEnvelope;
}

function authenticatorConfigEnvelope(
  operation: AuthenticatorConfigOperation,
  phase: "preview" | "result",
  error = false,
): AuthenticatorConfigEnvelope {
  const kind = operation === AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV
    ? OperationKind.OperationSetAlwaysUV
    : OperationKind.OperationSetMinPINLength;
  return {
    operationId: `${phase}-${operation}`,
    sessionId: "session-1",
    kind,
    error: error ? failureForCode(Code.CodeTransportFailure) : undefined,
    result: {
      preview: {
        operation,
        device: TOKEN,
        authenticatorConfig: statusEnvelope().result!.report.authenticatorConfig,
        mode: phase === "preview" ? PreviewMode.PreviewModeDryRun : PreviewMode.PreviewModeExecute,
      },
      result: phase === "result"
        ? {
            operation,
            deviceId: TOKEN.deviceId,
            state: StateValue.StateConfigured,
          }
        : null,
    },
  } as unknown as AuthenticatorConfigEnvelope;
}

function bioEnrollPreviewEnvelope(): BioEnrollEnvelope {
  return {
    operationId: "bio-preview-1",
    sessionId: "session-1",
    kind: OperationKind.OperationBioEnroll,
    result: {
      preview: {
        device: TOKEN,
        previewOnly: false,
        timeoutMilliseconds: 60_000,
        mode: PreviewMode.PreviewModeDryRun,
      },
      result: null,
    },
  } as unknown as BioEnrollEnvelope;
}

function partialBioEnrollErrorEnvelope(): BioEnrollEnvelope {
  return {
    operationId: "bio-partial-1",
    sessionId: "session-1",
    kind: OperationKind.OperationBioEnroll,
    error: failureForCode(Code.CodeBioInteractionTimeout),
    result: {
      preview: {
        device: TOKEN,
        previewOnly: false,
        timeoutMilliseconds: 60_000,
        mode: PreviewMode.PreviewModeExecute,
      },
      result: {
        deviceId: TOKEN.deviceId,
        previewOnly: false,
        templateIDHex: "beef",
        samples: [
          { status: "good", remainingSamples: 3 },
          { status: "too-fast", remainingSamples: 3 },
        ],
        lastEnrollSampleStatus: "too-fast",
        remainingSamples: 3,
        cancelAttempted: true,
        cancelSucceeded: true,
      },
    },
  } as unknown as BioEnrollEnvelope;
}

function bioRenamePreviewEnvelope(friendlyName: string): BioMutationEnvelope {
  return {
    operationId: "bio-rename-preview-1",
    sessionId: "session-1",
    kind: OperationKind.OperationBioRename,
    result: {
      preview: {
        operation: BioMutationOperation.BioMutationRename,
        device: TOKEN,
        previewOnly: false,
        templateIDHex: "cafe",
        friendlyName,
        mode: PreviewMode.PreviewModeDryRun,
      },
      result: null,
    },
  } as unknown as BioMutationEnvelope;
}

function invalidSessionStatusEnvelope(): ConfigStatusEnvelope {
  return {
    operationId: "status-invalid-session",
    sessionId: "session-1",
    kind: OperationKind.OperationConfigStatus,
    error: failureForCode(Code.CodeSessionInvalid),
  } as ConfigStatusEnvelope;
}

function resetEnvelope(phase: "preview" | "result"): ResetFactoryEnvelope {
  return {
    operationId: `reset-${phase}-1`,
    sessionId: "session-1",
    kind: OperationKind.OperationResetFactory,
    result: {
      preview: {
        device: TOKEN,
        resetHints: { longTouchForReset: StateValue.StateUnknown },
        mode: phase === "preview" ? PreviewMode.PreviewModeDryRun : PreviewMode.PreviewModeExecute,
      },
      result: phase === "result"
        ? { deviceId: TOKEN.deviceId, reset: true }
        : null,
    },
  } as unknown as ResetFactoryEnvelope;
}

function seedReadyStatus(envelope = statusEnvelope()) {
  completeSecurityStatusLoad(envelope, "2026-07-12T00:00:00.000Z");
}

beforeEach(() => {
  setAppLocale("en");
  resetAppStateForTest();
  seedDevicesForTest([TOKEN]);
  seedSelectionForTest(TOKEN.deviceId, TOKEN, { state: "ready", sessionId: "session-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("security controller loading", () => {
  it("auto-loads only for an active Security screen with a ready selected session", async () => {
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope());
    const bioSensorInfo = vi.spyOn(api, "bioSensorInfo").mockResolvedValue(bioSensorEnvelope());

    expect(await maybeLoadSecurity()).toBe(false);

    seedActiveScreenForTest("security");
    sessionStatus.set({ state: "idle" });
    expect(await maybeLoadSecurity()).toBe(false);

    sessionStatus.set({ state: "ready", sessionId: "session-1" });
    selectedSelector.set("");
    expect(await maybeLoadSecurity()).toBe(false);

    selectedSelector.set(TOKEN.deviceId);
    expect(await maybeLoadSecurity()).toBe(true);
    expect(await maybeLoadSecurity()).toBe(false);

    expect(configStatus).toHaveBeenCalledTimes(1);
    expect(configStatus).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(bioSensorInfo).not.toHaveBeenCalled();
  });

  it("loads ConfigStatus before sensor info only when biometrics are supported", async () => {
    seedActiveScreenForTest("security");
    const enrollments = bioListEnvelope();
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      bioSupported: true,
      bioConfigured: true,
    }));
    const bioSensorInfo = vi.spyOn(api, "bioSensorInfo").mockResolvedValue(bioSensorEnvelope());
    const bioList = vi.spyOn(api, "bioList").mockResolvedValue(enrollments);

    expect(await maybeLoadSecurity()).toBe(true);

    expect(configStatus).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(bioSensorInfo).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(configStatus.mock.invocationCallOrder[0]).toBeLessThan(bioSensorInfo.mock.invocationCallOrder[0]);
    expect(get(securityStatus).phase).toBe("ready");
    expect(get(securitySensor).phase).toBe("ready");
    expect(bioList).not.toHaveBeenCalled();

    expect(await loadSecurityEnrollments()).toBe(true);
    expect(bioList).toHaveBeenCalledWith({ sessionId: "session-1" });
    expect(get(securityEnrollments).lastSuccessfulEnvelope).toBe(enrollments);
  });

  it("treats unconfigured biometrics as an empty explicit list without calling BioList", async () => {
    seedReadyStatus(statusEnvelope({ bioSupported: true, bioConfigured: false }));
    const bioList = vi.spyOn(api, "bioList").mockResolvedValue(bioListEnvelope());

    expect(await loadSecurityEnrollments()).toBe(true);

    expect(bioList).not.toHaveBeenCalled();
    expect(get(securityEnrollments)).toMatchObject({
      phase: "idle",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: null,
    });
  });

  it("keeps thrown status failures separate from generated envelopes", async () => {
    vi.spyOn(api, "configStatus").mockRejectedValue(new Error("Wails bridge unavailable"));

    expect(await loadSecurityStatus()).toBe(false);
    expect(get(securityStatus)).toMatchObject({
      phase: "error",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: failureForCode(Code.CodeInternalError),
    });
  });

  it("recovers an invalid selected session before a user-forced Security reload", async () => {
    seedActiveScreenForTest("security");
    const invalidEnvelope = invalidSessionStatusEnvelope();
    const configStatus = vi.spyOn(api, "configStatus")
      .mockResolvedValueOnce(invalidEnvelope)
      .mockResolvedValueOnce(statusEnvelope({ sessionId: "session-2" }));
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    const openSession = vi.spyOn(api, "openSession").mockResolvedValue(snapshot(TOKEN, "session-2"));

    expect(await loadSecurityStatus()).toBe(false);
    expect(get(securityStatus).responseEnvelope).toBe(invalidEnvelope);
    expect(get(sessionStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    expect(get(sessionStatus).sessionId).toBeUndefined();

    expect(await reloadSecurity()).toBe(true);
    expect(openSession).toHaveBeenCalledWith({ selector: TOKEN.deviceId });
    expect(configStatus.mock.calls[1][0]).toEqual({ sessionId: "session-2" });
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "session-2" });
    expect(get(securityStatus).phase).toBe("ready");
  });
});

describe("security controller mutations", () => {
  it("sends exact confirmed:false PIN requests without retaining secrets or a retry", async () => {
    const setPIN = vi.spyOn(api, "setPIN").mockResolvedValue(pinErrorEnvelope(OperationKind.OperationSetPIN));
    const changePIN = vi.spyOn(api, "changePIN").mockResolvedValue(pinErrorEnvelope(OperationKind.OperationChangePIN));

    expect(await setAuthenticatorPIN({ newPIN: "set-secret-123" })).toBe(false);
    expect(setPIN).toHaveBeenCalledWith({
      sessionId: "session-1",
      newPIN: "set-secret-123",
      confirmed: false,
      confirmationMessage: "Set authenticator PIN",
    });
    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();

    expect(await changeAuthenticatorPIN({
      currentPIN: "old-secret-456",
      newPIN: "new-secret-789",
    })).toBe(false);
    expect(changePIN).toHaveBeenCalledWith({
      sessionId: "session-1",
      currentPIN: "old-secret-456",
      newPIN: "new-secret-789",
      confirmed: false,
      confirmationMessage: "Change authenticator PIN",
    });
    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();
    expect(get(securityMutation)).toEqual({ kind: "idle", phase: "idle" });

    const persistedState = JSON.stringify({
      mutation: get(securityMutation),
      status: get(securityStatus),
      sensor: get(securitySensor),
      enrollments: get(securityEnrollments),
      statusBar: get(statusBar),
    });
    expect(persistedState).not.toContain("set-secret-123");
    expect(persistedState).not.toContain("old-secret-456");
    expect(persistedState).not.toContain("new-secret-789");
  });

  it("previews and then executes the exact Always UV request", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "preview",
      ))
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "result",
      ));
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({ alwaysUVConfigured: true }));

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(true);
    expect(get(securityMutation)).toMatchObject({ kind: "alwaysUv", phase: "review" });
    expect(setAlwaysUV.mock.calls[0][0]).toEqual({
      sessionId: "session-1",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: true,
    });

    expect(await confirmSecurityMutation()).toBe(true);
    expect(setAlwaysUV.mock.calls[1][0]).toEqual({
      sessionId: "session-1",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Update Always UV",
    });
    expect(get(securityMutation)).toEqual({ kind: "idle", phase: "idle" });
  });

  it("normalizes, previews, and then executes the exact PIN policy request", async () => {
    seedReadyStatus(statusEnvelope({ minPINLength: 4, maxPINLength: 63, maxRPIDs: 3 }));
    const setMinPINLength = vi.spyOn(api, "setMinPINLength")
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength,
        "preview",
      ))
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength,
        "result",
      ));
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({ minPINLength: 6 }));

    const draft = {
      minPINLength: " 6 ",
      rpIDs: " example.test\nexample.test\n second.test ",
      forceChangePin: true,
      pinComplexityPolicy: true,
    };
    expect(await beginPINPolicyChange(draft)).toBe(true);
    expect(setMinPINLength.mock.calls[0][0]).toEqual({
      sessionId: "session-1",
      newMinPINLength: 6,
      minPinLengthRPIDs: ["example.test", "second.test"],
      forceChangePin: true,
      pinComplexityPolicy: true,
      dryRun: true,
    });

    expect(await confirmSecurityMutation()).toBe(true);
    expect(setMinPINLength.mock.calls[1][0]).toEqual({
      sessionId: "session-1",
      newMinPINLength: 6,
      minPinLengthRPIDs: ["example.test", "second.test"],
      forceChangePin: true,
      pinComplexityPolicy: true,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Update PIN policy",
    });
  });

  it("retries an execution failure with a new preview instead of auto-confirming", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const firstPreview = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
    );
    const executionFailure = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
      true,
    );
    const secondPreview = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
    );
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(firstPreview)
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(secondPreview);

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(true);
    expect(await confirmSecurityMutation()).toBe(false);
    expect(get(securityMutation)).toMatchObject({
      kind: "alwaysUv",
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: executionFailure,
    });

    expect(await retrySecurityMutation()).toBe(true);
    expect(setAlwaysUV).toHaveBeenCalledTimes(3);
    expect(setAlwaysUV.mock.calls[1][0]).toMatchObject({
      dryRun: false,
      confirmed: true,
    });
    expect(setAlwaysUV.mock.calls[2][0]).toEqual(setAlwaysUV.mock.calls[0][0]);
    expect(setAlwaysUV.mock.calls[2][0].confirmed).not.toBe(true);
    expect(get(securityMutation)).toMatchObject({ kind: "alwaysUv", phase: "review" });
  });

  it("retains a real partial biometric enrollment result on execution error", async () => {
    seedReadyStatus(statusEnvelope({ bioSupported: true, bioConfigured: true }));
    const partial = partialBioEnrollErrorEnvelope();
    vi.spyOn(api, "bioEnroll")
      .mockResolvedValueOnce(bioEnrollPreviewEnvelope())
      .mockResolvedValueOnce(partial);

    expect(await beginBioEnrollment()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(false);

    const mutation = get(securityMutation);
    expect(mutation).toMatchObject({
      kind: "bioEnroll",
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: partial,
      runtimeError: null,
    });
    if (mutation.kind !== "bioEnroll" || mutation.phase !== "error") return;
    expect(mutation.responseEnvelope).toBe(partial);
    expect(mutation.responseEnvelope?.result?.result).toMatchObject({
      templateIDHex: "beef",
      lastEnrollSampleStatus: "too-fast",
      remainingSamples: 3,
      samples: [
        { status: "good", remainingSamples: 3 },
        { status: "too-fast", remainingSamples: 3 },
      ],
    });
  });

  it("validates biometric friendly names by UTF-8 bytes and permits an empty name", async () => {
    seedReadyStatus(statusEnvelope({ bioSupported: true, bioConfigured: true }));
    const sensorEnvelope = bioSensorEnvelope();
    sensorEnvelope.result!.report.maxTemplateFriendlyName = 4;
    completeSecurityBioSensorLoad(sensorEnvelope, "2026-07-12T00:00:00.000Z");
    const bioRename = vi.spyOn(api, "bioRename").mockResolvedValue(bioRenamePreviewEnvelope(""));

    expect(await beginBioRename("cafe", "ééé")).toBe(false);
    expect(get(securityMutation)).toMatchObject({
      kind: "bioRename",
      phase: "editing",
      validationError: "friendly-name-too-long",
    });
    expect(bioRename).not.toHaveBeenCalled();

    expect(await beginBioRename("cafe", "")).toBe(true);
    expect(bioRename).toHaveBeenCalledWith({
      sessionId: "session-1",
      templateIdHex: "cafe",
      friendlyName: "",
      dryRun: true,
    });
  });

  it("reopens an invalid session before retrying a mutation as a fresh preview", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const invalidExecution = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
      true,
    );
    invalidExecution.error = failureForCode(Code.CodeSessionInvalid);
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "preview",
      ))
      .mockResolvedValueOnce(invalidExecution)
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "preview",
      ));
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    vi.spyOn(api, "openSession").mockResolvedValue(snapshot(TOKEN, "session-2"));

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(true);
    expect(await confirmSecurityMutation()).toBe(false);
    expect(get(sessionStatus).sessionId).toBeUndefined();

    expect(await retrySecurityMutationWithRecovery()).toBe(true);
    expect(setAlwaysUV.mock.calls[2][0]).toEqual({
      sessionId: "session-2",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: true,
    });
    expect(get(securityMutation)).toMatchObject({ kind: "alwaysUv", phase: "review" });
  });
});

describe("factory reset lifecycle", () => {
  it("closes old sessions and auto-selects the sole rediscovered authenticator", async () => {
    const replacement = device("token-after-reset");
    seedActiveScreenForTest("security");
    const resetFactory = vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    vi.spyOn(api, "sessions")
      .mockResolvedValueOnce([snapshot(TOKEN, "session-1")])
      .mockResolvedValue([]);
    const closeAllSessions = vi.spyOn(api, "closeAllSessions").mockResolvedValue([]);
    const discover = vi.spyOn(api, "discover").mockResolvedValue([replacement]);
    const openSession = vi.spyOn(api, "openSession").mockResolvedValue(snapshot(replacement));
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      item: replacement,
      sessionId: "session-token-after-reset",
    }));

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(resetFactory.mock.calls[0][0]).toEqual({ sessionId: "session-1", dryRun: true });
    expect(resetFactory.mock.calls[1][0]).toEqual({
      sessionId: "session-1",
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Factory reset authenticator",
    });
    expect(closeAllSessions).toHaveBeenCalledTimes(1);
    expect(closeAllSessions.mock.invocationCallOrder[0]).toBeLessThan(discover.mock.invocationCallOrder[0]);
    expect(discover.mock.invocationCallOrder[0]).toBeLessThan(openSession.mock.invocationCallOrder[0]);
    expect(openSession).toHaveBeenCalledWith({ selector: replacement.deviceId });
    expect(get(devices)).toEqual([replacement]);
    expect(get(selectedSelector)).toBe(replacement.deviceId);
    expect(get(sessionStatus)).toMatchObject({
      state: "ready",
      sessionId: "session-token-after-reset",
    });
    expect(configStatus).toHaveBeenCalledWith({ sessionId: "session-token-after-reset" });
  });

  it("closes old sessions and leaves multiple rediscovered authenticators unselected", async () => {
    const replacements = [device("token-a"), device("token-b")];
    seedActiveScreenForTest("security");
    vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    vi.spyOn(api, "sessions")
      .mockResolvedValueOnce([snapshot(TOKEN, "session-1")])
      .mockResolvedValue([]);
    const closeAllSessions = vi.spyOn(api, "closeAllSessions").mockResolvedValue([]);
    vi.spyOn(api, "discover").mockResolvedValue(replacements);
    const openSession = vi.spyOn(api, "openSession");
    const configStatus = vi.spyOn(api, "configStatus");

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(closeAllSessions).toHaveBeenCalledTimes(1);
    expect(openSession).not.toHaveBeenCalled();
    expect(configStatus).not.toHaveBeenCalled();
    expect(get(devices)).toEqual(replacements);
    expect(get(selectedSelector)).toBe("");
    expect(get(sessionStatus)).toEqual({ state: "idle" });
  });

  it("does not reuse a pre-reset session when close-all reports an error", async () => {
    const replacement = device("token-after-close-warning");
    seedActiveScreenForTest("security");
    vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    const sessions = vi.spyOn(api, "sessions");
    vi.spyOn(api, "closeAllSessions").mockRejectedValue(new Error("old handle close failed"));
    vi.spyOn(api, "discover").mockResolvedValue([replacement]);
    const openSession = vi.spyOn(api, "openSession").mockResolvedValue(snapshot(replacement, "fresh-session"));
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      item: replacement,
      sessionId: "fresh-session",
    }));

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(sessions).not.toHaveBeenCalled();
    expect(openSession).toHaveBeenCalledWith({ selector: replacement.deviceId });
    expect(get(sessionStatus)).toMatchObject({ state: "ready", sessionId: "fresh-session" });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      message: "The operation failed because of an internal error.",
    });
  });
});
