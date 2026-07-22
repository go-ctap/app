import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import {
  GetAssertionRequest,
  MakeCredentialRequest,
  type GetAssertionEnvelope,
} from "../../bindings/telesma/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  getAssertionPreview,
  getAssertionResult,
  inspectResult,
  makeCredentialPreview,
  makeCredentialResult,
} from "./ctapkit-results.js";
import {
  labState,
  type GetAssertionDraft,
  type LabState,
  type MakeCredentialDraft,
} from "./features/lab/state.js";
import { invalidateLargeBlobsInventory } from "./features/largeblobs/state.js";
import { invalidatePasskeysInventory } from "./features/passkeys/state.js";
import { authenticatorInspection } from "./features/authenticator/state.js";
import {
  buildClientDataJSON,
  buildGetAssertionRequest,
  buildMakeCredentialRequest,
  randomBase64URL,
  randomHex,
  validateGetAssertionDraft,
  validateMakeCredentialDraft,
} from "./lab-input.js";
import { currentSelectionID } from "./authenticator-boundary.js";
import { ensureActiveSelectionReady } from "./authenticator-controller.js";
import {
  operationStageFailureDetails,
  runTypedOperationStage,
} from "./operation-lifecycle.js";
import {
  setStatusOutcome,
} from "./workbench-state.js";

export function selectLabOperation(activeOperation: LabState["activeOperation"]) {
  labState.update((state) => ({ ...state, activeOperation }));
}

function demoClientData(
  type: "create" | "get",
  current: MakeCredentialDraft["clientData"] | GetAssertionDraft["clientData"],
) {
  const clientData = {
    ...current,
    origin: "https://example.com",
    challenge: randomBase64URL(32),
  };
  return {
    ...clientData,
    rawJSON: buildClientDataJSON(type, clientData),
  };
}

export function fillLabDemoValues() {
  const current = get(labState);
  if (current.activeOperation === "make") {
    return updateLabMakeCredentialDraft({
      rpID: "example.com",
      rpName: "Example",
      userIDHex: randomHex(16),
      userName: "alice@example.com",
      userDisplayName: "Alice",
      clientData: demoClientData("create", current.makeDraft.clientData),
      algorithms: ["-7"],
    });
  }
  return updateLabGetAssertionDraft({
    rpID: "example.com",
    clientData: demoClientData("get", current.getDraft.clientData),
  });
}

export function updateLabMakeCredentialDraft(patch: Partial<MakeCredentialDraft>) {
  const current = get(labState);
  if (
    current.makeStep.phase !== "editing"
    && !(current.makeStep.phase === "error" && current.makeStep.request === null)
  ) return false;
  const makeDraft = { ...current.makeDraft, ...patch };
  labState.set({
    ...current,
    makeDraft,
    makeStep: { phase: "editing" },
  });
  return true;
}

export function updateLabGetAssertionDraft(patch: Partial<GetAssertionDraft>) {
  const current = get(labState);
  if (
    current.getStep.phase !== "editing"
    && !(current.getStep.phase === "error" && current.getStep.request === null)
  ) return false;
  const getDraft = { ...current.getDraft, ...patch };
  labState.set({
    ...current,
    getDraft,
    getStep: { phase: "editing" },
  });
  return true;
}

export function regenerateLabUserID() {
  return updateLabMakeCredentialDraft({ userIDHex: randomHex(16) });
}

export function regenerateLabMakeChallenge() {
  const current = get(labState);
  return updateLabMakeCredentialDraft({
    clientData: { ...current.makeDraft.clientData, challenge: randomBase64URL(32) },
  });
}

export function regenerateLabGetChallenge() {
  const current = get(labState);
  return updateLabGetAssertionDraft({
    clientData: { ...current.getDraft.clientData, challenge: randomBase64URL(32) },
  });
}

