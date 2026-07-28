import { get } from "svelte/store";
import { toast } from "svelte-sonner";

import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
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
  type EnableLongTouchForResetRequest,
  type MinPINLengthRequest,
  type PINChangeRequest,
  type PINEnvelope,
  type PINSetRequest,
  type ResetFactoryEnvelope,
  type ResetFactoryRequest,
} from "../../bindings/telesma/service";

import { m } from "../paraglide/messages.js";
import { api } from "./api.js";
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
import { selectedSelector, authenticatorStatus } from "./features/authenticator/state.js";
import { activeScreen } from "./features/workbench/state.js";
import { failureMessage, internalFailure } from "./failure.js";
import { invalidateOverviewCache } from "./overview-controller.js";
import { currentSelectionID } from "./authenticator-boundary.js";
import { rediscoverAfterFactoryReset } from "./authenticator-controller.js";
import {
  editingMutation,
  executingMutation,
  failedEditableMutation,
  idleMutation,
  mutationExecutionContext,
  previewingMutation,
  reviewedMutation,
} from "./mutation-lifecycle.js";
import {
  completeOperation,
  operationStageFailureDetails,
  requestForCurrentSelection,
  runOperation,
  runTypedOperationStage,
} from "./operation-lifecycle.js";
import {
  setStatusOutcome,
} from "./workbench-state.js";

const BIO_ENROLL_TIMEOUT_MILLISECONDS = 60_000;

type PINSetInput = { newPIN: string };
type PINChangeInput = { currentPIN: string; newPIN: string };

type PreviewFailureReason = "response-error" | "runtime-error" | "missing-preview";
type ExecuteFailureReason = "response-error" | "runtime-error" | "missing-result";
type NonIdleSecurityMutation = Exclude<SecurityMutationState, { kind: "idle" }>;
type PreviewingSecurityMutation = Extract<SecurityMutationState, { phase: "previewing" }>;
type ExecutableSecurityMutation =
  | Extract<SecurityMutationState, { phase: "review" }>
  | Extract<SecurityMutationState, { phase: "error" }>;
type SecurityOperationEnvelope =
  | AuthenticatorConfigEnvelope
  | BioEnrollEnvelope
  | BioMutationEnvelope
  | ResetFactoryEnvelope;
type SecurityOperationRequest =
  | AlwaysUVRequest
  | MinPINLengthRequest
  | EnableLongTouchForResetRequest
  | BioEnrollRequest
  | BioRenameRequest
  | BioRemoveRequest
  | ResetFactoryRequest;
type SecurityExecutionContext = {
  previewRequest: SecurityOperationRequest;
  previewEnvelope: SecurityOperationEnvelope;
};

function securityMutationBase(current: NonIdleSecurityMutation) {
  switch (current.kind) {
    case "alwaysUv": return { kind: "alwaysUv" as const, target: current.target };
    case "pinPolicy": return { kind: "pinPolicy" as const, draft: current.draft };
    case "longTouch": return { kind: "longTouch" as const };
    case "bioEnroll": return {
      kind: "bioEnroll" as const,
      timeoutMilliseconds: current.timeoutMilliseconds,
    };
    case "bioRename": return {
      kind: "bioRename" as const,
      templateIDHex: current.templateIDHex,
      friendlyName: current.friendlyName,
    };
    case "bioRemove": return {
      kind: "bioRemove" as const,
      templateIDHex: current.templateIDHex,
    };
    case "reset": return { kind: "reset" as const };
  }
}

function failedPreviewingMutation(
  current: PreviewingSecurityMutation,
  responseEnvelope: SecurityOperationEnvelope | null,
  runtimeError: Failure | null,
  failureReason: PreviewFailureReason,
): SecurityMutationState {
  return failedEditableMutation(securityMutationBase(current), {
    failedPhase: "previewing",
    previewRequest: current.previewRequest,
    previewEnvelope: null,
    responseEnvelope,
    runtimeError,
    failureReason,
  }) as SecurityMutationState;
}

function reviewedSecurityMutation(
  current: PreviewingSecurityMutation,
  previewEnvelope: SecurityOperationEnvelope,
): SecurityMutationState {
  return reviewedMutation(
    securityMutationBase(current),
    current.previewRequest,
    previewEnvelope,
  ) as SecurityMutationState;
}

async function runSecurityPreviewStage<
  E extends SecurityOperationEnvelope,
  TValue,
