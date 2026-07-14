import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import { Code, type Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  GetAssertionEnvelope,
  GetAssertionRequest,
  MakeCredentialEnvelope,
  MakeCredentialRequest,
} from "../../bindings/github.com/go-ctap/kit/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  getAssertionResult,
  makeCredentialPreview,
  makeCredentialResult,
} from "./ctapkit-results.js";
import {
  labState,
  createPresetState,
  type GetAssertionDraft,
  type LabGetFailureReason,
  type LabMakeFailureReason,
  type LabPresetID,
  type LabState,
  type MakeCredentialDraft,
} from "./features/lab/state.js";
import { invalidateLargeBlobsInventory } from "./features/largeblobs/state.js";
import { invalidatePasskeysInventory } from "./features/passkeys/state.js";
import {
  buildGetAssertionRequest,
  buildMakeCredentialRequest,
  randomBase64URL,
  randomHex,
  validateGetAssertionDraft,
  validateMakeCredentialDraft,
} from "./lab-input.js";
import { failureForCode, isInvalidSessionFailure, runtimeFailureFrom } from "./failure.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { ensureSelectedSessionReady } from "./session-controller.js";
import {
  beginOperation,
  setStatusOutcome,
  summarizeEnvelope,
  summarizeOperationContractFailure,
  summarizeOperationFailure,
} from "./workbench-state.js";

function retryAction(action: () => Promise<unknown>) {
  return async () => { await action(); };
}

function missingOutput() {
  return failureForCode(Code.CodeInternalError);
}

function operationIsActive(state: LabState) {
  return state.makeStep.phase === "previewing"
    || state.makeStep.phase === "executing"
    || state.getStep.phase === "executing";
}

function scenarioIsDirty(state: LabState) {
  return state.isCustom
    || state.makeStep.phase !== "editing"
    || state.getStep.phase !== "editing"
    || state.pendingHandoff !== null;
}

function applyPreset(presetID: LabPresetID) {
  labState.set(createPresetState(presetID));
}

/** Returns true when the preset was applied immediately, false when confirmation is pending. */
export function requestLabPreset(presetID: LabPresetID) {
  const current = get(labState);
  if (operationIsActive(current)) return false;
  if (scenarioIsDirty(current)) {
    labState.set({ ...current, pendingPresetID: presetID });
    return false;
  }
  applyPreset(presetID);
  return true;
}

export function confirmLabPreset() {
  const pendingPresetID = get(labState).pendingPresetID;
  if (!pendingPresetID) return false;
  applyPreset(pendingPresetID);
  return true;
}

export function cancelLabPreset() {
  labState.update((state) => ({ ...state, pendingPresetID: null }));
}

export function updateLabMakeCredentialDraft(patch: Partial<MakeCredentialDraft>) {
  const current = get(labState);
  if (current.makeStep.phase !== "editing") return false;
  const makeDraft = { ...current.makeDraft, ...patch };
  labState.set({
    ...current,
    isCustom: true,
    makeDraft,
    makeStep: { phase: "editing", validation: validateMakeCredentialDraft(makeDraft) },
  });
  return true;
}

