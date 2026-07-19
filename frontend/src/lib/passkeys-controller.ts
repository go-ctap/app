import { get } from "svelte/store";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialListRequest,
  CredentialStoreStateEnvelope,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
} from "../../bindings/fidobench/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  credentialDeletePreview,
  credentialDeleteResult,
  credentialStoreStateResult,
  credentialsReport,
  credentialUpdatePreview,
  credentialUpdateResult,
} from "./ctapkit-results.js";
import {
  beginPasskeysInventoryLoad,
  beginCredentialStoreStateLoad,
  completePasskeysInventoryLoad,
  completeCredentialStoreStateLoad,
  failCredentialStoreStateLoadAtRuntime,
  failCredentialStoreStateLoadWithContractError,
  failCredentialStoreStateLoadWithResponse,
  failPasskeysInventoryLoadAtRuntime,
  failPasskeysInventoryLoadWithResponse,
  passkeysInventoryState,
  passkeysMutation,
  passkeysQuery,
  passkeysSelectedCredentialID,
  passkeysStatusFilter,
  passkeysVerificationFlow,
  resetPasskeysDeviceState,
  type CredentialUpdateForm,
  type CredentialUpdateValidationError,
  type PasskeysMutationState,
  type PasskeysStatusFilter,
} from "./features/passkeys/state.js";
import { selectedSelector, authenticatorStatus } from "./features/authenticator/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { findPasskeyCredential, type PasskeyCredentialTarget } from "./passkeys-presentation.js";
import { internalFailure, runtimeFailureFrom } from "./failure.js";
import { currentSelectionID } from "./authenticator-boundary.js";
import {
  editingMutation,
  executingMutation,
  failedEditableMutation,
  failedMutation,
  idleMutation,
  mutationExecutionContext,
  previewingMutation,
  reviewedMutation,
  type MutationFailedPhase,
} from "./mutation-lifecycle.js";
import {
  completeOperation,
  operationStageFailureDetails,
  runOperation,
  runTypedOperationStage,
} from "./operation-lifecycle.js";

function passkeysAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const selectionId = get(authenticatorStatus).selectionId || "";
  return selector && selectionId ? `${selector}:${selectionId}` : "";
}

function shouldAutoLoadPasskeys() {
  const inventory = get(passkeysInventoryState);
  return get(activeScreen) === "passkeys"
    && Boolean(passkeysAutoLoadKey())
    && !inventory.lastSuccessfulEnvelope
    && inventory.phase !== "loading"
    && inventory.phase !== "refreshing"
    && inventory.phase !== "unsupported";
}

function reconcileSelectedCredential() {
  const selectedID = get(passkeysSelectedCredentialID);
  if (!selectedID) return;
  const report = credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope);
  if (findPasskeyCredential(report, selectedID)) return;
  passkeysSelectedCredentialID.set("");
  passkeysMutation.set(idleMutation());
}

export async function maybeLoadPasskeys() {
  if (!shouldAutoLoadPasskeys()) return;
  await loadPasskeys();
}