>({
  label,
  current,
  call,
  extract,
}: {
  label: string;
  current: PreviewingSecurityMutation;
  call: () => Promise<E>;
  extract: (envelope: E) => TValue | null;
}): Promise<boolean> {
  const outcome = await runTypedOperationStage({
    label,
    call: () => {
      requestForCurrentSelection(current.previewRequest);
      return call();
    },
    extract,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-preview");
      securityMutation.set(failedPreviewingMutation(
        current,
        details.responseEnvelope,
        details.runtimeError,
        details.failureReason,
      ));
    },
    onSuccess: (_preview, envelope) => securityMutation.set(
      reviewedSecurityMutation(current, envelope),
    ),
  });
  return outcome.ok;
}

function currentStatusReport(): StatusReport | null {
  return configStatusReport(get(securityStatus).lastSuccessfulEnvelope);
}

function selectionIdForMutation(): string | null {
  return get(authenticatorStatus).selectionId ?? null;
}

function canAutoLoadSecurity() {
  const authenticator = get(authenticatorStatus);
  return get(activeScreen) === "security"
    && Boolean(get(selectedSelector).trim() && authenticator.selectionId)
    && authenticator.state === "ready"
    && get(securityStatus).phase === "idle";
}

export async function maybeLoadSecurity() {
  if (!canAutoLoadSecurity()) return false;
  return loadSecurityStatus();
}

