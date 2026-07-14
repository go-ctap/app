import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import { Code, type Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  AlwaysUVTarget,
  type StatusReport,
} from "../../bindings/github.com/go-ctap/kit/model/config";
import {
  type AlwaysUVRequest,
  type AuthenticatorConfigEnvelope,
  type BioEnrollEnvelope,
  type BioEnrollRequest,
  type BioMutationEnvelope,
  type BioRemoveRequest,
  type BioRenameRequest,
  type MinPINLengthRequest,
  type PINChangeRequest,
  type PINEnvelope,
  type PINSetRequest,
  type ResetFactoryEnvelope,
  type ResetFactoryRequest,
} from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { api, type OperationEnvelope } from "./api.js";
import {
  authenticatorConfigPreview,
  authenticatorConfigResult,
  bioEnrollPreview,
  bioEnrollResult,
  bioListReport,
  bioMutationPreview,
  bioMutationResult,
  bioSensorReport,
  configStatusReport,
  pinMutationResult,
  resetFactoryPreview,
  resetFactoryResult,
} from "./ctapkit-results.js";
import {
  beginSecurityBioListLoad,
  beginSecurityBioSensorLoad,
  beginSecurityStatusLoad,
  completeSecurityBioListLoad,
  completeSecurityBioSensorLoad,
  completeSecurityStatusLoad,
  emptySecurityResourceState,
  failSecurityBioListLoadAtRuntime,
  failSecurityBioListLoadWithContractError,
  failSecurityBioListLoadWithResponse,
  failSecurityBioSensorLoadAtRuntime,
  failSecurityBioSensorLoadWithContractError,
  failSecurityBioSensorLoadWithResponse,
  failSecurityStatusLoadAtRuntime,
  failSecurityStatusLoadWithContractError,
  failSecurityStatusLoadWithResponse,
  securityEnrollments,
  securityMutation,
  securitySensor,
  securityStatus,
  type SecurityMutationState,
  type SecurityMutationValidationError,
  type SecurityPINPolicyDraft,
} from "./features/security/state.js";
import { selectedSelector, sessionStatus } from "./features/session/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { failureForCode, failureMessage, runtimeFailureFrom } from "./failure.js";
import { applyInvalidSessionError, selectedSessionId } from "./session-boundary.js";
import { rediscoverAfterFactoryReset } from "./session-controller.js";
import {
  beginOperation,
  setStatusOutcome,
  summarizeEnvelope,
  summarizeOperationContractFailure,
  summarizeOperationFailure,
} from "./workbench-state.js";

const BIO_ENROLL_TIMEOUT_MILLISECONDS = 60_000;

type PINSetInput = { newPIN: string };
type PINChangeInput = { currentPIN: string; newPIN: string };

type PreviewFailureReason = "response-error" | "runtime-error" | "missing-preview";
type ExecuteFailureReason = "response-error" | "runtime-error" | "missing-result";

function retryAction(action: () => Promise<unknown>) {
  return async () => {
    await action();
  };
}

function missingOperationOutput() {
  return failureForCode(Code.CodeInternalError);
}

function currentStatusReport(): StatusReport | null {
  return configStatusReport(get(securityStatus).lastSuccessfulEnvelope);
}

function sessionIdForMutation(label: string): string | null {
  try {
    return selectedSessionId();
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    summarizeOperationFailure(label, runtimeError);
    applyInvalidSessionError(runtimeError);
    return null;
  }
}

function canAutoLoadSecurity() {
  const session = get(sessionStatus);
  return get(activeScreen) === "security"
    && Boolean(get(selectedSelector).trim() && session.sessionId)
    && session.state === "ready"
    && get(securityStatus).phase === "idle";
}

export async function maybeLoadSecurity() {
  if (!canAutoLoadSecurity()) return false;
  return loadSecurityStatus();
}

