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
  PINChangeRequest,
  PINEnvelope,
  PINSetRequest,
  ResetFactoryEnvelope,
  ActiveSelection,
} from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { api } from "./api";
import {
  errorLoadState,
  overviewBioSensor,
  overviewMDS,
} from "./features/overview/state";
import { failureForCode } from "./test-failure";
import {
  completeSecurityBioSensorLoad,
  completeSecurityStatusLoad,
  securityEnrollments,
  securityMutation,
  securitySensor,
  securityStatus,
} from "./features/security/state";
import {
  authenticatorInspection,
  devices,
  selectedSelector,
  authenticatorStatus,
} from "./features/authenticator/state";
import { activeScreen, statusBar } from "./features/workbench/state";
import { setAppLocale } from "./i18n";
import {
  beginAlwaysUVChange,
  beginBioEnrollment,
  beginBioRename,
  beginFactoryReset,
  beginLongTouchForReset,
  beginPINPolicyChange,
  changeAuthenticatorPIN,
  confirmSecurityMutation,
  loadSecurityEnrollments,
  loadSecurityStatus,
  maybeLoadSecurity,
  restartSecurityPreview,
  setAuthenticatorPIN,
} from "./security-controller";
import { reloadSecurity, restartSecurityPreview as restartSecurityPreviewWithRecovery } from "./controller";
import {
  resetAppStateForTest,
  seedActiveScreenForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "./store-test-utils";

const TOKEN = device("token-1");

function device(id: string): DeviceReport {
  return {
    fingerprint: id,
    ordinalAlias: id,
    transport: Mode.ModeHID,
    path: id,
    vendorId: 1,
    productId: 2,
    vendor: Vendor.VendorUnknown,
    product: id,
  };
}

function snapshot(item: DeviceReport, selectionId = `authenticator-${item.fingerprint}`): ActiveSelection {
  return {
    id: selectionId,
  } as ActiveSelection;
}

function statusEnvelope(options: {
  item?: DeviceReport;
  selectionId?: string;
  bioSupported?: boolean;
  bioConfigured?: boolean | null;
  alwaysUVConfigured?: boolean | null;
  minPINLength?: number;
  maxPINLength?: number;
  maxRPIDs?: number;
  longTouchConfigured?: boolean | null;
} = {}): ConfigStatusEnvelope {
  const item = options.item ?? TOKEN;
  const bioSupported = options.bioSupported ?? false;
  const minPINLength = options.minPINLength ?? 4;
  const maxPINLength = options.maxPINLength ?? 63;
  return {
    operationId: "status-1",
    selectionId: options.selectionId ?? "authenticator-1",
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
          maxPINLength,
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
          longTouchForReset: {
            state: options.longTouchConfigured === true
              ? StateValue.StateConfigured
              : StateValue.StateNotConfigured,
            supported: options.longTouchConfigured !== null,
            configured: options.longTouchConfigured ?? false,
          },
        },
        resetHints: { longTouchForReset: StateValue.StateUnknown },
        limits: {
          minPINLength,
          maxPINLength,
          maxRPIDsForSetMinPINLength: options.maxRPIDs ?? 3,
        },
      },
    },
  } as unknown as ConfigStatusEnvelope;
}