export async function loadSecurityStatus(): Promise<boolean> {
  if (!get(selectedSelector).trim()) return false;

  beginSecurityStatusLoad();
  const label = m.security_status_operation();
  const attempt = await runOperation({
    label,
    call: () => api.configStatus({ selectionId: currentSelectionID() }),
    onRuntimeFailure: failSecurityStatusLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const report = configStatusReport(envelope);
  if (envelope.error) {
    failSecurityStatusLoadWithResponse(envelope);
  } else if (!report) {
    failSecurityStatusLoadWithContractError(envelope, internalFailure());
  } else {
    completeSecurityStatusLoad(envelope);
  }
  completeOperation(label, envelope, { contractValid: Boolean(report) });
  if (envelope.error || !report) return false;

  if (report.bio.supported) {
    await loadSecurityBioSensor();
  } else {
    securitySensor.set(emptySecurityResourceState());
  }
  return true;
}

export async function loadSecurityBioSensor(): Promise<boolean> {
  const report = currentStatusReport();
  if (!report?.bio.supported) {
    securitySensor.set(emptySecurityResourceState());
    return false;
  }

  beginSecurityBioSensorLoad();
  const label = m.security_bio_sensor_operation();
  const attempt = await runOperation({
    label,
    call: () => api.bioSensorInfo({ selectionId: currentSelectionID() }),
    onRuntimeFailure: failSecurityBioSensorLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const sensor = bioSensorReport(envelope);
  if (envelope.error) {
    failSecurityBioSensorLoadWithResponse(envelope);
  } else if (!sensor) {
    failSecurityBioSensorLoadWithContractError(envelope, internalFailure());
  } else {
    completeSecurityBioSensorLoad(envelope);
  }
  completeOperation(label, envelope, { contractValid: Boolean(sensor) });
  return !envelope.error && Boolean(sensor);
}

export async function loadSecurityEnrollments(): Promise<boolean> {
  const report = currentStatusReport();
  if (!report?.bio.supported) return false;
  if (report.bio.configured === false) {
    securityEnrollments.set(emptySecurityResourceState());
    return true;
  }

  beginSecurityBioListLoad();
  const label = m.security_bio_list_operation();
  const attempt = await runOperation({
    label,
    call: () => api.bioList({ selectionId: currentSelectionID() }),
    onRuntimeFailure: failSecurityBioListLoadAtRuntime,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const list = bioListReport(envelope);
  if (envelope.error) {
    failSecurityBioListLoadWithResponse(envelope);
  } else if (!list) {
    failSecurityBioListLoadWithContractError(envelope, internalFailure());
  } else {
    completeSecurityBioListLoad(envelope);
  }
  completeOperation(label, envelope, { contractValid: Boolean(list) });
  return !envelope.error && Boolean(list);
}

async function runPINOperation(
  label: string,
  call: () => Promise<PINEnvelope>,
): Promise<boolean> {
  const attempt = await runOperation({
    label,
    call,
    cardPresenceRecovery: false,
  });
  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  const result = pinMutationResult(envelope);
  completeOperation(label, envelope, { contractValid: Boolean(result) });
  if (envelope.error || !result) return false;

  toast.success(m.security_configuration_updated());
  await refreshSecurityAfterConfigurationChange();
  return true;
}

async function refreshSecurityAfterConfigurationChange() {
  invalidateOverviewCache();
  await loadSecurityStatus();
}

export async function setAuthenticatorPIN(input: PINSetInput): Promise<boolean> {
  if (!input.newPIN) return false;
  const label = m.security_pin_set_operation();
  try {
    return await runPINOperation(label, () => {
      const request: PINSetRequest = {
        selectionId: currentSelectionID(),
        newPIN: input.newPIN,
      };
      try {
        return api.setPIN(request);
      } finally {
        request.newPIN = "";
        input.newPIN = "";
      }
    });
  } finally {
    input.newPIN = "";
  }
}

export async function changeAuthenticatorPIN(input: PINChangeInput): Promise<boolean> {
  if (!input.currentPIN || !input.newPIN) return false;
  const label = m.security_pin_change_operation();
  try {
    return await runPINOperation(label, () => {
      const request: PINChangeRequest = {
        selectionId: currentSelectionID(),
        currentPIN: input.currentPIN,
        newPIN: input.newPIN,
      };
      try {
        return api.changePIN(request);
      } finally {
        request.currentPIN = "";
        request.newPIN = "";
        input.currentPIN = "";
        input.newPIN = "";
      }
    });
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
    minPINLength: draft.minPINLength.trim() ? Number(draft.minPINLength.trim()) : null,
    rpIDs,
    forceChangePin: draft.forceChangePin,
    pinComplexityPolicy: draft.pinComplexityPolicy,
  };
}

export function validatePINPolicyDraft(
  draft: SecurityPINPolicyDraft,
  report = currentStatusReport(),
): SecurityMutationValidationError | null {
  const normalized = normalizedPINPolicyDraft(draft);
  if (normalized.minPINLength !== null && (
    !Number.isInteger(normalized.minPINLength) || normalized.minPINLength <= 0
  )) {
    return "min-pin-length-invalid";
  }
  const current = report?.pin.minPINLength;
  if (normalized.minPINLength !== null && current !== undefined && normalized.minPINLength < current) {
    return "min-pin-length-decrease";
  }
  const maximum = report?.pin.maxPINLength;
  if (normalized.minPINLength !== null && maximum !== undefined && normalized.minPINLength > maximum) {
    return "min-pin-length-too-large";
  }
  const maxRPIDs = report?.limits.maxRPIDsForSetMinPINLength;
  if (maxRPIDs !== null && maxRPIDs !== undefined && normalized.rpIDs.length > maxRPIDs) {
    return "too-many-rp-ids";
  }
  const minimumUnchanged = normalized.minPINLength === null
    || (current !== undefined && normalized.minPINLength === current);
  if (
    minimumUnchanged
    && normalized.rpIDs.length === 0
    && !normalized.forceChangePin
    && !normalized.pinComplexityPolicy
  ) {
    return "no-change";
  }
  return null;
}

function friendlyNameTooLong(value: string) {
  const sensor = bioSensorReport(get(securitySensor).lastSuccessfulEnvelope);
  const maximum = sensor?.maxTemplateFriendlyName;
  return maximum !== null
    && maximum !== undefined
    && new TextEncoder().encode(value).byteLength > maximum;
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
    securityMutation.set(editingMutation(
      { kind: "alwaysUv" as const, target },
      "no-change" as const,
    ));
    return false;
  }

  const label = m.security_always_uv_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: AlwaysUVRequest = { selectionId, target, dryRun: true };
  const mutation = previewingMutation(
    { kind: "alwaysUv" as const, target },
    request,
  ) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.setAlwaysUV(request),
    extract: authenticatorConfigPreview,
  });
}

export async function beginLongTouchForReset(): Promise<boolean> {
  const capability = currentStatusReport()?.authenticatorConfig.longTouchForReset;
  if (!capability?.supported || capability.configured !== false) return false;

  const label = m.security_long_touch_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: EnableLongTouchForResetRequest = { selectionId, dryRun: true };
  const mutation = previewingMutation(
    { kind: "longTouch" as const },
    request,
  ) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.enableLongTouchForReset(request),
    extract: authenticatorConfigPreview,
  });
}

export async function beginPINPolicyChange(draft: SecurityPINPolicyDraft): Promise<boolean> {
  const validationError = validatePINPolicyDraft(draft);
  if (validationError) {
    securityMutation.set(editingMutation(
      { kind: "pinPolicy" as const, draft },
      validationError,
    ));
    return false;
  }

  const normalized = normalizedPINPolicyDraft(draft);
  const label = m.security_pin_policy_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: MinPINLengthRequest = {
    selectionId,
    ...(normalized.minPINLength === null ? {} : { newMinPINLength: normalized.minPINLength }),
    minPinLengthRPIDs: normalized.rpIDs,
    forceChangePin: normalized.forceChangePin,
    pinComplexityPolicy: normalized.pinComplexityPolicy,
    dryRun: true,
  };
  const mutation = previewingMutation(
    { kind: "pinPolicy" as const, draft },
    request,
  ) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.setMinPINLength(request),
    extract: authenticatorConfigPreview,
  });
}