export async function loadSecurityStatus(): Promise<boolean> {
  if (!get(selectedSelector).trim()) return false;

  beginSecurityStatusLoad();
  try {
    beginOperation(m.security_status_operation());
    const sessionId = selectedSessionId();
    const envelope = await api.configStatus({ sessionId });
    const report = configStatusReport(envelope);

    if (envelope.error) {
      failSecurityStatusLoadWithResponse(envelope);
    } else if (!report) {
      const missing = missingOperationOutput();
      failSecurityStatusLoadWithContractError(envelope, missing);
      summarizeOperationContractFailure(m.security_status_operation(), missing, retryAction(loadSecurityStatus));
      applyInvalidSessionError(missing);
      return false;
    } else {
      completeSecurityStatusLoad(envelope, new Date().toISOString());
    }

    summarizeEnvelope(m.security_status_operation(), envelope, retryAction(loadSecurityStatus));
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !report) return false;

    if (report.bio.supported) {
      await loadSecurityBioSensor(sessionId);
    } else {
      securitySensor.set(emptySecurityResourceState());
    }
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    failSecurityStatusLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.security_status_operation(), runtimeError, retryAction(loadSecurityStatus));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function loadSecurityBioSensor(sessionId = ""): Promise<boolean> {
  const report = currentStatusReport();
  if (!report?.bio.supported) {
    securitySensor.set(emptySecurityResourceState());
    return false;
  }

  beginSecurityBioSensorLoad();
  try {
    beginOperation(m.security_bio_sensor_operation());
    const envelope = await api.bioSensorInfo({ sessionId: sessionId || selectedSessionId() });
    const sensor = bioSensorReport(envelope);
    if (envelope.error) {
      failSecurityBioSensorLoadWithResponse(envelope);
    } else if (!sensor) {
      const missing = missingOperationOutput();
      failSecurityBioSensorLoadWithContractError(envelope, missing);
      summarizeOperationContractFailure(m.security_bio_sensor_operation(), missing, retryAction(loadSecurityBioSensor));
      applyInvalidSessionError(missing);
      return false;
    } else {
      completeSecurityBioSensorLoad(envelope, new Date().toISOString());
    }

    summarizeEnvelope(m.security_bio_sensor_operation(), envelope, retryAction(loadSecurityBioSensor));
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(sensor);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    failSecurityBioSensorLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.security_bio_sensor_operation(), runtimeError, retryAction(loadSecurityBioSensor));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function loadSecurityEnrollments(): Promise<boolean> {
  const report = currentStatusReport();
  if (!report?.bio.supported) return false;
  if (report.bio.configured === false) {
    securityEnrollments.set(emptySecurityResourceState());
    return true;
  }

  beginSecurityBioListLoad();
  try {
    beginOperation(m.security_bio_list_operation());
    const envelope = await api.bioList({ sessionId: selectedSessionId() });
    const list = bioListReport(envelope);
    if (envelope.error) {
      failSecurityBioListLoadWithResponse(envelope);
    } else if (!list) {
      const missing = missingOperationOutput();
      failSecurityBioListLoadWithContractError(envelope, missing);
      summarizeOperationContractFailure(m.security_bio_list_operation(), missing, retryAction(loadSecurityEnrollments));
      applyInvalidSessionError(missing);
      return false;
    } else {
      completeSecurityBioListLoad(envelope, new Date().toISOString());
    }

    summarizeEnvelope(m.security_bio_list_operation(), envelope, retryAction(loadSecurityEnrollments));
    applyInvalidSessionError(envelope.error);
    return !envelope.error && Boolean(list);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    failSecurityBioListLoadAtRuntime(runtimeError);
    summarizeOperationFailure(m.security_bio_list_operation(), runtimeError, retryAction(loadSecurityEnrollments));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

async function runPINOperation(
  label: string,
  call: () => Promise<PINEnvelope>,
): Promise<boolean> {
  try {
    beginOperation(label);
    const envelope = await call();
    const result = pinMutationResult(envelope);
    if (envelope.error || result) {
      summarizeEnvelope(label, envelope);
    } else {
      summarizeOperationContractFailure(label, missingOperationOutput());
    }
    applyInvalidSessionError(envelope.error);
    if (envelope.error || !result) return false;

    toast.success(m.security_configuration_updated());
    await loadSecurityStatus();
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    summarizeOperationFailure(label, runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function setAuthenticatorPIN(input: PINSetInput): Promise<boolean> {
  if (!input.newPIN) return false;
  const label = m.security_pin_set_operation();
  try {
    const request: PINSetRequest = {
      sessionId: selectedSessionId(),
      newPIN: input.newPIN,
      confirmed: false,
      confirmationMessage: label,
    };
    const operation = api.setPIN(request);
    input.newPIN = "";
    return await runPINOperation(label, () => operation);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    summarizeOperationFailure(label, runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  } finally {
    input.newPIN = "";
  }
}

export async function changeAuthenticatorPIN(input: PINChangeInput): Promise<boolean> {
  if (!input.currentPIN || !input.newPIN) return false;
  const label = m.security_pin_change_operation();
  try {
    const request: PINChangeRequest = {
      sessionId: selectedSessionId(),
      currentPIN: input.currentPIN,
      newPIN: input.newPIN,
      confirmed: false,
      confirmationMessage: label,
    };
    const operation = api.changePIN(request);
    input.currentPIN = "";
    input.newPIN = "";
    return await runPINOperation(label, () => operation);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    summarizeOperationFailure(label, runtimeError);
    applyInvalidSessionError(runtimeError);
    return false;
  } finally {
    input.currentPIN = "";
    input.newPIN = "";
  }
}

function normalizedPINPolicyDraft(draft: SecurityPINPolicyDraft) {
  const seen = new Set<string>();
  const rpIDs = draft.rpIDs
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  return {
    minPINLength: Number(draft.minPINLength.trim()),
    rpIDs,
    forceChangePin: draft.forceChangePin,
    pinComplexityPolicy: draft.pinComplexityPolicy,
  };
}

export function validatePINPolicyDraft(
  draft: SecurityPINPolicyDraft,
  report = currentStatusReport(),
): SecurityMutationValidationError | null {
  if (!draft.minPINLength.trim()) return "min-pin-length-required";
  const normalized = normalizedPINPolicyDraft(draft);
  if (!Number.isInteger(normalized.minPINLength) || normalized.minPINLength <= 0) {
    return "min-pin-length-invalid";
  }
  const current = report?.pin.minPINLength;
  if (current !== null && current !== undefined && normalized.minPINLength < current) {
    return "min-pin-length-decrease";
  }
  const maximum = report?.pin.maxPINLength;
  if (maximum !== null && maximum !== undefined && normalized.minPINLength > maximum) {
    return "min-pin-length-too-large";
  }
  const maxRPIDs = report?.limits.maxRPIDsForSetMinPINLength;
  if (maxRPIDs !== null && maxRPIDs !== undefined && normalized.rpIDs.length > maxRPIDs) {
    return "too-many-rp-ids";
  }
  if (
    current === normalized.minPINLength
    && normalized.rpIDs.length === 0
    && !normalized.forceChangePin
    && !normalized.pinComplexityPolicy
  ) {
    return "no-change";
  }
  return null;
}

function summarizePreviewEnvelope(
  label: string,
  envelope: OperationEnvelope,
  hasPreview: boolean,
  retry: () => Promise<unknown>,
) {
  if (envelope.error || hasPreview) {
    summarizeEnvelope(label, envelope, retryAction(retry));
  } else {
    summarizeOperationContractFailure(label, missingOperationOutput(), retryAction(retry));
  }
  applyInvalidSessionError(envelope.error);
}

function summarizeExecuteEnvelope(
  label: string,
  envelope: OperationEnvelope,
  hasResult: boolean,
  retry: () => Promise<unknown>,
) {
  if (envelope.error || hasResult) {
    summarizeEnvelope(label, envelope, retryAction(retry));
  } else {
    summarizeOperationContractFailure(label, missingOperationOutput(), retryAction(retry));
  }
  applyInvalidSessionError(envelope.error);
}

function friendlyNameTooLong(value: string) {
  const sensor = bioSensorReport(get(securitySensor).lastSuccessfulEnvelope);
  const maximum = sensor?.maxTemplateFriendlyName;
  return maximum !== null
    && maximum !== undefined
    && new TextEncoder().encode(value).byteLength > maximum;
}

function responseFailureReason(error: { error?: unknown }, missing: "preview" | "result"):
  | PreviewFailureReason
  | ExecuteFailureReason {
  return error.error ? "response-error" : missing === "preview" ? "missing-preview" : "missing-result";
}

export async function beginAlwaysUVChange(target: AlwaysUVTarget): Promise<boolean> {
  const report = currentStatusReport();
  const current = report?.authenticatorConfig.alwaysUv.configured;
  if (
    !report?.authenticatorConfig.supported
    || !report.authenticatorConfig.alwaysUv.supported
    || current === null
    || current === undefined
  ) return false;
  if ((target === AlwaysUVTarget.AlwaysUVTargetEnable) === current) {
    securityMutation.set({ kind: "alwaysUv", phase: "editing", target, validationError: "no-change" });
    return false;
  }

  const label = m.security_always_uv_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: AlwaysUVRequest = { sessionId, target, dryRun: true };
  securityMutation.set({ kind: "alwaysUv", phase: "previewing", target, previewRequest: request });
  try {
    beginOperation(label);
    const envelope = await api.setAlwaysUV(request);
    const preview = authenticatorConfigPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "alwaysUv",
        phase: "error",
        target,
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({ kind: "alwaysUv", phase: "review", target, previewRequest: request, previewEnvelope: envelope });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      () => beginAlwaysUVChange(target),
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "alwaysUv",
      phase: "error",
      target,
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(() => beginAlwaysUVChange(target)),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function beginPINPolicyChange(draft: SecurityPINPolicyDraft): Promise<boolean> {
  const validationError = validatePINPolicyDraft(draft);
  if (validationError) {
    securityMutation.set({ kind: "pinPolicy", phase: "editing", draft, validationError });
    return false;
  }

  const normalized = normalizedPINPolicyDraft(draft);
  const label = m.security_pin_policy_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: MinPINLengthRequest = {
    sessionId,
    newMinPINLength: normalized.minPINLength,
    minPinLengthRPIDs: normalized.rpIDs,
    forceChangePin: normalized.forceChangePin,
    pinComplexityPolicy: normalized.pinComplexityPolicy,
    dryRun: true,
  };
  securityMutation.set({ kind: "pinPolicy", phase: "previewing", draft, previewRequest: request });
  try {
    beginOperation(label);
    const envelope = await api.setMinPINLength(request);
    const preview = authenticatorConfigPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "pinPolicy",
        phase: "error",
        draft,
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({ kind: "pinPolicy", phase: "review", draft, previewRequest: request, previewEnvelope: envelope });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      () => beginPINPolicyChange(draft),
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "pinPolicy",
      phase: "error",
      draft,
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(() => beginPINPolicyChange(draft)),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function beginBioEnrollment(): Promise<boolean> {
  if (!currentStatusReport()?.bio.supported) return false;
  const label = m.security_bio_enroll_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: BioEnrollRequest = {
    sessionId,
    timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
    dryRun: true,
  };
  securityMutation.set({
    kind: "bioEnroll",
    phase: "previewing",
    timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
    previewRequest: request,
  });
  try {
    beginOperation(label);
    const envelope = await api.bioEnroll(request);
    const preview = bioEnrollPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "bioEnroll",
        phase: "error",
        timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({
        kind: "bioEnroll",
        phase: "review",
        timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
        previewRequest: request,
        previewEnvelope: envelope,
      });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      beginBioEnrollment,
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "bioEnroll",
      phase: "error",
      timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(beginBioEnrollment),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function beginBioRename(templateIDHex: string, friendlyName: string): Promise<boolean> {
  if (friendlyNameTooLong(friendlyName)) {
    securityMutation.set({
      kind: "bioRename",
      phase: "editing",
      templateIDHex,
      friendlyName,
      validationError: "friendly-name-too-long",
    });
    return false;
  }
  const label = m.security_bio_rename_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: BioRenameRequest = {
    sessionId,
    templateIdHex: templateIDHex,
    friendlyName,
    dryRun: true,
  };
  securityMutation.set({ kind: "bioRename", phase: "previewing", templateIDHex, friendlyName, previewRequest: request });
  try {
    beginOperation(label);
    const envelope = await api.bioRename(request);
    const preview = bioMutationPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "bioRename",
        phase: "error",
        templateIDHex,
        friendlyName,
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({ kind: "bioRename", phase: "review", templateIDHex, friendlyName, previewRequest: request, previewEnvelope: envelope });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      () => beginBioRename(templateIDHex, friendlyName),
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "bioRename",
      phase: "error",
      templateIDHex,
      friendlyName,
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(() => beginBioRename(templateIDHex, friendlyName)),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function beginBioRemove(templateIDHex: string): Promise<boolean> {
  const label = m.security_bio_remove_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: BioRemoveRequest = { sessionId, templateIdHex: templateIDHex, dryRun: true };
  securityMutation.set({ kind: "bioRemove", phase: "previewing", templateIDHex, previewRequest: request });
  try {
    beginOperation(label);
    const envelope = await api.bioRemove(request);
    const preview = bioMutationPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "bioRemove",
        phase: "error",
        templateIDHex,
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({ kind: "bioRemove", phase: "review", templateIDHex, previewRequest: request, previewEnvelope: envelope });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      () => beginBioRemove(templateIDHex),
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "bioRemove",
      phase: "error",
      templateIDHex,
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(() => beginBioRemove(templateIDHex)),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function beginFactoryReset(): Promise<boolean> {
  const label = m.security_reset_preview_operation();
  const sessionId = sessionIdForMutation(label);
  if (!sessionId) return false;
  const request: ResetFactoryRequest = { sessionId, dryRun: true };
  securityMutation.set({ kind: "reset", phase: "previewing", previewRequest: request });
  try {
    beginOperation(label);
    const envelope = await api.resetFactory(request);
    const preview = resetFactoryPreview(envelope);
    if (envelope.error || !preview) {
      securityMutation.set({
        kind: "reset",
        phase: "error",
        failedPhase: "previewing",
        previewRequest: request,
        previewEnvelope: null,
        responseEnvelope: envelope,
        runtimeError: null,
        failureReason: responseFailureReason(envelope, "preview") as PreviewFailureReason,
        validationError: null,
      });
    } else {
      securityMutation.set({ kind: "reset", phase: "review", previewRequest: request, previewEnvelope: envelope });
    }
    summarizePreviewEnvelope(
      label,
      envelope,
      Boolean(preview),
      beginFactoryReset,
    );
    return !envelope.error && Boolean(preview);
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set({
      kind: "reset",
      phase: "error",
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError,
      failureReason: "runtime-error",
      validationError: null,
    });
    summarizeOperationFailure(
      label,
      runtimeError,
      retryAction(beginFactoryReset),
    );
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

type ReviewMutation = Extract<SecurityMutationState, { phase: "review" }>;
type NonIdleSecurityMutation = Exclude<SecurityMutationState, { kind: "idle" }>;

function restartSecurityMutation(current: NonIdleSecurityMutation): Promise<boolean> {
  switch (current.kind) {
    case "alwaysUv": return beginAlwaysUVChange(current.target);
    case "pinPolicy": return beginPINPolicyChange(current.draft);
    case "bioEnroll": return beginBioEnrollment();
    case "bioRename": return beginBioRename(current.templateIDHex, current.friendlyName);
    case "bioRemove": return beginBioRemove(current.templateIDHex);
    case "reset": return beginFactoryReset();
  }
}

function executeRequest<T extends { dryRun?: boolean; confirmed?: boolean; confirmationMessage?: string }>(
  request: T,
  confirmationMessage: string,
): T {
  return { ...request, dryRun: false, confirmed: true, confirmationMessage };
}

async function finishSuccessfulSecurityMutation(kind: ReviewMutation["kind"]) {
  securityMutation.set({ kind: "idle", phase: "idle" });
  switch (kind) {
    case "alwaysUv":
    case "pinPolicy":
      toast.success(m.security_configuration_updated());
      await loadSecurityStatus();
      return;
    case "bioEnroll":
      toast.success(m.security_configuration_updated());
      await loadSecurityStatus();
      await loadSecurityEnrollments();
      return;
    case "bioRename":
      toast.success(m.security_configuration_updated());
      await loadSecurityStatus();
      await loadSecurityEnrollments();
      return;
    case "bioRemove":
      toast.success(m.security_configuration_updated());
      await loadSecurityStatus();
      await loadSecurityEnrollments();
      return;
    case "reset": {
      toast.success(m.security_reset_complete());
      const rediscoveryError = await rediscoverAfterFactoryReset();
      await maybeLoadSecurity();
      if (rediscoveryError) {
        setStatusOutcome({
          tone: "warning",
          title: m.security_reset_rediscovery_failed(),
          message: failureMessage(rediscoveryError),
        });
        toast.warning(m.security_reset_rediscovery_failed(), { description: failureMessage(rediscoveryError) });
      }
    }
  }
}

function operationLabel(kind: ReviewMutation["kind"], preview = false) {
  switch (kind) {
    case "alwaysUv": return preview ? m.security_always_uv_preview_operation() : m.security_always_uv_operation();
    case "pinPolicy": return preview ? m.security_pin_policy_preview_operation() : m.security_pin_policy_operation();
    case "bioEnroll": return preview ? m.security_bio_enroll_preview_operation() : m.security_bio_enroll_operation();
    case "bioRename": return preview ? m.security_bio_rename_preview_operation() : m.security_bio_rename_operation();
    case "bioRemove": return preview ? m.security_bio_remove_preview_operation() : m.security_bio_remove_operation();
    case "reset": return preview ? m.security_reset_preview_operation() : m.security_reset_operation();
  }
}

function operationResultFor(kind: ReviewMutation["kind"], envelope: OperationEnvelope) {
  switch (kind) {
    case "alwaysUv":
    case "pinPolicy": return authenticatorConfigResult(envelope);
    case "bioEnroll": return envelope.error ? null : bioEnrollResult(envelope);
    case "bioRename":
    case "bioRemove": return bioMutationResult(envelope);
    case "reset": return resetFactoryResult(envelope);
  }
}

function executingMutation(current: ReviewMutation): SecurityMutationState {
  return { ...current, phase: "executing" } as SecurityMutationState;
}

function failedExecutingMutation(
  current: ReviewMutation,
  responseEnvelope: AuthenticatorConfigEnvelope | BioEnrollEnvelope | BioMutationEnvelope | ResetFactoryEnvelope | null,
  runtimeError: Failure | null,
  failureReason: ExecuteFailureReason,
): SecurityMutationState {
  return {
    ...current,
    phase: "error",
    failedPhase: "executing",
    responseEnvelope,
    runtimeError,
    failureReason,
    validationError: null,
  } as SecurityMutationState;
}

export async function confirmSecurityMutation(): Promise<boolean> {
  const current = get(securityMutation);
  if (current.phase !== "review") return false;
  const label = operationLabel(current.kind);
  securityMutation.set(executingMutation(current));

  try {
    beginOperation(label);
    let envelope: AuthenticatorConfigEnvelope | BioEnrollEnvelope | BioMutationEnvelope | ResetFactoryEnvelope;
    switch (current.kind) {
      case "alwaysUv":
        envelope = await api.setAlwaysUV(executeRequest(current.previewRequest, label));
        break;
      case "pinPolicy":
        envelope = await api.setMinPINLength(executeRequest(current.previewRequest, label));
        break;
      case "bioEnroll":
        envelope = await api.bioEnroll(executeRequest(current.previewRequest, label));
        break;
      case "bioRename":
        envelope = await api.bioRename(executeRequest(current.previewRequest, label));
        break;
      case "bioRemove":
        envelope = await api.bioRemove(executeRequest(current.previewRequest, label));
        break;
      case "reset":
        envelope = await api.resetFactory(executeRequest(current.previewRequest, label));
        break;
    }

    const result = operationResultFor(current.kind, envelope);
    if (envelope.error || !result) {
      securityMutation.set(failedExecutingMutation(
        current,
        envelope,
        null,
        responseFailureReason(envelope, "result") as ExecuteFailureReason,
      ));
    }
    summarizeExecuteEnvelope(label, envelope, Boolean(result), () => restartSecurityMutation(current));
    if (envelope.error || !result) return false;

    await finishSuccessfulSecurityMutation(current.kind);
    return true;
  } catch (error) {
    const runtimeError = runtimeFailureFrom(error);
    securityMutation.set(failedExecutingMutation(current, null, runtimeError, "runtime-error"));
    summarizeOperationFailure(label, runtimeError, retryAction(() => restartSecurityMutation(current)));
    applyInvalidSessionError(runtimeError);
    return false;
  }
}

export async function retrySecurityMutation(): Promise<boolean> {
  const current = get(securityMutation);
  if (current.phase !== "error") return false;
  return restartSecurityMutation(current);
}

export function closeSecurityMutation() {
  const current = get(securityMutation);
  if (current.phase === "previewing" || current.phase === "executing") return false;
  securityMutation.set({ kind: "idle", phase: "idle" });
  return true;
}

export type { SecurityPINPolicyDraft } from "./features/security/state.js";
export { AlwaysUVTarget };
