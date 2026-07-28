import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AttestationStatementFormatIdentifier } from "../../bindings/github.com/go-ctap/ctap/attestation";
import { PublicKeyCredentialType } from "../../bindings/github.com/go-ctap/ctap/credential";
import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { DecodeMode } from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import {
  CredentialVerificationMaterial,
  GetAssertionVerification,
  MakeCredentialVerification,
  VerificationStatus,
} from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
  AttestationTrustAssessment,
  LookupResult,
} from "../../bindings/github.com/go-ctap/mds/model";
import type {
  CredentialsEnvelope,
  GetAssertionEnvelope,
  GetAssertionRequest,
  LargeBlobListEnvelope,
  MakeCredentialEnvelope,
  MakeCredentialRequest,
  ActiveSelection,
} from "../../bindings/telesma/service";
import { testHIDDevice } from "../test/device.js";

import { api } from "./api";
import { failureForCode } from "./test-failure";
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
  resetAuthenticatorStateForTest,
  selectedDevice,
  selectedSelector,
  authenticatorStatus,
} from "./features/authenticator/state";
import { resetWorkbenchStateForTest, statusBar } from "./features/workbench/state";
import { setAppLocale } from "./i18n";
import {
  cancelLabHandoff,
  confirmLabHandoff,
  confirmLabGetAssertion,
  confirmLabMakeCredential,
  fillLabDemoValues,
  handoffLabCredential,
  previewLabMakeCredential,
  rerunLabGetAssertion,
  retryLabMakeCredentialVerification,
  runLabGetAssertion,
  selectLabOperation,
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
    selectionId: "authenticator-1",
    kind: OperationKind.MakeCredential,
    result: {
      preview: {
        device: testHIDDevice(),
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
    attachmentId: "token-1",
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
    selectionId: "authenticator-1",
    kind: OperationKind.GetAssertion,
    authenticatorClosed: false,
    result: {
      preview: {
        device: testHIDDevice(),
        input: {
          rpID,
          clientDataJSON: "e30=",
          allowList: [],
          options: {},
        },
        warnings: [],
      },
      result: {
        attachmentId: "token-1",
        rpID,
        assertions: [],
      },
    },
  } as GetAssertionEnvelope;
}

function seedSuccessfulMake(rpID = "example.com", credentialIDHex = "cafe") {
  const current = get(labState);
  const previewRequest: MakeCredentialRequest = {
    ...buildMakeCredentialRequest("authenticator-1", current.makeDraft),
    dryRun: true,
  };
  const previewEnvelope = makePreviewEnvelope();
  const request: MakeCredentialRequest = {
    ...previewRequest,
    dryRun: false,
  };
  labState.set({
    ...current,
    makeStep: {
      phase: "success",
      previewRequest,
      previewEnvelope,
      request,
      responseEnvelope: makeResultEnvelope(rpID, credentialIDHex),
    },
  });
}

beforeEach(() => {
  setAppLocale("en");
  resetAuthenticatorStateForTest();
  resetWorkbenchStateForTest();
  resetLabStateForTest((target) => target.fill(0x11));
  authenticatorStatus.set({ state: "ready", selectionId: "authenticator-1" });
  vi.spyOn(api, "verifyMakeCredential").mockResolvedValue(new MakeCredentialVerification());
  vi.spyOn(api, "verifyGetAssertion").mockResolvedValue(new GetAssertionVerification());
  vi.spyOn(api, "lookupMDS").mockResolvedValue({
    result: new LookupResult(),
  });
  vi.spyOn(api, "assessMakeCredentialAttestation").mockResolvedValue(
    new AttestationTrustAssessment(),
  );
  toastMocks.error.mockClear();
  toastMocks.info.mockClear();
  toastMocks.success.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WebAuthn Lab request lifecycle", () => {
  it("fills required demo fields without replacing optional configuration", () => {
    const before = get(labState);
    expect(updateLabMakeCredentialDraft({
      rpID: "edited.example",
      rpName: "Edited",
      residentKey: "true",
      extensions: {
        ...before.makeDraft.extensions,
        credentialProperties: { included: true },
      },
    })).toBe(true);

    expect(fillLabDemoValues()).toBe(true);
    const after = get(labState);
    expect(after.makeDraft).toMatchObject({
      rpID: "example.com",
      rpName: "Example",
      userName: "alice@example.com",
      userDisplayName: "Alice",
      algorithms: ["-7"],
      residentKey: "true",
      extensions: { credentialProperties: { included: true } },
    });
    expect(after.makeDraft.userIDHex).not.toBe(before.makeDraft.userIDHex);
    expect(after.makeDraft.clientData.challenge).not.toBe(before.makeDraft.clientData.challenge);
    expect(after.getDraft).toEqual(before.getDraft);
  });

  it("fills demo values only in the selected GetAssertion draft", () => {
    selectLabOperation("get");
    const initial = get(labState);
    expect(updateLabGetAssertionDraft({
      rpID: "edited.example",
      userPresence: "false",
      extensions: {
        ...initial.getDraft.extensions,
        getCredentialBlob: { included: true, value: true },
      },
    })).toBe(true);
    const before = get(labState);

    expect(fillLabDemoValues()).toBe(true);
    const after = get(labState);
    expect(after.getDraft).toMatchObject({
      rpID: "example.com",
      userPresence: "false",
      extensions: { getCredentialBlob: { included: true, value: true } },
    });
    expect(after.getDraft.clientData.challenge).not.toBe(before.getDraft.clientData.challenge);
    expect(after.makeDraft).toEqual(before.makeDraft);
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
    expect(get(labState).makeStep.phase).toBe("editing");
    expect(get(labState).getStep.phase).toBe("editing");
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
      algorithms: ["-7", "-257"],
      attestationFormatsPreference: ["packed", "none"],
      enterpriseAttestation: 2,
      excludeList: [{ credentialIDHex: "deadbeef" }],
      residentKey: "auto",
      userPresence: "true",
      userVerification: "true",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
    })).toBe(true);

    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(makeResultEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(makeCredential.mock.calls[0][0]).toEqual({
      selectionId: "authenticator-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      rp: { id: "lab.example", name: "Lab" },
      user: { id: "AAECAw==", name: "alice", displayName: "Alice" },
      clientDataJSON: "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiQVFJRCIsIm9yaWdpbiI6Imh0dHBzOi8vbGFiLmV4YW1wbGUiLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
      pubKeyCredParams: [
        { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 },
        { type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -257 },
      ],
      enterpriseAttestation: 2,
      attestationFormatsPreference: ["packed", "none"],
      excludeList: [{
        type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
        id: "3q2+7w==",
      }],
      options: { userPresence: true, userVerification: true },
      dryRun: true,
    });
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
    });
    expect(executionRequest.rp).toBe(reviewedRequest.rp);
    expect(executionRequest.user).toBe(reviewedRequest.user);
    expect(executionRequest.pubKeyCredParams).toBe(reviewedRequest.pubKeyCredParams);
    expect(executionRequest.excludeList).toBe(reviewedRequest.excludeList);
    expect(executionRequest.options).toBe(reviewedRequest.options);
    expect(get(labState).makeStep.phase).toBe("success");
  });

  it("publishes the CTAP result while local verification loads and supports retry", async () => {
    let resolveVerification!: (verification: MakeCredentialVerification) => void;
    vi.mocked(api.verifyMakeCredential).mockReturnValueOnce(new Promise((resolve) => {
      resolveVerification = resolve;
    }));
    vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(makeResultEnvelope("lab.example", "cafe"));

    expect(await previewLabMakeCredential()).toBe(true);
    expect(await confirmLabMakeCredential()).toBe(true);
    expect(get(labState)).toMatchObject({
      makeStep: { phase: "success" },
      makeVerification: { phase: "loading" },
    });
    expect(api.verifyMakeCredential).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({
        rp: expect.objectContaining({ id: "example.com" }),
      }),
      result: expect.objectContaining({
        rpID: "lab.example",
        attestationObjectCBORHex: "a363666d74",
      }),
    }));

    const verification = new MakeCredentialVerification({
      status: VerificationStatus.VerificationStatusVerified,
    });
    resolveVerification(verification);
    await vi.waitFor(() => {
      expect(get(labState).makeVerification).toEqual({ phase: "ready", verification });
    });

    vi.mocked(api.verifyMakeCredential).mockResolvedValueOnce(verification);
    expect(retryLabMakeCredentialVerification()).toBe(true);
    await vi.waitFor(() => {
      expect(api.verifyMakeCredential).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps a successful CTAP result when the independent verification call fails", async () => {
    vi.mocked(api.verifyMakeCredential).mockRejectedValueOnce(new Error("verification unavailable"));
    vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(makeResultEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(await confirmLabMakeCredential()).toBe(true);
    await vi.waitFor(() => {
      expect(get(labState).makeVerification.phase).toBe("error");
    });
    expect(get(labState).makeStep.phase).toBe("success");
  });

  it("reconfirms directly after any execution failure without rebuilding the preview", async () => {
    const executionFailure = makePreviewEnvelope();
    executionFailure.error = failureForCode(Code.CodeTransportFailure);
    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(makePreviewEnvelope())
      .mockResolvedValueOnce(executionFailure)
      .mockResolvedValueOnce(makeResultEnvelope());

    expect(await previewLabMakeCredential()).toBe(true);
    expect(await confirmLabMakeCredential()).toBe(false);
    expect(get(labState).makeStep).toMatchObject({
      phase: "error",
      responseEnvelope: executionFailure,
      runtimeError: null,
    });

    expect(await previewLabMakeCredential()).toBe(false);
    expect(await confirmLabMakeCredential()).toBe(true);
    expect(makeCredential).toHaveBeenCalledTimes(3);
    expect(makeCredential.mock.calls[1][0]).toMatchObject({
      dryRun: false,
    });
    expect(makeCredential.mock.calls[2][0]).toMatchObject({ dryRun: false });
    expect(get(labState).makeStep.phase).toBe("success");
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
      .mockResolvedValueOnce(getResultEnvelope())
      .mockResolvedValueOnce(getResultEnvelope());

    expect(await runLabGetAssertion()).toBe(false);
    const frozenRequest = getAssertion.mock.calls[0][0];
    expect(frozenRequest).toMatchObject({
      selectionId: "authenticator-1",
      rpID: "example.com",
      clientDataJSON: "e25vdC1qc29uCg==",
      dryRun: true,
    });
    expect(get(labState).getStep).toMatchObject({
      phase: "error",
      previewRequest: frozenRequest,
      request: null,
    });

    expect(await rerunLabGetAssertion()).toBe(true);
    expect(getAssertion).toHaveBeenCalledTimes(2);
    expect(getAssertion.mock.calls[1][0]).toEqual(frozenRequest);
    expect(getAssertion.mock.calls[1][0]).not.toBe(frozenRequest);
    expect(getAssertion.mock.calls[1][0].clientDataJSON).toBe(frozenRequest.clientDataJSON);
    expect(get(labState).getStep.phase).toBe("review");
    expect(await confirmLabGetAssertion()).toBe(true);
    expect(getAssertion).toHaveBeenCalledTimes(3);
    expect(getAssertion.mock.calls[2][0]).toMatchObject({
      dryRun: false,
    });
    expect(getAssertion.mock.calls[2][0].clientDataJSON).toBe(frozenRequest.clientDataJSON);
    expect(get(labState).getStep.phase).toBe("success");
  });

  it("verifies the full assertion result with local material matched by credential ID", async () => {
    const envelope = getResultEnvelope("example.com");
    envelope.result!.result!.assertions = [{
      index: 0,
      credential: {
        type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
        id: "yv4=",
      },
      authenticatorDataHex: "11".repeat(37),
      signatureHex: "22".repeat(64),
      signCount: 8,
      userPresent: true,
      userVerified: false,
    }];
    expect(updateLabGetAssertionDraft({
      verificationMaterial: [new CredentialVerificationMaterial({
        credentialIDHex: "cafe",
        publicKeyCOSEHex: "a5010203",
        previousSignCount: 7,
      })],
    })).toBe(true);
    vi.spyOn(api, "getAssertion")
      .mockResolvedValueOnce(envelope)
      .mockResolvedValueOnce(envelope);

    expect(await runLabGetAssertion()).toBe(true);
    expect(await confirmLabGetAssertion()).toBe(true);
    await vi.waitFor(() => {
      expect(api.verifyGetAssertion).toHaveBeenCalledWith(expect.objectContaining({
        input: expect.objectContaining({ rpID: "example.com" }),
        result: expect.objectContaining({
          rpID: "example.com",
          assertions: [expect.objectContaining({
            authenticatorDataHex: "11".repeat(37),
            signatureHex: "22".repeat(64),
          })],
        }),
        verificationMaterial: [expect.objectContaining({
          credentialIDHex: "cafe",
          publicKeyCOSEHex: "a5010203",
          previousSignCount: 7,
        })],
      }));
    });
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
    });

    resetLabStateForTest((target) => target.fill(0x22));
    expect(await previewLabMakeCredential()).toBe(false);
    const runtimeState = get(labState).makeStep;
    expect(runtimeState).toMatchObject({
      phase: "error",
      responseEnvelope: null,
      previewEnvelope: null,
      runtimeError: failureForCode(Code.CodeInternalError),
    });
  });

  it("reopens an invalid authenticator before starting a fresh MakeCredential preview", async () => {
    const token = testHIDDevice("token-1", "Test authenticator");
    devices.set([token]);
    selectedSelector.set("token-1");
    selectedDevice.set(token);
    const invalidSelection = makePreviewEnvelope();
    invalidSelection.error = failureForCode(Code.CodeAuthenticatorClosed);
    const makeCredential = vi.spyOn(api, "makeCredential")
      .mockResolvedValueOnce(invalidSelection)
      .mockResolvedValueOnce(makePreviewEnvelope());
    vi.spyOn(api, "setSelection").mockResolvedValue({
      selection: {
        id: "authenticator-2",
      } as ActiveSelection,
    });

    expect(await previewLabMakeCredential()).toBe(false);
    expect(get(labState).makeStep.phase).toBe("error");
    expect(get(authenticatorStatus)).toMatchObject({ state: "error" });

    expect(await previewLabMakeCredential()).toBe(true);
    expect(makeCredential).toHaveBeenCalledTimes(2);
    expect(makeCredential.mock.calls[1][0].selectionId).toBe("authenticator-2");
    expect(get(labState).makeStep.phase).toBe("review");
  });

  it("reopens an invalid authenticator and reruns GetAssertion with the same client-data bytes", async () => {
    const initial = get(labState);
    expect(updateLabGetAssertionDraft({
      clientData: {
        ...initial.getDraft.clientData,
        mode: "raw",
        rawJSON: "{not-json\n",
      },
    })).toBe(true);
    const token = testHIDDevice("token-1", "Test authenticator");
    devices.set([token]);
    selectedSelector.set("token-1");
    selectedDevice.set(token);
    const invalidSelection = getResultEnvelope();
    invalidSelection.error = failureForCode(Code.CodeAuthenticatorClosed);
    const success = getResultEnvelope();
    success.selectionId = "authenticator-2";
    const getAssertion = vi.spyOn(api, "getAssertion")
      .mockResolvedValueOnce(invalidSelection)
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(success);
    vi.spyOn(api, "setSelection").mockResolvedValue({
      selection: {
        id: "authenticator-2",
      } as ActiveSelection,
    });

    expect(await runLabGetAssertion()).toBe(false);
    const firstRequest = getAssertion.mock.calls[0][0];
    expect(get(labState).getStep).toMatchObject({
      phase: "error",
      responseEnvelope: invalidSelection,
      runtimeError: null,
    });
    expect(get(authenticatorStatus)).toEqual({
      state: "error",
      error: failureForCode(Code.CodeAuthenticatorClosed),
    });

    expect(await rerunLabGetAssertion()).toBe(true);
    expect(getAssertion).toHaveBeenCalledTimes(2);
    expect(getAssertion.mock.calls[1][0]).toEqual({
      ...firstRequest,
      selectionId: "authenticator-2",
    });
    expect(getAssertion.mock.calls[1][0].clientDataJSON).toBe(firstRequest.clientDataJSON);
    expect(get(labState).getStep.phase).toBe("review");
    expect(await confirmLabGetAssertion()).toBe(true);
    expect(getAssertion).toHaveBeenCalledTimes(3);
    expect(getAssertion.mock.calls[2][0]).toMatchObject({ selectionId: "authenticator-2", dryRun: false });
    expect(getAssertion.mock.calls[2][0].clientDataJSON).toBe(firstRequest.clientDataJSON);
    expect(get(labState).getStep.phase).toBe("success");
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
        { credentialIDHex: "beef" },
        { credentialIDHex: "CAFE" },
      ],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(true);
    expect(get(labState).getDraft).toMatchObject({
      rpID: "example.com",
      allowList: [
        { credentialIDHex: "beef" },
        { credentialIDHex: "CAFE" },
      ],
      verificationMaterial: [{
        credentialIDHex: "cafe",
        publicKeyCOSEHex: "a5010203262001215820",
        previousSignCount: 0,
      }],
    });
    expect(get(labState).pendingHandoff).toBeNull();
    expect(toastMocks.success).toHaveBeenCalledOnce();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "success",
      title: "Passkey handed off",
    });
  });

  it("fills an empty RP and appends the created credential while preserving other entries", () => {
    seedSuccessfulMake("created.example", "cafe");
    expect(updateLabGetAssertionDraft({
      rpID: "",
      allowList: [{ credentialIDHex: "beef" }],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(true);
    expect(get(labState).getDraft).toMatchObject({
      rpID: "created.example",
      allowList: [
        { credentialIDHex: "beef" },
        { credentialIDHex: "cafe" },
      ],
      verificationMaterial: [{
        credentialIDHex: "cafe",
        publicKeyCOSEHex: "a5010203262001215820",
        previousSignCount: 0,
      }],
    });
    expect(get(labState).getStep.phase).toBe("editing");
  });

  it("requires confirmation for an RP mismatch; cancel is inert and confirm replaces the scenario", () => {
    seedSuccessfulMake("created.example", "cafe");
    expect(updateLabGetAssertionDraft({
      rpID: "other.example",
      allowList: [{ credentialIDHex: "beef" }],
    })).toBe(true);

    expect(handoffLabCredential()).toBe(false);
    expect(get(labState).pendingHandoff).toEqual({
      rpID: "created.example",
      credentialIDHex: "cafe",
      publicKeyCOSEHex: "a5010203262001215820",
      previousSignCount: 0,
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
      allowList: [{ credentialIDHex: "cafe" }],
      verificationMaterial: [{
        credentialIDHex: "cafe",
        publicKeyCOSEHex: "a5010203262001215820",
        previousSignCount: 0,
      }],
    });
    expect(get(labState).getStep.phase).toBe("editing");
  });

  it("requires confirmation when GetAssertion has a fixed result even for the same RP", () => {
    seedSuccessfulMake("example.com", "cafe");
    expect(updateLabGetAssertionDraft({
      allowList: [{ credentialIDHex: "beef" }],
    })).toBe(true);
    const current = get(labState);
    const request: GetAssertionRequest = buildGetAssertionRequest("authenticator-1", current.getDraft);
    labState.set({
      ...current,
      getStep: {
        phase: "success",
        previewRequest: request,
        previewEnvelope: getResultEnvelope("example.com"),
        request,
        responseEnvelope: getResultEnvelope("example.com"),
      },
    });

    expect(handoffLabCredential()).toBe(false);
    expect(get(labState).pendingHandoff).toEqual({
      rpID: "example.com",
      credentialIDHex: "cafe",
      publicKeyCOSEHex: "a5010203262001215820",
      previousSignCount: 0,
    });
    expect(confirmLabHandoff()).toBe(true);
    expect(get(labState).getDraft.allowList).toEqual([
      { credentialIDHex: "cafe" },
    ]);
    expect(get(labState).getDraft.verificationMaterial).toEqual([
      expect.objectContaining({
        credentialIDHex: "cafe",
        publicKeyCOSEHex: "a5010203262001215820",
        previousSignCount: 0,
      }),
    ]);
    expect(get(labState).getStep.phase).toBe("editing");
  });
});