function bioSensorEnvelope(item = TOKEN, selectionId = "authenticator-1"): BioSensorEnvelope {
  return {
    operationId: "sensor-1",
    selectionId,
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

function bioListEnvelope(item = TOKEN, selectionId = "authenticator-1"): BioListEnvelope {
  return {
    operationId: "bio-list-1",
    selectionId,
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
    selectionId: "authenticator-1",
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
    : operation === AuthenticatorConfigOperation.AuthenticatorConfigLongTouch
      ? OperationKind.OperationEnableLongTouchForReset
      : OperationKind.OperationSetMinPINLength;
  return {
    operationId: `${phase}-${operation}`,
    selectionId: "authenticator-1",
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
            deviceFingerprint: TOKEN.fingerprint,
            state: StateValue.StateConfigured,
          }
        : null,
    },
  } as unknown as AuthenticatorConfigEnvelope;
}

function bioEnrollPreviewEnvelope(): BioEnrollEnvelope {
  return {
    operationId: "bio-preview-1",
    selectionId: "authenticator-1",
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
    selectionId: "authenticator-1",
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
        deviceFingerprint: TOKEN.fingerprint,
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
    selectionId: "authenticator-1",
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

function invalidAuthenticatorStatusEnvelope(): ConfigStatusEnvelope {
  return {
    operationId: "status-invalid-authenticator",
    selectionId: "authenticator-1",
    kind: OperationKind.OperationConfigStatus,
    authenticatorClosed: false,
    error: failureForCode(Code.CodeSelectionInvalid),
  } as ConfigStatusEnvelope;
}

function resetEnvelope(phase: "preview" | "result"): ResetFactoryEnvelope {
  return {
    operationId: `reset-${phase}-1`,
    selectionId: "authenticator-1",
    kind: OperationKind.OperationResetFactory,
    result: {
      preview: {
        device: TOKEN,
        resetHints: { longTouchForReset: StateValue.StateUnknown },
        mode: phase === "preview" ? PreviewMode.PreviewModeDryRun : PreviewMode.PreviewModeExecute,
      },
      result: phase === "result"
        ? { deviceFingerprint: TOKEN.fingerprint, reset: true }
        : null,
    },
  } as unknown as ResetFactoryEnvelope;
}

function seedReadyStatus(envelope = statusEnvelope()) {
  completeSecurityStatusLoad(envelope);
}

beforeEach(() => {
  setAppLocale("en");
  resetAppStateForTest();
  seedDevicesForTest([TOKEN]);
  seedSelectionForTest(TOKEN.fingerprint, TOKEN, { state: "ready", selectionId: "authenticator-1" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("security controller loading", () => {
  it("auto-loads only for an active Security screen with a ready selected authenticator", async () => {
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope());
    const bioSensorInfo = vi.spyOn(api, "bioSensorInfo").mockResolvedValue(bioSensorEnvelope());

    expect(await maybeLoadSecurity()).toBe(false);

    seedActiveScreenForTest("security");
    authenticatorStatus.set({ state: "idle" });
    expect(await maybeLoadSecurity()).toBe(false);

    authenticatorStatus.set({ state: "ready", selectionId: "authenticator-1" });
    selectedSelector.set("");
    expect(await maybeLoadSecurity()).toBe(false);

    selectedSelector.set(TOKEN.fingerprint);
    expect(await maybeLoadSecurity()).toBe(true);
    expect(await maybeLoadSecurity()).toBe(false);

    expect(configStatus).toHaveBeenCalledTimes(1);
    expect(configStatus).toHaveBeenCalledWith({ selectionId: "authenticator-1" });
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

    expect(configStatus).toHaveBeenCalledWith({ selectionId: "authenticator-1" });
    expect(bioSensorInfo).toHaveBeenCalledWith({ selectionId: "authenticator-1" });
    expect(configStatus.mock.invocationCallOrder[0]).toBeLessThan(bioSensorInfo.mock.invocationCallOrder[0]);
    expect(get(securityStatus).phase).toBe("ready");
    expect(get(securitySensor).phase).toBe("ready");
    expect(bioList).not.toHaveBeenCalled();

    expect(await loadSecurityEnrollments()).toBe(true);
    expect(bioList).toHaveBeenCalledWith({ selectionId: "authenticator-1" });
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

  it("recovers an invalid selected authenticator before a user-forced Security reload", async () => {
    seedActiveScreenForTest("security");
    const invalidEnvelope = invalidAuthenticatorStatusEnvelope();
    const configStatus = vi.spyOn(api, "configStatus")
      .mockResolvedValueOnce(invalidEnvelope)
      .mockResolvedValueOnce(statusEnvelope({ selectionId: "authenticator-2" }));
    const setSelection = vi.spyOn(api, "setSelection").mockResolvedValue({
      selection: snapshot(TOKEN, "authenticator-2"),
    });

    expect(await loadSecurityStatus()).toBe(false);
    expect(get(securityStatus).responseEnvelope).toBe(invalidEnvelope);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "error",
      error: failureForCode(Code.CodeSelectionInvalid),
    });
    expect(get(authenticatorStatus).selectionId).toBeUndefined();

    expect(await reloadSecurity()).toBe(true);
    expect(setSelection).toHaveBeenCalledWith({ selector: TOKEN.fingerprint });
    expect(configStatus.mock.calls[1][0]).toEqual({ selectionId: "authenticator-2" });
    expect(get(authenticatorStatus)).toMatchObject({ state: "ready", selectionId: "authenticator-2" });
    expect(get(securityStatus).phase).toBe("ready");
  });
});

describe("security controller mutations", () => {
  it("sends exact confirmed:false PIN requests without retaining secrets", async () => {
    let sentSetPINRequest: PINSetRequest | null = null;
    let sentChangePINRequest: PINChangeRequest | null = null;
    const setPIN = vi.spyOn(api, "setPIN").mockImplementation((request) => {
      sentSetPINRequest = { ...request };
      return Promise.resolve(pinErrorEnvelope(OperationKind.OperationSetPIN));
    });
    const changePIN = vi.spyOn(api, "changePIN").mockImplementation((request) => {
      sentChangePINRequest = { ...request };
      return Promise.resolve(pinErrorEnvelope(OperationKind.OperationChangePIN));
    });

    expect(await setAuthenticatorPIN({ newPIN: "set-secret-123" })).toBe(false);
    expect(sentSetPINRequest).toEqual({
      selectionId: "authenticator-1",
      newPIN: "set-secret-123",
      confirmed: false,
      confirmationMessage: "Set authenticator PIN",
    });
    expect(setPIN.mock.calls[0][0].newPIN).toBe("");

    expect(await changeAuthenticatorPIN({
      currentPIN: "old-secret-456",
      newPIN: "new-secret-789",
    })).toBe(false);
    expect(sentChangePINRequest).toEqual({
      selectionId: "authenticator-1",
      currentPIN: "old-secret-456",
      newPIN: "new-secret-789",
      confirmed: false,
      confirmationMessage: "Change authenticator PIN",
    });
    expect(changePIN.mock.calls[0][0]).toMatchObject({ currentPIN: "", newPIN: "" });
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
    const staleOverviewFailure = failureForCode(Code.CodeTransportFailure);
    authenticatorInspection.set(errorLoadState(staleOverviewFailure));
    overviewBioSensor.set(errorLoadState(staleOverviewFailure));
    overviewMDS.set(errorLoadState(staleOverviewFailure));
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
      selectionId: "authenticator-1",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: true,
    });

    expect(await confirmSecurityMutation()).toBe(true);
    expect(setAlwaysUV.mock.calls[1][0]).toEqual({
      selectionId: "authenticator-1",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Update Always UV",
    });
    expect(get(securityMutation)).toEqual({ kind: "idle", phase: "idle" });
    const refreshedStatus = get(securityStatus).lastSuccessfulEnvelope!;
    expect(refreshedStatus.result!.report.authenticatorConfig.alwaysUv.configured).toBe(true);
    expect(get(authenticatorInspection).state).toBe("idle");
    expect(get(overviewBioSensor).state).toBe("idle");
    expect(get(overviewMDS).state).toBe("idle");
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
      selectionId: "authenticator-1",
      newMinPINLength: 6,
      minPinLengthRPIDs: ["example.test", "second.test"],
      forceChangePin: true,
      pinComplexityPolicy: true,
      dryRun: true,
    });

    expect(await confirmSecurityMutation()).toBe(true);
    expect(setMinPINLength.mock.calls[1][0]).toEqual({
      selectionId: "authenticator-1",
      newMinPINLength: 6,
      minPinLengthRPIDs: ["example.test", "second.test"],
      forceChangePin: true,
      pinComplexityPolicy: true,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Update PIN policy",
    });
  });

  it("omits the optional minimum when changing only RP and boolean PIN policy fields", async () => {
    seedReadyStatus(statusEnvelope({ minPINLength: 4, maxPINLength: 63 }));
    const setMinPINLength = vi.spyOn(api, "setMinPINLength").mockResolvedValue(
      authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigMinPINLength,
        "preview",
      ),
    );

    expect(await beginPINPolicyChange({
      minPINLength: "",
      rpIDs: "example.test",
      forceChangePin: true,
      pinComplexityPolicy: false,
    })).toBe(true);
    expect(setMinPINLength).toHaveBeenCalledWith({
      selectionId: "authenticator-1",
      minPinLengthRPIDs: ["example.test"],
      forceChangePin: true,
      pinComplexityPolicy: false,
      dryRun: true,
    });
  });

  it("treats both an omitted and unchanged minimum-only request as no change", async () => {
    seedReadyStatus(statusEnvelope({ minPINLength: 4, maxPINLength: 63 }));
    const setMinPINLength = vi.spyOn(api, "setMinPINLength");
    const baseDraft = {
      rpIDs: "",
      forceChangePin: false,
      pinComplexityPolicy: false,
    };

    expect(await beginPINPolicyChange({ ...baseDraft, minPINLength: "" })).toBe(false);
    expect(get(securityMutation)).toMatchObject({ validationError: "no-change" });
    expect(await beginPINPolicyChange({ ...baseDraft, minPINLength: "4" })).toBe(false);
    expect(get(securityMutation)).toMatchObject({ validationError: "no-change" });
    expect(setMinPINLength).not.toHaveBeenCalled();
  });

  it("previews and executes enabling long touch for reset", async () => {
    seedReadyStatus(statusEnvelope({ longTouchConfigured: false }));
    const enableLongTouch = vi.spyOn(api, "enableLongTouchForReset")
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigLongTouch,
        "preview",
      ))
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigLongTouch,
        "result",
      ));
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({ longTouchConfigured: true }));

    expect(await beginLongTouchForReset()).toBe(true);
    expect(enableLongTouch.mock.calls[0][0]).toEqual({ selectionId: "authenticator-1", dryRun: true });

    expect(await confirmSecurityMutation()).toBe(true);
    expect(enableLongTouch.mock.calls[1][0]).toEqual({
      selectionId: "authenticator-1",
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Enable long touch for reset",
    });
  });

  it("rejects a minimum above the effective maximum", async () => {
    seedReadyStatus(statusEnvelope({ maxPINLength: 63 }));
    const setMinPINLength = vi.spyOn(api, "setMinPINLength");

    expect(await beginPINPolicyChange({
      minPINLength: "64",
      rpIDs: "",
      forceChangePin: false,
      pinComplexityPolicy: false,
    })).toBe(false);
    expect(get(securityMutation)).toMatchObject({
      kind: "pinPolicy",
      phase: "editing",
      validationError: "min-pin-length-too-large",
    });
    expect(setMinPINLength).not.toHaveBeenCalled();
  });

  it("restarts a failed preview through the original preview action", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const previewFailure = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
      true,
    );
    const secondPreview = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
    );
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(previewFailure)
      .mockResolvedValueOnce(secondPreview);

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(false);
    expect(get(securityMutation)).toMatchObject({
      kind: "alwaysUv",
      phase: "error",
      failedPhase: "previewing",
      responseEnvelope: previewFailure,
    });

    expect(await restartSecurityPreview()).toBe(true);
    expect(setAlwaysUV).toHaveBeenCalledTimes(2);
    expect(setAlwaysUV.mock.calls[1][0]).toEqual(setAlwaysUV.mock.calls[0][0]);
    expect(setAlwaysUV.mock.calls[1][0].confirmed).not.toBe(true);
    expect(get(securityMutation)).toMatchObject({ kind: "alwaysUv", phase: "review" });
  });

  it("reconfirms after any execution failure without rebuilding the preview", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const executionFailure = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
    );
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "preview",
      ))
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "result",
      ));
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({ alwaysUVConfigured: true }));

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(true);
    expect(await confirmSecurityMutation()).toBe(false);

    expect(await confirmSecurityMutation()).toBe(true);
    expect(setAlwaysUV).toHaveBeenCalledTimes(3);
    expect(setAlwaysUV.mock.calls[1][0]).toMatchObject({ dryRun: false, confirmed: true });
    expect(setAlwaysUV.mock.calls[2][0]).toMatchObject({ dryRun: false, confirmed: true });
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
    completeSecurityBioSensorLoad(sensorEnvelope);
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
      selectionId: "authenticator-1",
      templateIdHex: "cafe",
      friendlyName: "",
      dryRun: true,
    });
  });

  it("reopens an invalid authenticator before repeating a failed preview", async () => {
    seedReadyStatus(statusEnvelope({ alwaysUVConfigured: false }));
    const invalidPreview = authenticatorConfigEnvelope(
      AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
      "preview",
      true,
    );
    invalidPreview.error = failureForCode(Code.CodeSelectionInvalid);
    const setAlwaysUV = vi.spyOn(api, "setAlwaysUV")
      .mockResolvedValueOnce(invalidPreview)
      .mockResolvedValueOnce(authenticatorConfigEnvelope(
        AuthenticatorConfigOperation.AuthenticatorConfigAlwaysUV,
        "preview",
      ));
    vi.spyOn(api, "setSelection").mockResolvedValue({ selection: snapshot(TOKEN, "authenticator-2") });

    expect(await beginAlwaysUVChange(AlwaysUVTarget.AlwaysUVTargetEnable)).toBe(false);
    expect(get(authenticatorStatus).selectionId).toBeUndefined();

    expect(await restartSecurityPreviewWithRecovery()).toBe(true);
    expect(setAlwaysUV.mock.calls[1][0]).toEqual({
      selectionId: "authenticator-2",
      target: AlwaysUVTarget.AlwaysUVTargetEnable,
      dryRun: true,
    });
    expect(get(securityMutation)).toMatchObject({ kind: "alwaysUv", phase: "review" });
  });
});

