import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../bindings/github.com/go-ctap/ctap/attestation";
import {
  AuthenticatorTransport,
  PublicKeyCredentialType,
} from "../../bindings/github.com/go-ctap/ctap/credential";
import {
  OperationKind,
  VerificationFlow,
} from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DecodeMode } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type {
  CredentialsEnvelope,
  GetAssertionEnvelope,
  GetAssertionRequest,
  LargeBlobListEnvelope,
  MakeCredentialEnvelope,
  MakeCredentialRequest,
  SessionSnapshot,
} from "../../bindings/github.com/go-ctap/kit/service";

import { api } from "./api";
import { failureForCode } from "./failure";
import { labState, resetLabStateForTest } from "./features/lab/state";
import {
  completeLargeBlobsInventoryLoad,
  largeBlobsDecodeMode,
  largeBlobsInventoryState,
  largeBlobsPayloadEncoding,
  largeBlobsQuery,
  largeBlobsStatusFilter,
  largeBlobsVerificationFlow,
} from "./features/largeblobs/state";
import {
  completePasskeysInventoryLoad,
  passkeysInventoryState,
  passkeysQuery,
  passkeysStatusFilter,
  passkeysVerificationFlow,
} from "./features/passkeys/state";
import {
  devices,
  resetSessionStateForTest,
  selectedDevice,
  selectedSelector,
  sessionStatus,
} from "./features/session/state";
import { resetWorkbenchStateForTest, statusBar } from "./features/workbench/state";
import { setAppLocale } from "./i18n";
import {
  cancelLabHandoff,
  confirmLabHandoff,
  confirmLabMakeCredential,
  confirmLabPreset,
  handoffLabCredential,
  previewLabMakeCredential,
  requestLabPreset,
  retryLabGetAssertion,
  retryLabMakeCredential,
  runLabGetAssertion,
  updateLabGetAssertionDraft,
  updateLabMakeCredentialDraft,
} from "./lab-controller";
import {
  buildGetAssertionRequest,
  buildMakeCredentialRequest,
} from "./lab-input";

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
}));

vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

function makePreviewEnvelope(): MakeCredentialEnvelope {
  return {
    operationId: "make-preview-1",
    sessionId: "session-1",
    kind: OperationKind.OperationMakeCredential,
    result: {
      preview: {
        device: { deviceId: "token-1", stableId: true },
        rp: { id: "lab.example", name: "Lab" },
        user: { id: "AAECAw==", name: "alice", displayName: "Alice" },
        pubKeyCredParams: [{
          type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
          alg: -7,
        }],
        warnings: [],
      },
      result: null,
    },
  } as unknown as MakeCredentialEnvelope;
}

function makeResultEnvelope(
  rpID = "lab.example",
  credentialIDHex = "cafe",
): MakeCredentialEnvelope {
  const envelope = makePreviewEnvelope();
  envelope.operationId = "make-result-1";
  envelope.result!.result = {
    deviceId: "token-1",
    rpID,
    fmt: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
    credentialIDHex,
    publicKeyCOSEHex: "a5010203262001215820",
    authenticatorDataHex: "0102",
    attestationObjectCBORHex: "a363666d74",
    aaguid: "00000000-0000-0000-0000-000000000000",
    signCount: 0,
    userPresent: true,
    userVerified: false,
    enterpriseAttestation: false,
  };
  return envelope;
}

function getResultEnvelope(rpID = "example.com"): GetAssertionEnvelope {
  return {
    operationId: "get-result-1",
    sessionId: "session-1",
    kind: OperationKind.OperationGetAssertion,
    result: {
      result: {
        deviceId: "token-1",
        rpID,
        assertions: [],
      },
    },
  } as GetAssertionEnvelope;
}

function seedSuccessfulMake(rpID = "example.com", credentialIDHex = "cafe") {
  const current = get(labState);
  const previewRequest: MakeCredentialRequest = {
    ...buildMakeCredentialRequest("session-1", current.makeDraft),
    dryRun: true,
  };
  const previewEnvelope = makePreviewEnvelope();
  const request: MakeCredentialRequest = {
    ...previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: "Create this WebAuthn credential?",
  };
  labState.set({
    ...current,
    makeStep: {
      phase: "success",
      previewRequest,
      previewEnvelope,
      request,
      responseEnvelope: makeResultEnvelope(rpID, credentialIDHex),
      validation: { valid: true, errors: [], warnings: [] },
    },
  });
}