export async function beginBioEnrollment(): Promise<boolean> {
  if (!currentStatusReport()?.bio.supported) return false;
  const label = m.security_bio_enroll_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: BioEnrollRequest = {
    selectionId,
    timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
    dryRun: true,
  };
  const mutation = previewingMutation({
    kind: "bioEnroll" as const,
    timeoutMilliseconds: BIO_ENROLL_TIMEOUT_MILLISECONDS,
  }, request) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.bioEnroll(request),
    extract: bioEnrollPreview,
  });
}

export async function beginBioRename(templateIDHex: string, friendlyName: string): Promise<boolean> {
  if (friendlyNameTooLong(friendlyName)) {
    securityMutation.set(editingMutation({
      kind: "bioRename" as const,
      templateIDHex,
      friendlyName,
    }, "friendly-name-too-long" as const));
    return false;
  }
  const label = m.security_bio_rename_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: BioRenameRequest = {
    selectionId,
    templateIdHex: templateIDHex,
    friendlyName,
    dryRun: true,
  };
  const mutation = previewingMutation({
    kind: "bioRename" as const,
    templateIDHex,
    friendlyName,
  }, request) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.bioRename(request),
    extract: bioMutationPreview,
  });
}

export async function beginBioRemove(templateIDHex: string): Promise<boolean> {
  const label = m.security_bio_remove_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: BioRemoveRequest = { selectionId, templateIdHex: templateIDHex, dryRun: true };
  const mutation = previewingMutation({
    kind: "bioRemove" as const,
    templateIDHex,
  }, request) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.bioRemove(request),
    extract: bioMutationPreview,
  });
}

export async function beginFactoryReset(): Promise<boolean> {
  const label = m.security_reset_preview_operation();
  const selectionId = selectionIdForMutation();
  if (!selectionId) return false;
  const request: ResetFactoryRequest = { selectionId, dryRun: true };
  const mutation = previewingMutation(
    { kind: "reset" as const },
    request,
  ) satisfies PreviewingSecurityMutation;
  securityMutation.set(mutation);
  return runSecurityPreviewStage({
    label,
    current: mutation,
    call: () => api.resetFactory(request),
    extract: resetFactoryPreview,
  });
}

function beginSecurityPreview(current: NonIdleSecurityMutation): Promise<boolean> {
  switch (current.kind) {
    case "alwaysUv": return beginAlwaysUVChange(current.target);
    case "pinPolicy": return beginPINPolicyChange(current.draft);
    case "longTouch": return beginLongTouchForReset();
    case "bioEnroll": return beginBioEnrollment();
    case "bioRename": return beginBioRename(current.templateIDHex, current.friendlyName);
    case "bioRemove": return beginBioRemove(current.templateIDHex);
    case "reset": return beginFactoryReset();
  }
}

function executeRequest<T extends { dryRun?: boolean }>(request: T): T {
  return { ...request, dryRun: false };
}