export async function loadPasskeys() {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    resetPasskeysDeviceState();
    return false;
  }

  beginPasskeysInventoryLoad();
  const label = m.credential_inventory();
  const request: CredentialListRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(passkeysVerificationFlow),
  };
  const attempt = await runOperation({
    label,
    call: () => api.listCredentials(request),
    onRuntimeFailure: failPasskeysInventoryLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const report = credentialsReport(envelope);
  if (envelope.error || !report) {
    failPasskeysInventoryLoadWithResponse(envelope);
  } else {
    completePasskeysInventoryLoad(envelope, new Date().toISOString());
    reconcileSelectedCredential();
  }
  completeOperation(label, envelope, { contractValid: Boolean(report) });
  return !envelope.error && Boolean(report);
}

export async function loadCredentialStoreState(): Promise<boolean> {
  const inventory = credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope);
  if (!get(selectedSelector).trim() || !inventory?.support.readOnlyPermission) return false;

  beginCredentialStoreStateLoad();
  const label = m.credential_store_state_operation();
  const attempt = await runOperation({
    label,
    call: (): Promise<CredentialStoreStateEnvelope> => api.credentialStoreState({
      selectionId: currentSelectionID(),
      verificationFlow: get(passkeysVerificationFlow),
    }),
    onRuntimeFailure: failCredentialStoreStateLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const result = credentialStoreStateResult(envelope);
  if (envelope.error) {
    failCredentialStoreStateLoadWithResponse(envelope);
  } else if (!result) {
    failCredentialStoreStateLoadWithContractError(envelope, internalFailure());
  } else {
    completeCredentialStoreStateLoad(envelope);
  }
  completeOperation(label, envelope, { contractValid: Boolean(result) });
  return !envelope.error && Boolean(result);
}

export function setPasskeysQuery(value: string) {
  passkeysQuery.set(value);
}

export function setPasskeysStatusFilter(value: PasskeysStatusFilter) {
  passkeysStatusFilter.set(value);
}

export function selectPasskeyCredential(credentialIDHex: string) {
  passkeysSelectedCredentialID.set(credentialIDHex);
}

export function setPasskeysVerificationFlow(value: VerificationFlow) {
  passkeysVerificationFlow.set(value);
}

function mutationsAvailable(kind: "update" | "delete") {
  const inventory = get(passkeysInventoryState);
  if (inventory.phase === "loading" || inventory.phase === "refreshing") return false;
  const authenticator = get(authenticatorStatus);
  if (authenticator.state !== "ready" || !authenticator.selectionId) return false;
  const report = credentialsReport(inventory.lastSuccessfulEnvelope);
  if (!report?.support.credentialManagement) return false;
  return kind === "delete" || !report.support.previewOnly;
}

function updateFormFor(credentialIDHex: string): CredentialUpdateForm | null {
  const report = credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope);
  const target = findPasskeyCredential(report, credentialIDHex);
  if (!target) return null;
  return {
    userIDHex: target.credential.userIDHex ?? "",
    name: target.credential.userName ?? "",
    displayName: target.credential.displayName ?? "",
  };
}

function updateMutationBase(current: Extract<PasskeysMutationState, { kind: "update" }>) {
  return {
    kind: "update" as const,
    credentialIDHex: current.credentialIDHex,
    original: current.original,
    form: current.form,
  };
}

function deleteMutationBase(credentialIDHex: string) {
  return { kind: "delete" as const, credentialIDHex };
}

function editingCredentialUpdate(
  base: ReturnType<typeof updateMutationBase>,
  validationError: CredentialUpdateValidationError | null,
) {
  return editingMutation(base, validationError);
}

export function beginCredentialUpdate(credentialIDHex = get(passkeysSelectedCredentialID)) {
  if (!mutationsAvailable("update")) return false;
  const original = updateFormFor(credentialIDHex);
  if (!original) return false;
  passkeysSelectedCredentialID.set(credentialIDHex);
  passkeysMutation.set(editingCredentialUpdate({
    kind: "update" as const,
    credentialIDHex,
    original,
    form: { ...original },
  }, null));
  return true;
}

export function updateCredentialDraft(patch: Partial<CredentialUpdateForm>) {
  const current = get(passkeysMutation);
  if (current.kind !== "update") return false;
  passkeysMutation.set(editingCredentialUpdate({
    ...updateMutationBase(current),
    form: { ...current.form, ...patch },
  }, null));
  return true;
}

export function editCredentialUpdate() {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || (current.phase !== "review" && current.phase !== "error")) return false;
  passkeysMutation.set(editingCredentialUpdate(updateMutationBase(current), null));
  return true;
}

export function normalizeCredentialUpdateForm(form: CredentialUpdateForm): CredentialUpdateForm {
  return {
    userIDHex: form.userIDHex.trim().toLowerCase(),
    name: form.name.trim(),
    displayName: form.displayName.trim(),
  };
}

export function validateCredentialUpdate(
  original: CredentialUpdateForm,
  form: CredentialUpdateForm,
): CredentialUpdateValidationError | null {
  const current = normalizeCredentialUpdateForm(original);
  const proposed = normalizeCredentialUpdateForm(form);
  if (!proposed.userIDHex) return "user-id-required";
  if (proposed.userIDHex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(proposed.userIDHex)) return "user-id-invalid-hex";
  if (current.userIDHex === proposed.userIDHex && current.name === proposed.name && current.displayName === proposed.displayName) return "no-changes";
  return null;
}

export function buildCredentialUpdatePreviewRequest(
  selectionId: string,
  verificationFlow: VerificationFlow,
  target: PasskeyCredentialTarget,
  original: CredentialUpdateForm,
  form: CredentialUpdateForm,
): CredentialUpdateRequest {
  const current = normalizeCredentialUpdateForm(original);
  const proposed = normalizeCredentialUpdateForm(form);
  const userIDChanged = proposed.userIDHex !== current.userIDHex;
  const nameChanged = proposed.name !== current.name;
  const displayNameChanged = proposed.displayName !== current.displayName;
  return {
    selectionId,
    verificationFlow,
    target: {
      record: target.credential,
      rp: {
        id: target.relyingParty.rpID,
        ...(target.relyingParty.rpName ? { name: target.relyingParty.rpName } : {}),
        ...(target.relyingParty.rpIDHashHex ? { idHashHex: target.relyingParty.rpIDHashHex } : {}),
      },
      user: {
        userIDHex: current.userIDHex,
        name: current.name,
        displayName: current.displayName,
      },
    },
    ...(userIDChanged ? { userIdHex: proposed.userIDHex, userIdProvided: true } : {}),
    ...(nameChanged ? { name: proposed.name, nameProvided: true } : {}),
    ...(displayNameChanged ? { displayName: proposed.displayName, displayProvided: true } : {}),
    dryRun: true,
  };
}

