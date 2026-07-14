import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import {
  GetAssertionRequest,
  MakeCredentialRequest,
} from "../../bindings/github.com/go-ctap/kit/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import { makeCredentialResult } from "./ctapkit-results.js";
import {
  labState,
  createPresetState,
  type GetAssertionDraft,
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
import { isIncorrectPINFailure, runtimeFailureFrom } from "./failure.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { ensureSelectedSessionReady } from "./session-controller.js";
import {
  beginOperation,
  setStatusOutcome,
  summarizeEnvelope,
  summarizeOperationFailure,
} from "./workbench-state.js";

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
    makeStep: { phase: "editing" },
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

  const validation = validateMakeCredentialDraft(current.makeDraft);
  if (!validation.valid) return false;
  if (!await ensureSelectedSessionReady()) return false;

  const previewRequest = new MakeCredentialRequest({
    ...buildMakeCredentialRequest(selectedSessionId(), current.makeDraft),
    dryRun: true,
  });

  labState.update((state) => ({
    ...state,
    makeStep: { phase: "previewing", previewRequest },
  }));
  try {
    beginOperation(m.lab_make_credential_preview());
    const envelope = await api.makeCredential(previewRequest);
    if (envelope.error) {
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "error",
          previewRequest,
          previewEnvelope: null,
          request: null,
          responseEnvelope: envelope,
          runtimeError: null,
        },
      }));
    } else {
      labState.update((state) => ({
        ...state,
        makeStep: { phase: "review", previewRequest, previewEnvelope: envelope },
      }));
    }
    summarizeEnvelope(m.lab_make_credential_preview(), envelope);
    applyInvalidSessionError(envelope.error);
    return !envelope.error;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    labState.update((state) => ({
      ...state,
      makeStep: {
        phase: "error",
        previewRequest,
        previewEnvelope: null,
        request: null,
        responseEnvelope: null,
        runtimeError,
      },
    }));
    summarizeOperationFailure(m.lab_make_credential_preview(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function confirmLabMakeCredential(): Promise<boolean> {
  const current = get(labState);
  const step = current.makeStep;
  if (step.phase !== "review" && !(
    step.phase === "error"
    && step.previewEnvelope
    && isIncorrectPINFailure(step.responseEnvelope?.error)
  )) return false;
  const previewRequest = step.previewRequest;
  const previewEnvelope = step.previewEnvelope;
  if (!previewEnvelope) return false;

  const request = new MakeCredentialRequest({
    ...previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.lab_confirm_make_credential(),
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

  try {
    beginOperation(m.lab_make_credential());
    const envelope = await api.makeCredential(request);
    if (envelope.error) {
      labState.update((state) => ({
        ...state,
        makeStep: {
          phase: "error",
          previewRequest,
          previewEnvelope,
          request,
          responseEnvelope: envelope,
          runtimeError: null,
        },
      }));
    } else {
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
    }
    summarizeEnvelope(m.lab_make_credential(), envelope);
    applyInvalidSessionError(envelope.error);
    return !envelope.error;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    labState.update((state) => ({
      ...state,
      makeStep: {
        phase: "error",
        previewRequest,
        previewEnvelope,
        request,
        responseEnvelope: null,
        runtimeError,
      },
    }));
    summarizeOperationFailure(m.lab_make_credential(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }
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
    isCustom: true,
    pendingHandoff: null,
    makeDraft,
    makeStep: { phase: "editing" },
  });
  return true;
}

async function executeGetAssertion(request: GetAssertionRequest): Promise<boolean> {
  labState.update((state) => ({
    ...state,
    getStep: { phase: "executing", request },
  }));
  try {
    beginOperation(m.lab_get_assertion());
    const envelope = await api.getAssertion(request);
    if (envelope.error) {
      labState.update((state) => ({
        ...state,
        getStep: { phase: "error", request, responseEnvelope: envelope, runtimeError: null },
      }));
    } else {
      labState.update((state) => ({
        ...state,
        getStep: { phase: "success", request, responseEnvelope: envelope },
      }));
    }
    summarizeEnvelope(m.lab_get_assertion(), envelope);
    applyInvalidSessionError(envelope.error);
    return !envelope.error;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    labState.update((state) => ({
      ...state,
      getStep: { phase: "error", request, responseEnvelope: null, runtimeError },
    }));
    summarizeOperationFailure(m.lab_get_assertion(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function runLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (current.getStep.phase !== "editing") return false;
  const validation = validateGetAssertionDraft(current.getDraft);
  if (!validation.valid) return false;
  if (!await ensureSelectedSessionReady()) return false;

  const request = buildGetAssertionRequest(selectedSessionId(), current.getDraft);
  return executeGetAssertion(request);
}

/** GetAssertion retries the frozen payload with the currently open session. */
export async function rerunLabGetAssertion(): Promise<boolean> {
  const current = get(labState);
  if (current.getStep.phase !== "error") return false;
  if (!await ensureSelectedSessionReady()) return false;
  const request = new GetAssertionRequest({
    ...current.getStep.request,
    sessionId: selectedSessionId(),
  });
  return executeGetAssertion(request);
}

export function editLabGetAssertion() {
  const current = get(labState);
  if (current.getStep.phase === "editing") return true;
  labState.set({
    ...current,
    pendingHandoff: null,
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
    isCustom: true,
    pendingHandoff: null,
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