async function finishSuccessfulSecurityMutation(kind: NonIdleSecurityMutation["kind"]) {
  securityMutation.set(idleMutation());
  switch (kind) {
    case "alwaysUv":
    case "pinPolicy":
    case "longTouch":
      toast.success(m.security_configuration_updated());
      await refreshSecurityAfterConfigurationChange();
      return;
    case "bioEnroll":
    case "bioRename":
    case "bioRemove":
      toast.success(m.security_configuration_updated());
      await refreshSecurityAfterConfigurationChange();
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

function operationLabel(kind: NonIdleSecurityMutation["kind"], preview = false) {
  switch (kind) {
    case "alwaysUv": return preview ? m.security_always_uv_preview_operation() : m.security_always_uv_operation();
    case "pinPolicy": return preview ? m.security_pin_policy_preview_operation() : m.security_pin_policy_operation();
    case "longTouch": return preview ? m.security_long_touch_preview_operation() : m.security_long_touch_operation();
    case "bioEnroll": return preview ? m.security_bio_enroll_preview_operation() : m.security_bio_enroll_operation();
    case "bioRename": return preview ? m.security_bio_rename_preview_operation() : m.security_bio_rename_operation();
    case "bioRemove": return preview ? m.security_bio_remove_preview_operation() : m.security_bio_remove_operation();
    case "reset": return preview ? m.security_reset_preview_operation() : m.security_reset_operation();
  }
}

function executingSecurityMutation(
  current: ExecutableSecurityMutation,
  execution: SecurityExecutionContext,
): SecurityMutationState {
  return executingMutation(
    securityMutationBase(current),
    execution.previewRequest,
    execution.previewEnvelope,
  ) as SecurityMutationState;
}

function failedExecutingMutation(
  current: ExecutableSecurityMutation,
  execution: SecurityExecutionContext,
  responseEnvelope: SecurityOperationEnvelope | null,
  runtimeError: Failure | null,
  failureReason: ExecuteFailureReason,
): SecurityMutationState {
  return failedEditableMutation(securityMutationBase(current), {
    failedPhase: "executing",
    previewRequest: execution.previewRequest,
    previewEnvelope: execution.previewEnvelope,
    responseEnvelope,
    runtimeError,
    failureReason,
  }) as SecurityMutationState;
}

async function runSecurityExecutionStage<
  E extends SecurityOperationEnvelope,
  TValue,
>(
  label: string,
  current: ExecutableSecurityMutation,
  execution: SecurityExecutionContext,
  call: () => Promise<E>,
  extract: (envelope: E) => TValue | null,
): Promise<boolean> {
  const outcome = await runTypedOperationStage({
    label,
    call: () => {
      requestForCurrentSelection(execution.previewRequest);
      return call();
    },
    extract,
    onFailure: (failure) => {
      const details = operationStageFailureDetails(failure, "missing-result");
      securityMutation.set(failedExecutingMutation(
        current,
        execution,
        details.responseEnvelope,
        details.runtimeError,
        details.failureReason,
      ));
    },
  });
  return outcome.ok;
}

export async function confirmSecurityMutation(): Promise<boolean> {
  const current = get(securityMutation);
  if (current.kind === "idle" || (current.phase !== "review" && current.phase !== "error")) return false;
  const execution = mutationExecutionContext<
    SecurityOperationRequest,
    SecurityOperationEnvelope
  >(current);
  if (!execution) return false;
  const label = operationLabel(current.kind);
  securityMutation.set(executingSecurityMutation(current, execution));

  let succeeded = false;
  switch (current.kind) {
    case "alwaysUv":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.setAlwaysUV(executeRequest(current.previewRequest!)),
        authenticatorConfigResult,
      );
      break;
    case "pinPolicy":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.setMinPINLength(executeRequest(current.previewRequest!)),
        authenticatorConfigResult,
      );
      break;
    case "longTouch":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.enableLongTouchForReset(executeRequest(current.previewRequest!)),
        authenticatorConfigResult,
      );
      break;
    case "bioEnroll":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.bioEnroll(executeRequest(current.previewRequest!)),
        bioEnrollResult,
      );
      break;
    case "bioRename":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.bioRename(executeRequest(current.previewRequest!)),
        bioMutationResult,
      );
      break;
    case "bioRemove":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.bioRemove(executeRequest(current.previewRequest!)),
        bioMutationResult,
      );
      break;
    case "reset":
      succeeded = await runSecurityExecutionStage(
        label,
        current,
        execution,
        () => api.resetFactory(executeRequest(current.previewRequest!)),
        resetFactoryResult,
      );
      break;
  }
  if (!succeeded) return false;

  await finishSuccessfulSecurityMutation(current.kind);
  return true;
}

export async function restartSecurityPreview(): Promise<boolean> {
  const current = get(securityMutation);
  if (current.phase !== "error" || current.failedPhase !== "previewing") return false;
  return beginSecurityPreview(current);
}

export function closeSecurityMutation() {
  securityMutation.set(idleMutation());
}

export type { SecurityPINPolicyDraft } from "./features/security/state.js";
export { AlwaysUVTarget };