export async function previewLabMakeCredential(): Promise<boolean> {
  const current = get(labState);
  if (
    current.makeStep.phase !== "editing"
    && !(current.makeStep.phase === "error" && current.makeStep.request === null)
  ) return false;

  const maxCredBlobLength = inspectResult(get(authenticatorInspection).data)?.info.maxCredBlobLength;
  const validation = validateMakeCredentialDraft(current.makeDraft, maxCredBlobLength);
  if (!validation.valid) return false;
  if (!await ensureActiveSelectionReady()) return false;

  const previewRequest = new MakeCredentialRequest({
    ...buildMakeCredentialRequest(currentSelectionID(), current.makeDraft),
    dryRun: true,
  });

  labState.update((state) => ({
    ...state,
    makeStep: { phase: "previewing", previewRequest },
  }));
  const label = m.lab_make_credential_preview();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.makeCredential(previewRequest),
    extract: makeCredentialPreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "error",
          previewRequest,
          previewEnvelope: null,
          request: null,
          responseEnvelope: details.responseEnvelope,
          runtimeError: details.runtimeError,
        },
      }));
    },
    onSuccess: (_preview, envelope) => labState.update((state) => ({
      ...state,
      makeStep: { phase: "review", previewRequest, previewEnvelope: envelope },
    })),
  });
  return outcome.ok;
}

export async function confirmLabMakeCredential(): Promise<boolean> {
  const current = get(labState);
  const step = current.makeStep;
  if (step.phase !== "review" && !(
    step.phase === "error"
    && step.previewEnvelope
    && step.request
  )) return false;
  const previewRequest = step.previewRequest;
  const previewEnvelope = step.previewEnvelope;
  if (!previewEnvelope) return false;

  const request = step.phase === "error" && step.request
    ? step.request
    : new MakeCredentialRequest({
        ...previewRequest,
        dryRun: false,
      });
  labState.update((state) => ({
    ...state,
    makeStep: {
      phase: "executing",
      previewRequest,
      previewEnvelope,
      request,
    },
  }));

  const label = m.lab_make_credential();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.makeCredential(request),
    extract: makeCredentialResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "error",
          previewRequest,
          previewEnvelope,
          request,
          responseEnvelope: details.responseEnvelope,
          runtimeError: details.runtimeError,
        },
      }));
    },
    onSuccess: (_result, envelope) => {
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "success",
          previewRequest,
          previewEnvelope,
          request,
          responseEnvelope: envelope,
        },
      }));
      invalidatePasskeysInventory();
      invalidateLargeBlobsInventory();
    },
  });
  return outcome.ok;
}

export function editLabMakeCredential() {
  const current = get(labState);
  if (current.makeStep.phase === "editing") return true;
  labState.set({
    ...current,
    pendingHandoff: null,
    makeStep: { phase: "editing" },
  });
  return true;
}

export function newLabMakeCredentialRun() {
  const current = get(labState);
  const makeDraft = current.makeDraft.clientData.mode === "builder"
    ? {
        ...current.makeDraft,
        clientData: { ...current.makeDraft.clientData, challenge: randomBase64URL(32) },
      }
    : current.makeDraft;
  labState.set({
    ...current,
    pendingHandoff: null,
    makeDraft,
    makeStep: { phase: "editing" },
  });
  return true;
}

async function executeGetAssertion(
  previewRequest: GetAssertionRequest,
  previewEnvelope: GetAssertionEnvelope,
  request: GetAssertionRequest,
): Promise<boolean> {
  labState.update((state) => ({
    ...state,
    getStep: { phase: "executing", previewRequest, previewEnvelope, request },
  }));
  const label = m.lab_get_assertion();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.getAssertion(request),
    extract: getAssertionResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      labState.update((state) => ({
        ...state,
        getStep: {
          phase: "error",
          previewRequest,
          previewEnvelope,
          request,
          responseEnvelope: details.responseEnvelope,
          runtimeError: details.runtimeError,
        },
      }));
    },
    onSuccess: (_result, envelope) => {
      labState.update((state) => ({
        ...state,
        getStep: { phase: "success", previewRequest, previewEnvelope, request, responseEnvelope: envelope },
      }));
      if (request.extensions?.largeBlob?.write !== undefined) invalidateLargeBlobsInventory();
    },
  });
  return outcome.ok;
}