export function updateLabGetAssertionDraft(patch: Partial<GetAssertionDraft>) {
  const current = get(labState);
  if (current.getStep.phase !== "editing") return false;
  const getDraft = { ...current.getDraft, ...patch };
  labState.set({
    ...current,
    isCustom: true,
    getDraft,
    getStep: { phase: "editing", validation: validateGetAssertionDraft(getDraft) },
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

function makeError(
  _base: LabState,
  failedPhase: "previewing" | "executing",
  previewRequest: MakeCredentialRequest | null,
  previewEnvelope: MakeCredentialEnvelope | null,
  request: MakeCredentialRequest | null,
  responseEnvelope: MakeCredentialEnvelope | null,
  runtimeError: Failure | null,
  failureReason: LabMakeFailureReason,
) {
  labState.update((state) => ({
    ...state,
    makeStep: {
      phase: "error",
      failedPhase,
      previewRequest,
      previewEnvelope,
      request,
      responseEnvelope,
      runtimeError,
      failureReason,
      validation: validateMakeCredentialDraft(state.makeDraft),
    },
  }));
}

export async function previewLabMakeCredential(): Promise<boolean> {
  const current = get(labState);
  if (current.makeStep.phase !== "editing" && current.makeStep.phase !== "error") return false;
  if (current.getStep.phase === "executing") return false;

  const validation = validateMakeCredentialDraft(current.makeDraft);
  if (!validation.valid) {
    labState.set({ ...current, makeStep: { phase: "editing", validation } });
    return false;
  }
  if (!await ensureSelectedSessionReady()) return false;

  let previewRequest: MakeCredentialRequest;
  try {
    previewRequest = {
      ...buildMakeCredentialRequest(selectedSessionId(), current.makeDraft),
      dryRun: true,
    };
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    makeError(current, "previewing", null, null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.lab_make_credential_preview(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

  labState.update((state) => ({
    ...state,
    makeStep: { phase: "previewing", previewRequest, validation },
  }));
  try {
    beginOperation(m.lab_make_credential_preview());
    const envelope = await api.makeCredential(previewRequest);
    const preview = makeCredentialPreview(envelope);
    if (envelope.error) {
      makeError(
        current,
        "previewing",
        previewRequest,
        null,
        null,
        envelope,
        null,
        isInvalidSessionFailure(envelope.error) ? "invalid-session" : "response-error",
      );
    } else if (!preview) {
      makeError(current, "previewing", previewRequest, null, null, envelope, null, "missing-preview");
    } else {
      labState.update((state) => ({
        ...state,
        makeStep: { phase: "review", previewRequest, previewEnvelope: envelope, validation },
      }));
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.lab_make_credential_preview(), envelope, retryAction(retryLabMakeCredential));
    } else {
      summarizeOperationContractFailure(m.lab_make_credential_preview(), missingOutput());
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    makeError(current, "previewing", previewRequest, null, null, null, runtimeError,
      isInvalidSessionFailure(runtimeError) ? "invalid-session" : "runtime-error");
    summarizeOperationFailure(m.lab_make_credential_preview(), runtimeError, retryAction(retryLabMakeCredential));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function confirmLabMakeCredential(): Promise<boolean> {
  const current = get(labState);
  if (current.makeStep.phase !== "review" || current.getStep.phase === "executing") return false;

  const request: MakeCredentialRequest = {
    ...current.makeStep.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.lab_confirm_make_credential(),
  };
  const review = current.makeStep;
  labState.update((state) => ({
    ...state,
    makeStep: {
      phase: "executing",
      previewRequest: review.previewRequest,
      previewEnvelope: review.previewEnvelope,
      request,
      validation: review.validation,
    },
  }));

  try {
    beginOperation(m.lab_make_credential());
    const envelope = await api.makeCredential(request);
    const result = makeCredentialResult(envelope);
    if (envelope.error) {
      makeError(
        current,
        "executing",
        review.previewRequest,
        review.previewEnvelope,
        request,
        envelope,
        null,
        isInvalidSessionFailure(envelope.error) ? "invalid-session" : "response-error",
      );
    } else if (!result) {
      makeError(current, "executing", review.previewRequest, review.previewEnvelope, request, envelope, null, "missing-result");
    } else {
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "success",
          previewRequest: review.previewRequest,
          previewEnvelope: review.previewEnvelope,
          request,
          responseEnvelope: envelope,
          validation: review.validation,
        },
      }));
      invalidatePasskeysInventory();
      invalidateLargeBlobsInventory();
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.lab_make_credential(), envelope, retryAction(retryLabMakeCredential));
    } else {
      summarizeOperationContractFailure(m.lab_make_credential(), missingOutput());
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(result);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    makeError(
      current,
      "executing",
      review.previewRequest,
      review.previewEnvelope,
      request,
      null,
      runtimeError,
      isInvalidSessionFailure(runtimeError) ? "invalid-session" : "runtime-error",
    );
    summarizeOperationFailure(m.lab_make_credential(), runtimeError, retryAction(retryLabMakeCredential));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

/** MakeCredential retries always return to a fresh preview and therefore require Confirm again. */
export async function retryLabMakeCredential() {
  const current = get(labState);
  if (current.makeStep.phase !== "error") return false;
  return previewLabMakeCredential();
}

export function editLabMakeCredential() {
  const current = get(labState);
  if (current.makeStep.phase === "previewing" || current.makeStep.phase === "executing") return false;
  if (current.makeStep.phase === "editing") return true;
  labState.set({
    ...current,
    pendingHandoff: null,
    makeStep: { phase: "editing", validation: validateMakeCredentialDraft(current.makeDraft) },
  });
  return true;
}

export function newLabMakeCredentialRun() {
  const current = get(labState);
  if (current.makeStep.phase === "previewing" || current.makeStep.phase === "executing") return false;
  const makeDraft = current.makeDraft.clientData.mode === "builder"
    ? {
        ...current.makeDraft,
        clientData: { ...current.makeDraft.clientData, challenge: randomBase64URL(32) },
      }
    : current.makeDraft;
  labState.set({
    ...current,
    isCustom: true,
    pendingHandoff: null,
    makeDraft,
    makeStep: { phase: "editing", validation: validateMakeCredentialDraft(makeDraft) },
  });
  return true;
}

function getError(
  _base: LabState,
  request: GetAssertionRequest | null,
  responseEnvelope: GetAssertionEnvelope | null,
  runtimeError: Failure | null,
  failureReason: LabGetFailureReason,
) {
  labState.update((state) => ({
    ...state,
    getStep: {
      phase: "error",
      request,
      responseEnvelope,
      runtimeError,
      failureReason,
      validation: validateGetAssertionDraft(state.getDraft),
    },
  }));
}

async function executeGetAssertion(base: LabState, request: GetAssertionRequest): Promise<boolean> {
  const validation = validateGetAssertionDraft(base.getDraft);
  labState.update((state) => ({
    ...state,
    getStep: { phase: "executing", request, validation },
  }));
  try {
    beginOperation(m.lab_get_assertion());
    const envelope = await api.getAssertion(request);
    const result = getAssertionResult(envelope);
    if (envelope.error) {
      getError(
        base,
        request,
        envelope,
        null,
        isInvalidSessionFailure(envelope.error) ? "invalid-session" : "response-error",
      );
    } else if (!result) {
      getError(base, request, envelope, null, "missing-result");
    } else {
      labState.update((state) => ({
        ...state,
        getStep: { phase: "success", request, responseEnvelope: envelope, validation },
      }));
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.lab_get_assertion(), envelope, retryAction(retryLabGetAssertion));
    } else {
      summarizeOperationContractFailure(m.lab_get_assertion(), missingOutput());
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(result);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    getError(base, request, null, runtimeError,
      isInvalidSessionFailure(runtimeError) ? "invalid-session" : "runtime-error");
    summarizeOperationFailure(m.lab_get_assertion(), runtimeError, retryAction(retryLabGetAssertion));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function runLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (current.getStep.phase !== "editing") return false;
  if (current.makeStep.phase === "previewing" || current.makeStep.phase === "executing") return false;
  const validation = validateGetAssertionDraft(current.getDraft);
  if (!validation.valid) {
    labState.set({ ...current, getStep: { phase: "editing", validation } });
    return false;
  }
  if (!await ensureSelectedSessionReady()) return false;

  let request: GetAssertionRequest;
  try {
    request = buildGetAssertionRequest(selectedSessionId(), current.getDraft);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    getError(current, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.lab_get_assertion(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }
  return executeGetAssertion(current, request);
}

/** GetAssertion retries the exact frozen request, including its client-data bytes. */
export async function retryLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (current.getStep.phase !== "error" || !current.getStep.request) return false;
  if (current.getStep.failureReason === "invalid-session") return false;
  if (!await ensureSelectedSessionReady()) return false;
  return executeGetAssertion(current, current.getStep.request);
}

export function editLabGetAssertion() {
  const current = get(labState);
  if (current.getStep.phase === "executing") return false;
  if (current.getStep.phase === "editing") return true;
  labState.set({
    ...current,
    pendingHandoff: null,
    getStep: { phase: "editing", validation: validateGetAssertionDraft(current.getDraft) },
  });
  return true;
}

export function newLabGetAssertionRun() {
  const current = get(labState);
  if (current.getStep.phase === "executing") return false;
  const getDraft = current.getDraft.clientData.mode === "builder"
    ? {
        ...current.getDraft,
        clientData: { ...current.getDraft.clientData, challenge: randomBase64URL(32) },
      }
    : current.getDraft;
  labState.set({
    ...current,
    isCustom: true,
    pendingHandoff: null,
    getDraft,
    getStep: { phase: "editing", validation: validateGetAssertionDraft(getDraft) },
  });
  return true;
}

function completeHandoff(rpID: string, credentialIDHex: string, replace: boolean) {
  const current = get(labState);
  const duplicate = current.getDraft.allowList.some(
    (entry) => entry.credentialIDHex.trim().toLowerCase() === credentialIDHex.toLowerCase(),
  );
  const created = { credentialIDHex, transports: [] };
  const allowList = replace
    ? [created]
    : duplicate ? current.getDraft.allowList : [...current.getDraft.allowList, created];
  const getDraft = { ...current.getDraft, rpID, allowList };
  labState.set({
    ...current,
    isCustom: true,
    pendingHandoff: null,
    getDraft,
    getStep: { phase: "editing", validation: validateGetAssertionDraft(getDraft) },
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
  if (current.makeStep.phase !== "success" || current.getStep.phase === "executing") return false;
  const result = makeCredentialResult(current.makeStep.responseEnvelope);
  if (!result) return false;
  const differentRP = Boolean(current.getDraft.rpID && current.getDraft.rpID !== result.rpID);
  const fixedResult = current.getStep.phase === "success";
  if (differentRP || fixedResult) {
    labState.set({
      ...current,
      pendingHandoff: {
        reason: differentRP ? "rp-mismatch" : "result-reset",
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