describe("factory reset lifecycle", () => {
  it("clears selection and auto-selects the sole rediscovered authenticator", async () => {
    const replacement = device("token-after-reset");
    seedActiveScreenForTest("security");
    const resetFactory = vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    const setSelection = vi.spyOn(api, "setSelection")
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ selection: snapshot(replacement) });
    const discover = vi.spyOn(api, "discover").mockResolvedValue([replacement]);
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      item: replacement,
      selectionId: "authenticator-token-after-reset",
    }));

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(resetFactory.mock.calls[0][0]).toEqual({ selectionId: "authenticator-1", dryRun: true });
    expect(resetFactory.mock.calls[1][0]).toEqual({
      selectionId: "authenticator-1",
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Factory reset authenticator",
    });
    expect(setSelection).toHaveBeenCalledTimes(2);
    expect(setSelection.mock.invocationCallOrder[0]).toBeLessThan(discover.mock.invocationCallOrder[0]);
    expect(discover.mock.invocationCallOrder[0]).toBeLessThan(setSelection.mock.invocationCallOrder[1]);
    expect(setSelection).toHaveBeenLastCalledWith({ selector: replacement.fingerprint });
    expect(get(devices)).toEqual([replacement]);
    expect(get(selectedSelector)).toBe(replacement.fingerprint);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-after-reset",
    });
    expect(configStatus).toHaveBeenCalledWith({ selectionId: "authenticator-token-after-reset" });
  });

  it("clears selection and selects the first rediscovered authenticator", async () => {
    const replacements = [device("token-a"), device("token-b")];
    seedActiveScreenForTest("security");
    vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    const setSelection = vi.spyOn(api, "setSelection")
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ selection: snapshot(replacements[0]) });
    vi.spyOn(api, "discover").mockResolvedValue(replacements);
    const configStatus = vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      item: replacements[0],
      selectionId: "authenticator-token-a",
    }));

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(setSelection).toHaveBeenCalledTimes(2);
    expect(setSelection).toHaveBeenLastCalledWith({ selector: replacements[0].fingerprint });
    expect(configStatus).toHaveBeenCalledWith({ selectionId: "authenticator-token-a" });
    expect(get(devices)).toEqual(replacements);
    expect(get(selectedSelector)).toBe(replacements[0].fingerprint);
    expect(get(authenticatorStatus)).toMatchObject({
      state: "ready",
      selectionId: "authenticator-token-a",
    });
  });

  it("does not reuse a pre-reset authenticator when clearing selection reports an error", async () => {
    const replacement = device("token-after-close-warning");
    seedActiveScreenForTest("security");
    vi.spyOn(api, "resetFactory")
      .mockResolvedValueOnce(resetEnvelope("preview"))
      .mockResolvedValueOnce(resetEnvelope("result"));
    const setSelection = vi.spyOn(api, "setSelection")
      .mockRejectedValueOnce(new Error("old handle close failed"))
      .mockResolvedValueOnce({ selection: snapshot(replacement, "fresh-authenticator") });
    vi.spyOn(api, "discover").mockResolvedValue([replacement]);
    vi.spyOn(api, "configStatus").mockResolvedValue(statusEnvelope({
      item: replacement,
      selectionId: "fresh-authenticator",
    }));

    expect(await beginFactoryReset()).toBe(true);
    expect(await confirmSecurityMutation()).toBe(true);

    expect(setSelection).toHaveBeenLastCalledWith({ selector: replacement.fingerprint });
    expect(get(authenticatorStatus)).toMatchObject({ state: "ready", selectionId: "fresh-authenticator" });
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "warning",
      message: "The operation failed because of an internal error.",
    });
  });
});