export async function runLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (
    current.getStep.phase !== "editing"
    && !(current.getStep.phase === "error" && current.getStep.request === null)
  ) return false;
  const validation = validateGetAssertionDraft(current.getDraft);
  if (!validation.valid) return false;
  if (!await ensureActiveSelectionReady()) return false;

  const previewRequest = new GetAssertionRequest({
    ...buildGetAssertionRequest(currentSelectionID(), current.getDraft),
    dryRun: true,
  });
  labState.update((state) => ({
    ...state,
    getStep: { phase: "previewing", previewRequest },
  }));
  const label = m.lab_get_assertion();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.getAssertion(previewRequest),
    extract: getAssertionPreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      labState.update((state) => ({
        ...state,
        getStep: {
          phase: "error",
          previewRequest,
          previewEnvelope: null,
          request: null,
          responseEnvelope: details.responseEnvelope,
          runtimeError: details.runtimeError,
        },
      }));
    },
    onSuccess: (_preview, envelope) => labState.update((state) => ({
      ...state,
      getStep: { phase: "review", previewRequest, previewEnvelope: envelope },
    })),
  });
  return outcome.ok;
}

export async function confirmLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  const step = current.getStep;
  if (step.phase !== "review" && !(
    step.phase === "error"
    && step.previewEnvelope
    && step.request
  )) return false;
  if (!step.previewEnvelope || !await ensureActiveSelectionReady()) return false;

  const request = step.phase === "error" && step.request
    ? step.request
    : new GetAssertionRequest({
        ...step.previewRequest,
        dryRun: false,
      });
  return executeGetAssertion(step.previewRequest, step.previewEnvelope, request);
}

/** GetAssertion retries the exact frozen execution request. */
export async function rerunLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (current.getStep.phase !== "error") return false;
  if (current.getStep.request === null) return runLabGetAssertion();
  return confirmLabGetAssertion();
}

export function editLabGetAssertion() {
  const current = get(labState);
  if (current.getStep.phase === "editing") return true;
  labState.set({
    ...current,
    pendingHandoff: null,
    activeOperation: "get",
    getStep: { phase: "editing" },
  });
  return true;
}

export function newLabGetAssertionRun() {
  const current = get(labState);
  const getDraft = current.getDraft.clientData.mode === "builder"
    ? {
        ...current.getDraft,
        clientData: { ...current.getDraft.clientData, challenge: randomBase64URL(32) },
      }
    : current.getDraft;
  labState.set({
    ...current,
    pendingHandoff: null,
    activeOperation: "get",
    getDraft,
    getStep: { phase: "editing" },
  });
  return true;
}

function completeHandoff(rpID: string, credentialIDHex: string, replace: boolean) {
  const current = get(labState);
  const duplicate = current.getDraft.allowList.some(
    (entry) => entry.credentialIDHex.trim().toLowerCase() === credentialIDHex.toLowerCase(),
  );
  const created = { credentialIDHex };
  const allowList = replace
    ? [created]
    : duplicate ? current.getDraft.allowList : [...current.getDraft.allowList, created];
  const getDraft = { ...current.getDraft, rpID, allowList };
  labState.set({
    ...current,
    pendingHandoff: null,
    activeOperation: "get",
    getDraft,
    getStep: { phase: "editing" },
  });
  const outcome = {
    tone: "success" as const,
    title: m.lab_handoff_complete(),
    message: m.lab_handoff_complete_message(),
  };
  setStatusOutcome(outcome);
  toast.success(outcome.title, { description: outcome.message });
  return true;
}

/** Starts handoff. `false` means a confirmation dialog is now represented in state. */
export function handoffLabCredential() {
  const current = get(labState);
  if (current.makeStep.phase !== "success") return false;
  const result = makeCredentialResult(current.makeStep.responseEnvelope)!;
  const differentRP = Boolean(current.getDraft.rpID && current.getDraft.rpID !== result.rpID);
  const fixedResult = current.getStep.phase === "success";
  if (differentRP || fixedResult) {
    labState.set({
      ...current,
      pendingHandoff: {
        rpID: result.rpID,
        credentialIDHex: result.credentialIDHex,
      },
    });
    return false;
  }
  return completeHandoff(result.rpID, result.credentialIDHex, false);
}

export function confirmLabHandoff() {
  const pending = get(labState).pendingHandoff;
  if (!pending) return false;
  return completeHandoff(pending.rpID, pending.credentialIDHex, true);
}

export function cancelLabHandoff() {
  labState.update((state) => ({ ...state, pendingHandoff: null }));
}