function updateError(
  current: Extract<PasskeysMutationState, { kind: "update" }>,
  failedPhase: MutationFailedPhase,
  previewRequest: CredentialUpdateRequest | null,
  previewEnvelope: CredentialUpdateEnvelope | null,
  responseEnvelope: CredentialUpdateEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: "response-error" | "runtime-error" | "missing-preview" | "missing-result",
) {
  passkeysMutation.set(failedEditableMutation(updateMutationBase(current), {
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }));
}

export async function previewCredentialUpdate(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || (current.phase !== "editing" && current.phase !== "error")) return false;
  if (!mutationsAvailable("update")) return false;
  const validationError = validateCredentialUpdate(current.original, current.form);
  if (validationError) {
    passkeysMutation.set(editingCredentialUpdate(updateMutationBase(current), validationError));
    return false;
  }

  const request = buildCredentialUpdatePreviewRequest(
    currentSelectionID(),
    get(passkeysVerificationFlow),
    findPasskeyCredential(
      credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope),
      current.credentialIDHex,
    )!,
    current.original,
    current.form,
  );

  passkeysMutation.set(previewingMutation(updateMutationBase(current), request));
  const label = m.credential_update_preview();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.updateCredentialUser(request),
    extract: credentialUpdatePreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      updateError(current, "previewing", request, null, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: (_preview, envelope) => passkeysMutation.set(
      reviewedMutation(updateMutationBase(current), request, envelope),
    ),
  });
  return outcome.ok;
}

export async function confirmCredentialUpdate(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext(current);
  if (!execution) return false;
  const { previewRequest, previewEnvelope } = execution;
  const request: CredentialUpdateRequest = {
    ...previewRequest,
    dryRun: false,
  };
  passkeysMutation.set(executingMutation(
    updateMutationBase(current),
    previewRequest,
    previewEnvelope,
  ));
  const label = m.credential_update();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.updateCredentialUser(request),
    extract: credentialUpdateResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      updateError(current, "executing", previewRequest, previewEnvelope, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: () => {
      passkeysSelectedCredentialID.set(current.credentialIDHex);
      passkeysMutation.set(idleMutation());
    },
  });
  if (!outcome.ok) return false;
  await loadPasskeys();
  return true;
}

function deleteError(
  credentialIDHex: string,
  failedPhase: MutationFailedPhase,
  previewRequest: CredentialDeleteRequest | null,
  previewEnvelope: CredentialDeleteEnvelope | null,
  responseEnvelope: CredentialDeleteEnvelope | null,
  runtimeError: ReturnType<typeof runtimeFailureFrom> | null,
  failureReason: "response-error" | "runtime-error" | "missing-preview" | "missing-result",
) {
  passkeysMutation.set(failedMutation(deleteMutationBase(credentialIDHex), {
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }));
}

async function previewCredentialDelete(credentialIDHex: string): Promise<boolean> {
  if (!mutationsAvailable("delete") || !findPasskeyCredential(credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope), credentialIDHex)) return false;
  const request: CredentialDeleteRequest = {
    selectionId: currentSelectionID(),
    verificationFlow: get(passkeysVerificationFlow),
    credentialIdHex: credentialIDHex,
    dryRun: true,
  };

  passkeysSelectedCredentialID.set(credentialIDHex);
  passkeysMutation.set(previewingMutation(deleteMutationBase(credentialIDHex), request));
  const label = m.credential_delete_preview();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.deleteCredential(request),
    extract: credentialDeletePreview,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      deleteError(credentialIDHex, "previewing", request, null, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: (_preview, envelope) => passkeysMutation.set(
      reviewedMutation(deleteMutationBase(credentialIDHex), request, envelope),
    ),
  });
  return outcome.ok;
}

export function beginCredentialDelete(credentialIDHex = get(passkeysSelectedCredentialID)) {
  return previewCredentialDelete(credentialIDHex);
}

export async function confirmCredentialDelete(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "delete" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext(current);
  if (!execution) return false;
  const { previewRequest, previewEnvelope } = execution;
  const request: CredentialDeleteRequest = {
    ...previewRequest,
    dryRun: false,
  };
  passkeysMutation.set(executingMutation(
    deleteMutationBase(current.credentialIDHex),
    previewRequest,
    previewEnvelope,
  ));
  const label = m.credential_delete();
  const outcome = await runTypedOperationStage({
    label,
    call: () => api.deleteCredential(request),
    extract: credentialDeleteResult,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      deleteError(current.credentialIDHex, "executing", previewRequest, previewEnvelope, details.responseEnvelope, details.runtimeError, details.failureReason);
    },
    onSuccess: () => {
      passkeysSelectedCredentialID.set("");
      passkeysMutation.set(idleMutation());
    },
  });
  if (!outcome.ok) return false;
  await loadPasskeys();
  return true;
}

export function closePasskeysMutation() {
  passkeysMutation.set(idleMutation());
}
