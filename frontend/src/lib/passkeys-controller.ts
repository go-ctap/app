import { get } from "svelte/store";

import { ErrorCategory, VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import type {
  CredentialDeleteEnvelope,
  CredentialDeleteRequest,
  CredentialListRequest,
  CredentialUpdateEnvelope,
  CredentialUpdateRequest,
} from "../../bindings/github.com/go-ctap/kit/service";
import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
import {
  credentialDeletePreview,
  credentialDeleteResult,
  credentialsReport,
  credentialUpdatePreview,
  credentialUpdateResult,
} from "./ctapkit-results.js";
import {
  beginPasskeysInventoryLoad,
  completePasskeysInventoryLoad,
  failPasskeysInventoryLoadAtRuntime,
  failPasskeysInventoryLoadWithResponse,
  passkeysInventoryState,
  passkeysInventoryIsStale,
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
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { canRetryPasskeysMutation, findPasskeyCredential } from "./passkeys-presentation.js";
import { runtimeErrorFrom } from "./runtime-error.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { beginOperation, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

export type LoadPasskeysOptions = { refresh?: boolean };

function retryAction(action: () => Promise<unknown>) {
  return async () => {
    await action();
  };
}

function missingOperationOutput(kind: "preview" | "result") {
  return {
    category: ErrorCategory.ErrorInvalidState,
    message: kind === "preview" ? m.operation_missing_preview() : m.operation_missing_result(),
  };
}

function passkeysAutoLoadKey() {
  const selector = get(selectedSelector).trim();
  const sessionId = get(sessionStatus).sessionId || "";
  return selector && sessionId ? `${selector}:${sessionId}` : "";
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
  passkeysMutation.set({ kind: "idle", phase: "idle" });
}

export async function maybeLoadPasskeys() {
  if (!shouldAutoLoadPasskeys()) return;
  await loadPasskeys();
}

export async function loadPasskeys(options: LoadPasskeysOptions = {}) {
  const selector = get(selectedSelector).trim();
  if (!selector) {
    resetPasskeysDeviceState();
    return false;
  }

  const refresh = Boolean(options.refresh);
  beginPasskeysInventoryLoad();
  try {
    beginOperation(m.credential_inventory());
    const request: CredentialListRequest = {
      sessionId: selectedSessionId(),
      verificationFlow: get(passkeysVerificationFlow),
      refresh,
    };
    const envelope = await api.listCredentials(request);
    const report = credentialsReport(envelope);
    if (envelope.error || !report) {
      failPasskeysInventoryLoadWithResponse(envelope);
    } else {
      completePasskeysInventoryLoad(envelope, new Date().toISOString());
      reconcileSelectedCredential();
    }
    if (envelope.error || report) {
      summarizeEnvelope(m.credential_inventory(), envelope, retryAction(() => loadPasskeys({ refresh })));
    } else {
      summarizeOperationFailure(m.credential_inventory(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(report);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    failPasskeysInventoryLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.credential_inventory(), runtimeError, retryAction(() => loadPasskeys({ refresh })));
    applyInvalidSessionError(runtimeError);
    return false;
  }
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
  if (passkeysInventoryIsStale(inventory) || inventory.phase === "loading" || inventory.phase === "refreshing") return false;
  const session = get(sessionStatus);
  if (session.state !== "ready" || !session.sessionId) return false;
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

export function beginCredentialUpdate(credentialIDHex = get(passkeysSelectedCredentialID)) {
  if (!mutationsAvailable("update")) return false;
  const original = updateFormFor(credentialIDHex);
  if (!original) return false;
  passkeysSelectedCredentialID.set(credentialIDHex);
  passkeysMutation.set({
    kind: "update",
    phase: "editing",
    credentialIDHex,
    original,
    form: { ...original },
    validationError: null,
  });
  return true;
}

export function updateCredentialDraft(patch: Partial<CredentialUpdateForm>) {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || current.phase === "previewing" || current.phase === "executing") return false;
  passkeysMutation.set({
    kind: "update",
    phase: "editing",
    credentialIDHex: current.credentialIDHex,
    original: current.original,
    form: { ...current.form, ...patch },
    validationError: null,
  });
  return true;
}

export function editCredentialUpdate() {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || (current.phase !== "review" && current.phase !== "error")) return false;
  passkeysMutation.set({
    kind: "update",
    phase: "editing",
    credentialIDHex: current.credentialIDHex,
    original: current.original,
    form: current.form,
    validationError: null,
  });
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
  sessionId: string,
  verificationFlow: VerificationFlow,
  credentialIDHex: string,
  original: CredentialUpdateForm,
  form: CredentialUpdateForm,
): CredentialUpdateRequest {
  const current = normalizeCredentialUpdateForm(original);
  const proposed = normalizeCredentialUpdateForm(form);
  const userIDChanged = proposed.userIDHex !== current.userIDHex;
  const nameChanged = proposed.name !== current.name;
  const displayNameChanged = proposed.displayName !== current.displayName;
  return {
    sessionId,
    verificationFlow,
    credentialIdHex: credentialIDHex,
    ...(userIDChanged ? { userIdHex: proposed.userIDHex, userIdProvided: true } : {}),
    ...(nameChanged ? { name: proposed.name, nameProvided: true } : {}),
    ...(displayNameChanged ? { displayName: proposed.displayName, displayProvided: true } : {}),
    dryRun: true,
  };
}

function updateError(
  current: Extract<PasskeysMutationState, { kind: "update" }>,
  failedPhase: "previewing" | "executing",
  previewRequest: CredentialUpdateRequest | null,
  previewEnvelope: CredentialUpdateEnvelope | null,
  responseEnvelope: CredentialUpdateEnvelope | null,
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
  failureReason: "response-error" | "runtime-error" | "missing-preview" | "missing-result",
) {
  passkeysMutation.set({
    kind: "update",
    phase: "error",
    credentialIDHex: current.credentialIDHex,
    original: current.original,
    form: current.form,
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
    validationError: null,
  });
}

export async function previewCredentialUpdate(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || (current.phase !== "editing" && current.phase !== "error")) return false;
  if (!mutationsAvailable("update")) return false;
  const validationError = validateCredentialUpdate(current.original, current.form);
  if (validationError) {
    passkeysMutation.set({
      kind: "update",
      phase: "editing",
      credentialIDHex: current.credentialIDHex,
      original: current.original,
      form: current.form,
      validationError,
    });
    return false;
  }

  let request: CredentialUpdateRequest;
  try {
    request = buildCredentialUpdatePreviewRequest(
      selectedSessionId(),
      get(passkeysVerificationFlow),
      current.credentialIDHex,
      current.original,
      current.form,
    );
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    updateError(current, "previewing", null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_update_preview(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

  passkeysMutation.set({ ...current, phase: "previewing", previewRequest: request });
  try {
    beginOperation(m.credential_update_preview());
    const envelope = await api.updateCredentialUser(request);
    const preview = credentialUpdatePreview(envelope);
    if (envelope.error) {
      updateError(current, "previewing", request, null, envelope, null, "response-error");
    } else if (!preview) {
      updateError(current, "previewing", request, null, envelope, null, "missing-preview");
    } else {
      passkeysMutation.set({ ...current, phase: "review", previewRequest: request, previewEnvelope: envelope });
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.credential_update_preview(), envelope, retryAction(previewCredentialUpdate));
    } else {
      summarizeOperationFailure(m.credential_update_preview(), missingOperationOutput("preview"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    updateError(current, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_update_preview(), runtimeError, retryAction(previewCredentialUpdate));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function confirmCredentialUpdate(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "update" || current.phase !== "review") return false;
  const request: CredentialUpdateRequest = {
    ...current.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_update(),
  };
  passkeysMutation.set({ ...current, phase: "executing" });
  try {
    beginOperation(m.credential_update());
    const envelope = await api.updateCredentialUser(request);
    const result = credentialUpdateResult(envelope);
    if (envelope.error) {
      updateError(current, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      updateError(current, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "missing-result");
    } else {
      passkeysSelectedCredentialID.set(current.credentialIDHex);
      passkeysMutation.set({ kind: "idle", phase: "idle" });
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.credential_update(), envelope, retryAction(retryPasskeysMutation));
    } else {
      summarizeOperationFailure(m.credential_update(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;
    await loadPasskeys({ refresh: true });
    return true;
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    updateError(current, "executing", current.previewRequest, current.previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_update(), runtimeError, retryAction(retryPasskeysMutation));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

function deleteError(
  credentialIDHex: string,
  failedPhase: "previewing" | "executing",
  previewRequest: CredentialDeleteRequest | null,
  previewEnvelope: CredentialDeleteEnvelope | null,
  responseEnvelope: CredentialDeleteEnvelope | null,
  runtimeError: ReturnType<typeof runtimeErrorFrom> | null,
  failureReason: "response-error" | "runtime-error" | "missing-preview" | "missing-result",
) {
  passkeysMutation.set({
    kind: "delete",
    phase: "error",
    credentialIDHex,
    failedPhase,
    previewRequest,
    previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  });
}

async function previewCredentialDelete(credentialIDHex: string): Promise<boolean> {
  if (!mutationsAvailable("delete") || !findPasskeyCredential(credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope), credentialIDHex)) return false;
  let request: CredentialDeleteRequest;
  try {
    request = {
      sessionId: selectedSessionId(),
      verificationFlow: get(passkeysVerificationFlow),
      credentialIdHex: credentialIDHex,
      dryRun: true,
    };
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(credentialIDHex, "previewing", null, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_delete_preview(), runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }

  passkeysSelectedCredentialID.set(credentialIDHex);
  passkeysMutation.set({ kind: "delete", phase: "previewing", credentialIDHex, previewRequest: request });
  try {
    beginOperation(m.credential_delete_preview());
    const envelope = await api.deleteCredential(request);
    const preview = credentialDeletePreview(envelope);
    if (envelope.error) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "response-error");
    } else if (!preview) {
      deleteError(credentialIDHex, "previewing", request, null, envelope, null, "missing-preview");
    } else {
      passkeysMutation.set({ kind: "delete", phase: "review", credentialIDHex, previewRequest: request, previewEnvelope: envelope });
    }
    if (envelope.error || preview) {
      summarizeEnvelope(m.credential_delete_preview(), envelope, retryAction(() => previewCredentialDelete(credentialIDHex)));
    } else {
      summarizeOperationFailure(m.credential_delete_preview(), missingOperationOutput("preview"));
    }
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(credentialIDHex, "previewing", request, null, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_delete_preview(), runtimeError, retryAction(() => previewCredentialDelete(credentialIDHex)));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export function beginCredentialDelete(credentialIDHex = get(passkeysSelectedCredentialID)) {
  return previewCredentialDelete(credentialIDHex);
}

export async function confirmCredentialDelete(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (current.kind !== "delete" || current.phase !== "review") return false;
  const request: CredentialDeleteRequest = {
    ...current.previewRequest,
    dryRun: false,
    confirmed: true,
    confirmationMessage: m.confirm_delete(),
  };
  passkeysMutation.set({ ...current, phase: "executing" });
  try {
    beginOperation(m.credential_delete());
    const envelope = await api.deleteCredential(request);
    const result = credentialDeleteResult(envelope);
    if (envelope.error) {
      deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "response-error");
    } else if (!result) {
      deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, envelope, null, "missing-result");
    } else {
      passkeysSelectedCredentialID.set("");
      passkeysMutation.set({ kind: "idle", phase: "idle" });
    }
    if (envelope.error || result) {
      summarizeEnvelope(m.credential_delete(), envelope, retryAction(retryPasskeysMutation));
    } else {
      summarizeOperationFailure(m.credential_delete(), missingOperationOutput("result"));
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;
    await loadPasskeys({ refresh: true });
    return true;
  } catch (error) {
    const runtimeError = runtimeErrorFrom(error);
    deleteError(current.credentialIDHex, "executing", current.previewRequest, current.previewEnvelope, null, runtimeError, "runtime-error");
    summarizeOperationFailure(m.credential_delete(), runtimeError, retryAction(retryPasskeysMutation));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function retryPasskeysMutation(): Promise<boolean> {
  const current = get(passkeysMutation);
  if (!canRetryPasskeysMutation(current, get(sessionStatus)) || current.phase !== "error") return false;

  if (current.failedPhase === "previewing") {
    return current.kind === "update"
      ? previewCredentialUpdate()
      : previewCredentialDelete(current.credentialIDHex);
  }
  if (!current.previewRequest || !current.previewEnvelope) return false;

  if (current.kind === "update") {
    passkeysMutation.set({
      kind: "update",
      phase: "executing",
      credentialIDHex: current.credentialIDHex,
      original: current.original,
      form: current.form,
      previewRequest: current.previewRequest,
      previewEnvelope: current.previewEnvelope,
    });
  } else {
    passkeysMutation.set({
      kind: "delete",
      phase: "executing",
      credentialIDHex: current.credentialIDHex,
      previewRequest: current.previewRequest,
      previewEnvelope: current.previewEnvelope,
    });
  }
  const refreshed = await loadPasskeys({ refresh: true });
  if (!refreshed) {
    passkeysMutation.set(current);
    return false;
  }

  const report = credentialsReport(get(passkeysInventoryState).lastSuccessfulEnvelope);
  if (!findPasskeyCredential(report, current.credentialIDHex)) {
    passkeysMutation.set(current);
    return false;
  }

  if (current.kind === "update") {
    passkeysSelectedCredentialID.set(current.credentialIDHex);
    passkeysMutation.set({
      kind: "update",
      phase: "editing",
      credentialIDHex: current.credentialIDHex,
      original: current.original,
      form: current.form,
      validationError: null,
    });
    const previewed = await previewCredentialUpdate();
    if (!previewed && get(passkeysMutation).phase === "editing") passkeysMutation.set(current);
    return previewed;
  }

  const previewed = await previewCredentialDelete(current.credentialIDHex);
  if (!previewed && get(passkeysMutation).phase === "executing") passkeysMutation.set(current);
  return previewed;
}

export function closePasskeysMutation() {
  const current = get(passkeysMutation);
  if (current.phase === "previewing" || current.phase === "executing") return false;
  passkeysMutation.set({ kind: "idle", phase: "idle" });
  return true;
}