beforeEach(() => {
  setAppLocale("en");
  resetSessionStateForTest();
  resetWorkbenchStateForTest();
  resetLabStateForTest((target) => target.fill(0x11));
  sessionStatus.set({ state: "ready", sessionId: "session-1" });
  toastMocks.error.mockClear();
  toastMocks.info.mockClear();
  toastMocks.success.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WebAuthn Lab request lifecycle", () => {
  it("confirms a dirty preset replacement and regenerates all random inputs", () => {
    const before = get(labState);
    expect(updateLabMakeCredentialDraft({ rpName: "Edited" })).toBe(true);

    expect(requestLabPreset("uv-required")).toBe(false);
    expect(get(labState).pendingPresetID).toBe("uv-required");
    expect(get(labState).makeDraft.rpName).toBe("Edited");

    expect(confirmLabPreset()).toBe(true);
    const after = get(labState);
    expect(after).toMatchObject({
      presetID: "uv-required",
      isCustom: false,
      pendingPresetID: null,
      makeStep: { phase: "editing" },
      getStep: { phase: "editing" },
      makeDraft: { userVerification: "true" },
      getDraft: { userVerification: "true" },
    });
    expect(after.makeDraft.userIDHex).not.toBe(before.makeDraft.userIDHex);
    expect(after.makeDraft.clientData.challenge).not.toBe(before.makeDraft.clientData.challenge);
    expect(after.getDraft.clientData.challenge).not.toBe(before.getDraft.clientData.challenge);
  });

  it("does not call either operation when its draft is invalid", async () => {
    const makeCredential = vi.spyOn(api, "makeCredential");
    const getAssertion = vi.spyOn(api, "getAssertion");

    expect(updateLabMakeCredentialDraft({ rpID: "" })).toBe(true);
    expect(updateLabGetAssertionDraft({ rpID: "" })).toBe(true);
    expect(await previewLabMakeCredential()).toBe(false);
    expect(await runLabGetAssertion()).toBe(false);

    expect(makeCredential).not.toHaveBeenCalled();
    expect(getAssertion).not.toHaveBeenCalled();
    expect(get(labState).makeStep).toMatchObject({
      phase: "editing",
      validation: { valid: false },
    });
    expect(get(labState).getStep).toMatchObject({
      phase: "editing",
      validation: { valid: false },
    });
  });

  it("executes the exact reviewed MakeCredential snapshot with only confirmation fields changed", async () => {
    const initial = get(labState);
    expect(updateLabMakeCredentialDraft({
      rpID: "lab.example",
      rpName: "Lab",
      userIDHex: "00010203",
      userName: "alice",
      userDisplayName: "Alice",
      clientData: {
        ...initial.makeDraft.clientData,
        origin: "https://lab.example",
        challenge: "AQID",
      },
      algorithms: ["-7", "-257", "-7"],
      excludeList: [{
        credentialIDHex: "deadbeef",
        transports: [AuthenticatorTransport.AuthenticatorTransportUSB],
      }],
      residentKey: "auto",
      userPresence: "false",
      userVerification: "true",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
    })).toBe(true);

    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(makeResultEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(makeCredential.mock.calls[0][0]).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      rp: { id: "lab.example", name: "Lab" },
      user: { id: "AAECAw==", name: "alice", displayName: "Alice" },
      clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiQVFJRCIsIm9yaWdpbiI6Imh0dHBzOi8vbGFiLmV4YW1wbGUiLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
      pubKeyCredParams: [
        { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 },
        { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -257 },
        { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 },
      ],
      excludeList: [{
        type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
        id: "3q2+7w==",
        transports: [AuthenticatorTransport.AuthenticatorTransportUSB],
      }],
      options: { userPresence: false, userVerification: true },
      dryRun: true,
    });
    expect(makeCredential.mock.calls[0][0].confirmed).toBeUndefined();
    expect(makeCredential.mock.calls[0][0].options?.residentKey).toBeUndefined();

    const review = get(labState).makeStep;
    expect(review.phase).toBe("review");
    expect(updateLabMakeCredentialDraft({ rpName: "Changed after review" })).toBe(false);
    expect(await confirmLabMakeCredential()).toBe(true);

    const reviewedRequest = makeCredential.mock.calls[0][0];
    const executionRequest = makeCredential.mock.calls[1][0];
    expect(executionRequest).toEqual({
      ...reviewedRequest,
      dryRun: false,
      confirmed: true,
      confirmationMessage: "Create this WebAuthn credential?",
    });
    expect(executionRequest.rp).toBe(reviewedRequest.rp);
    expect(executionRequest.user).toBe(reviewedRequest.user);
    expect(executionRequest.pubKeyCredParams).toBe(reviewedRequest.pubKeyCredParams);
    expect(executionRequest.excludeList).toBe(reviewedRequest.excludeList);
    expect(executionRequest.options).toBe(reviewedRequest.options);
    expect(get(labState).makeStep.phase).toBe("success");
  });

  it("retries an execution error with a fresh preview and requires Confirm again", async () => {
    const executionFailure = makePreviewEnvelope();
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(makePreviewEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(await confirmLabMakeCredential()).toBe(false);
    expect(get(labState).makeStep).toMatchObject({
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: executionFailure,
      runtimeError: null,
    });

    expect(await retryLabMakeCredential()).toBe(true);
    expect(makeCredential).toHaveBeenCalledTimes(3);
    expect(makeCredential.mock.calls[1][0]).toMatchObject({
      dryRun: false,
      confirmed: true,
    });
    expect(makeCredential.mock.calls[2][0]).toMatchObject({ dryRun: true });
    expect(makeCredential.mock.calls[2][0].confirmed).toBeUndefined();
    expect(makeCredential.mock.calls[2][0]).not.toBe(makeCredential.mock.calls[0][0]);
    expect(get(labState).makeStep.phase).toBe("review");
  });

  it("retries GetAssertion with the exact frozen request, including raw client-data bytes", async () => {
    const initial = get(labState);
    expect(updateLabGetAssertionDraft({
      clientData: {
        ...initial.getDraft.clientData,
        mode: "raw",
        rawJSON: "{not-json\n",
      },
    })).toBe(true);
    const failure = getResultEnvelope();
    failure.error = failureForCode(Code.CodeTransportFailure);
    const getAssertion = vi.spyOn(api, "getAssertion")
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce(getResultEnvelope());

    expect(await runLabGetAssertion()).toBe(false);
    const frozenRequest = getAssertion.mock.calls[0][0];
    expect(frozenRequest).toEqual({
      sessionId: "session-1",
      rpID: "example.com",
      clientDataJSON: "e25vdC1qc29uCg==",
    });
    expect(get(labState).getStep).toMatchObject({
      phase: "error",
      request: frozenRequest,
      validation: {
        valid: true,
        warnings: [{ field: "get.clientData.rawJSON", code: "invalid-json", severity: "warning" }],
      },
    });

    expect(await retryLabGetAssertion()).toBe(true);
    expect(getAssertion).toHaveBeenCalledTimes(2);
    expect(getAssertion.mock.calls[1][0]).toBe(frozenRequest);
    expect(get(labState).getStep.phase).toBe("success");
  });

  it("keeps a real error envelope separate from a thrown runtime failure", async () => {
    const responseFailure = makePreviewEnvelope();
    responseFailure.error = failureForCode(Code.CodeTransportFailure);
    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(responseFailure)
      .mockRejectedValueOnce(new Error("Wails bridge unavailable"));

    expect(await previewLabMakeCredential()).toBe(false);
    expect(get(labState).makeStep).toMatchObject({
      phase: "error",
      responseEnvelope: responseFailure,
      previewEnvelope: null,
      runtimeError: null,
      failureReason: "response-error",
    });

    resetLabStateForTest((target) => target.fill(0x22));
    expect(await previewLabMakeCredential()).toBe(false);
    const runtimeState = get(labState).makeStep;
    expect(runtimeState).toMatchObject({
      phase: "error",
      responseEnvelope: null,
      previewEnvelope: null,
      failureReason: "runtime-error",
      runtimeError: failureForCode(Code.CodeInternalError),
    });
  });

  it("retains the raw JSON warning in the reviewed MakeCredential snapshot", async () => {
    const initial = get(labState);
    expect(updateLabMakeCredentialDraft({
      clientData: {
        ...initial.makeDraft.clientData,
        mode: "raw",
        rawJSON: "{not-json\n",
      },
    })).toBe(true);
    vi.spyOn(api, "makeCredential").mockResolvedValue(makePreviewEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(get(labState).makeStep).toMatchObject({
      phase: "review",
      validation: {
        valid: true,
        warnings: [{ field: "make.clientData.rawJSON", code: "invalid-json", severity: "warning" }],
      },
    });
  });

  it("reopens an invalid session before retrying MakeCredential as a fresh preview", async () => {
    const token = new DeviceReport({ deviceId: "token-1", product: "Test authenticator" });
    devices.set([token]);
    selectedSelector.set("token-1");
    selectedDevice.set(token);
    const invalidSession = makePreviewEnvelope();
    invalidSession.error = failureForCode(Code.CodeSessionInvalid);
    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(invalidSession)
      .mockResolvedValueOnce(makePreviewEnvelope());
    vi.spyOn(api, "sessions").mockResolvedValue([]);
    vi.spyOn(api, "openSession").mockResolvedValue({
      id: "session-2",
      info: { device: token, closed: false },
      running: false,
      openedAt: "2026-07-13T00:00:00Z",
      updatedAt: "2026-07-13T00:00:00Z",
    } as SessionSnapshot);

    expect(await previewLabMakeCredential()).toBe(false);
    expect(get(labState).makeStep).toMatchObject({ phase: "error", failureReason: "invalid-session" });
    expect(get(sessionStatus)).toMatchObject({ state: "error" });

    expect(await retryLabMakeCredential()).toBe(true);
    expect(makeCredential).toHaveBeenCalledTimes(2);
    expect(makeCredential.mock.calls[1][0].sessionId).toBe("session-2");
    expect(get(labState).makeStep.phase).toBe("review");
  });

  it("applies an invalid-session response to the shared session boundary", async () => {
    const envelope = getResultEnvelope();
    envelope.error = failureForCode(Code.CodeSessionInvalid);
    vi.spyOn(api, "getAssertion").mockResolvedValue(envelope);

    expect(await runLabGetAssertion()).toBe(false);
    expect(get(labState).getStep).toMatchObject({
      phase: "error",
      responseEnvelope: envelope,
      runtimeError: null,
      failureReason: "invalid-session",
    });
    expect(get(sessionStatus)).toEqual({
      state: "error",
      error: failureForCode(Code.CodeSessionInvalid),
    });
    expect(await retryLabGetAssertion()).toBe(false);
    expect(api.getAssertion).toHaveBeenCalledTimes(1);
  });

  it("invalidates Passkeys and Large Blobs after success without losing UI preferences", async () => {
    completePasskeysInventoryLoad({} as CredentialsEnvelope, "2026-07-13T00:00:00.000Z");
    passkeysQuery.set("alice");
    passkeysStatusFilter.set("large-blob-available");
    passkeysVerificationFlow.set(VerificationFlow.VerificationFlowPIN);

    completeLargeBlobsInventoryLoad({} as LargeBlobListEnvelope, "2026-07-13T00:00:00.000Z");
    largeBlobsQuery.set("example.com");
    largeBlobsStatusFilter.set("present");
    largeBlobsVerificationFlow.set(VerificationFlow.VerificationFlowPIN);
    largeBlobsPayloadEncoding.set("hex");
    largeBlobsDecodeMode.set(DecodeMode.DecodeModeCBOR);

    vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(makeResultEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(await confirmLabMakeCredential()).toBe(true);

    expect(get(passkeysInventoryState)).toEqual({
      phase: "idle",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: null,
      lastSuccessfulAt: null,
    });
    expect(get(passkeysQuery)).toBe("alice");
    expect(get(passkeysStatusFilter)).toBe("large-blob-available");
    expect(get(passkeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);

    expect(get(largeBlobsInventoryState)).toEqual({
      phase: "idle",
      lastSuccessfulEnvelope: null,
      responseEnvelope: null,
      runtimeError: null,
      lastSuccessfulAt: null,
    });
    expect(get(largeBlobsQuery)).toBe("example.com");
    expect(get(largeBlobsStatusFilter)).toBe("present");
    expect(get(largeBlobsVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    expect(get(largeBlobsPayloadEncoding)).toBe("hex");
    expect(get(largeBlobsDecodeMode)).toBe(DecodeMode.DecodeModeCBOR);
  });
});

describe("WebAuthn Lab credential handoff", () => {
  it("preserves existing entries and does not duplicate a matching credential for the same RP", () => {
    seedSuccessfulMake("example.com", "cafe");
    expect(updateLabGetAssertionDraft({
      allowList: [
        { credentialIDHex: "beef", transports: [] },
        { credentialIDHex: "CAFE", transports: [AuthenticatorTransport.AuthenticatorTransportUSB] },
      ],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(true);
    expect(get(labState).getDraft).toMatchObject({
      rpID: "example.com",
      allowList: [
        { credentialIDHex: "beef", transports: [] },
        { credentialIDHex: "CAFE", transports: [AuthenticatorTransport.AuthenticatorTransportUSB] },
      ],
    });
    expect(get(labState).pendingHandoff).toBeNull();
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "success",
      title: "Credential handed off",
    });
  });

  it("fills an empty RP and appends the created credential while preserving other entries", () => {
    seedSuccessfulMake("created.example", "cafe");
    expect(updateLabGetAssertionDraft({
      rpID: "",
      allowList: [{ credentialIDHex: "beef", transports: [] }],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(true);
    expect(get(labState).getDraft).toMatchObject({
      rpID: "created.example",
      allowList: [
        { credentialIDHex: "beef", transports: [] },
        { credentialIDHex: "cafe", transports: [] },
      ],
    });
    expect(get(labState).getStep.phase).toBe("editing");
  });

  it("requires confirmation for an RP mismatch; cancel is inert and confirm replaces the scenario", () => {
    seedSuccessfulMake("created.example", "cafe");
    expect(updateLabGetAssertionDraft({
      rpID: "other.example",
      allowList: [{ credentialIDHex: "beef", transports: [] }],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(false);
    expect(get(labState).pendingHandoff).toEqual({
      reason: "rp-mismatch",
      rpID: "created.example",
      credentialIDHex: "cafe",
    });
    expect(get(labState).getDraft).toMatchObject({
      rpID: "other.example",
      allowList: [{ credentialIDHex: "beef" }],
    });

    cancelLabHandoff();
    expect(get(labState).pendingHandoff).toBeNull();
    expect(get(labState).getDraft.rpID).toBe("other.example");
    expect(handoffLabCredential()).toBe(false);
    expect(confirmLabHandoff()).toBe(true);
    expect(get(labState).getDraft).toMatchObject({
      rpID: "created.example",
      allowList: [{ credentialIDHex: "cafe", transports: [] }],
    });
    expect(get(labState).getStep.phase).toBe("editing");
  });

  it("requires confirmation when GetAssertion has a fixed result even for the same RP", () => {
    seedSuccessfulMake("example.com", "cafe");
    expect(updateLabGetAssertionDraft({
      allowList: [{ credentialIDHex: "beef", transports: [] }],
    })).toBe(true);
    const current = get(labState);
    const request: GetAssertionRequest = buildGetAssertionRequest("session-1", current.getDraft);
    labState.set({
      ...current,
      getStep: {
        phase: "success",
        request,
        responseEnvelope: getResultEnvelope("example.com"),
        validation: { valid: true, errors: [], warnings: [] },
      },
    });

    expect(handoffLabCredential()).toBe(false);
    expect(get(labState).pendingHandoff).toEqual({
      reason: "result-reset",
      rpID: "example.com",
      credentialIDHex: "cafe",
    });
    expect(confirmLabHandoff()).toBe(true);
    expect(get(labState).getDraft.allowList).toEqual([
      { credentialIDHex: "cafe", transports: [] },
    ]);
    expect(get(labState).getStep.phase).toBe("editing");
  });
});
