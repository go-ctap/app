import { writable, type Writable } from "svelte/store";

import type { AlwaysUVTarget } from "../../../../bindings/github.com/go-ctap/kit/model/config";
import type { Failure } from "../../../../bindings/github.com/go-ctap/kit/model/failure";
import type {
  AlwaysUVRequest,
  AuthenticatorConfigEnvelope,
  BioEnrollEnvelope,
  BioEnrollRequest,
  BioListEnvelope,
  BioMutationEnvelope,
  BioRemoveRequest,
  BioRenameRequest,
  BioSensorEnvelope,
  ConfigStatusEnvelope,
  EnableLongTouchForResetRequest,
  MinPINLengthRequest,
  ResetFactoryEnvelope,
  ResetFactoryRequest,
} from "../../../../bindings/fidobench/service";
import { isUnsupportedFailure } from "../../failure.js";
import { deviceFeatureLifecycles } from "$lib/feature-lifecycle";
import {
  idleMutation,
  type EditableMutationLifecycle,
  type MutationFailureReason,
  type MutationIdleState,
} from "$lib/mutation-lifecycle";

export type SecurityResourcePhase = "idle" | "loading" | "refreshing" | "ready" | "error" | "unsupported";

/**
 * Resource state never replaces a real service response with a frontend-made
 * envelope. A transport/thrown failure has no response envelope and is kept in
 * runtimeError, while a failed refresh can retain its last-known-good data.
 */
export type SecurityResourceState<TEnvelope> = {
  phase: SecurityResourcePhase;
  lastSuccessfulEnvelope: TEnvelope | null;
  responseEnvelope: TEnvelope | null;
  runtimeError: Failure | null;
};

export type SecurityStatusState = SecurityResourceState<ConfigStatusEnvelope>;
export type SecurityBioSensorState = SecurityResourceState<BioSensorEnvelope>;
export type SecurityBioListState = SecurityResourceState<BioListEnvelope>;

export function emptySecurityResourceState<TEnvelope>(): SecurityResourceState<TEnvelope> {
  return {
    phase: "idle",
    lastSuccessfulEnvelope: null,
    responseEnvelope: null,
    runtimeError: null,
  };
}

export type SecurityPINPolicyDraft = {
  minPINLength: string;
  rpIDs: string;
  forceChangePin: boolean;
  pinComplexityPolicy: boolean;
};

export type SecurityMutationValidationError =
  | "no-change"
  | "min-pin-length-required"
  | "min-pin-length-invalid"
  | "min-pin-length-decrease"
  | "min-pin-length-too-large"
  | "too-many-rp-ids"
  | "friendly-name-too-long";

export type SecurityMutationFailureReason = MutationFailureReason;

type AlwaysUVMutationBase = {
  kind: "alwaysUv";
  target: AlwaysUVTarget;
};

type PINPolicyMutationBase = {
  kind: "pinPolicy";
  draft: SecurityPINPolicyDraft;
};

type LongTouchMutationBase = {
  kind: "longTouch";
};

type BioEnrollMutationBase = {
  kind: "bioEnroll";
  timeoutMilliseconds: number;
};

type BioRenameMutationBase = {
  kind: "bioRename";
  templateIDHex: string;
  friendlyName: string;
};

type BioRemoveMutationBase = {
  kind: "bioRemove";
  templateIDHex: string;
};

type ResetMutationBase = {
  kind: "reset";
};

/**
 * Requests are retained only for non-secret operations. PIN set/change is
 * deliberately absent: PIN strings must remain local to their dialog and be
 * discarded as soon as the service call starts.
 */
export type SecurityMutationState =
  | MutationIdleState
  | EditableMutationLifecycle<
      AlwaysUVMutationBase,
      AlwaysUVRequest,
      AuthenticatorConfigEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      PINPolicyMutationBase,
      MinPINLengthRequest,
      AuthenticatorConfigEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      LongTouchMutationBase,
      EnableLongTouchForResetRequest,
      AuthenticatorConfigEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      BioEnrollMutationBase,
      BioEnrollRequest,
      BioEnrollEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      BioRenameMutationBase,
      BioRenameRequest,
      BioMutationEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      BioRemoveMutationBase,
      BioRemoveRequest,
      BioMutationEnvelope,
      SecurityMutationValidationError
    >
  | EditableMutationLifecycle<
      ResetMutationBase,
      ResetFactoryRequest,
      ResetFactoryEnvelope,
      SecurityMutationValidationError
    >;

export const securityStatusState = writable<SecurityStatusState>(emptySecurityResourceState());
export const securityBioSensorState = writable<SecurityBioSensorState>(emptySecurityResourceState());
export const securityBioListState = writable<SecurityBioListState>(emptySecurityResourceState());
export const securityMutation = writable<SecurityMutationState>(idleMutation());

// Public feature names used by controllers and readonly app-store exports.
export const securityStatus = securityStatusState;
export const securitySensor = securityBioSensorState;
export const securityEnrollments = securityBioListState;

type ErrorBearingEnvelope = { error?: Failure | null };

export function beginSecurityResourceLoad<TEnvelope>(store: Writable<SecurityResourceState<TEnvelope>>) {
  store.update((current) => ({
    ...current,
    phase: current.lastSuccessfulEnvelope ? "refreshing" : "loading",
    responseEnvelope: null,
    runtimeError: null,
  }));
}

export function completeSecurityResourceLoad<TEnvelope>(
  store: Writable<SecurityResourceState<TEnvelope>>,
  envelope: TEnvelope,
) {
  store.set({
    phase: "ready",
    lastSuccessfulEnvelope: envelope,
    responseEnvelope: envelope,
    runtimeError: null,
  });
}

export function failSecurityResourceLoadWithResponse<TEnvelope extends ErrorBearingEnvelope>(
  store: Writable<SecurityResourceState<TEnvelope>>,
  envelope: TEnvelope,
) {
  store.update((current) => ({
    ...current,
    phase: isUnsupportedFailure(envelope.error) ? "unsupported" : "error",
    responseEnvelope: envelope,
    runtimeError: null,
  }));
}

export function failSecurityResourceLoadAtRuntime<TEnvelope>(
  store: Writable<SecurityResourceState<TEnvelope>>,
  error: Failure,
) {
  store.update((current) => ({
    ...current,
    phase: "error",
    responseEnvelope: null,
    runtimeError: error,
  }));
}

export function failSecurityResourceLoadWithContractError<TEnvelope>(
  store: Writable<SecurityResourceState<TEnvelope>>,
  envelope: TEnvelope,
  error: Failure,
) {
  store.update((current) => ({
    ...current,
    phase: "error",
    responseEnvelope: envelope,
    runtimeError: error,
  }));
}

export function beginSecurityStatusLoad() {
  beginSecurityResourceLoad(securityStatusState);
}

export function completeSecurityStatusLoad(envelope: ConfigStatusEnvelope) {
  completeSecurityResourceLoad(securityStatusState, envelope);
}

export function failSecurityStatusLoadWithResponse(envelope: ConfigStatusEnvelope) {
  failSecurityResourceLoadWithResponse(securityStatusState, envelope);
}

export function failSecurityStatusLoadAtRuntime(error: Failure) {
  failSecurityResourceLoadAtRuntime(securityStatusState, error);
}

export function failSecurityStatusLoadWithContractError(
  envelope: ConfigStatusEnvelope,
  error: Failure,
) {
  failSecurityResourceLoadWithContractError(securityStatusState, envelope, error);
}

export function beginSecurityBioSensorLoad() {
  beginSecurityResourceLoad(securityBioSensorState);
}

export function completeSecurityBioSensorLoad(envelope: BioSensorEnvelope) {
  completeSecurityResourceLoad(securityBioSensorState, envelope);
}

export function failSecurityBioSensorLoadWithResponse(envelope: BioSensorEnvelope) {
  failSecurityResourceLoadWithResponse(securityBioSensorState, envelope);
}

export function failSecurityBioSensorLoadAtRuntime(error: Failure) {
  failSecurityResourceLoadAtRuntime(securityBioSensorState, error);
}

export function failSecurityBioSensorLoadWithContractError(
  envelope: BioSensorEnvelope,
  error: Failure,
) {
  failSecurityResourceLoadWithContractError(securityBioSensorState, envelope, error);
}

export function beginSecurityBioListLoad() {
  beginSecurityResourceLoad(securityBioListState);
}

export function completeSecurityBioListLoad(envelope: BioListEnvelope) {
  completeSecurityResourceLoad(securityBioListState, envelope);
}

export function failSecurityBioListLoadWithResponse(envelope: BioListEnvelope) {
  failSecurityResourceLoadWithResponse(securityBioListState, envelope);
}

export function failSecurityBioListLoadAtRuntime(error: Failure) {
  failSecurityResourceLoadAtRuntime(securityBioListState, error);
}

export function failSecurityBioListLoadWithContractError(
  envelope: BioListEnvelope,
  error: Failure,
) {
  failSecurityResourceLoadWithContractError(securityBioListState, envelope, error);
}

export function resetSecurityDeviceState() {
  securityStatusState.set(emptySecurityResourceState());
  securityBioSensorState.set(emptySecurityResourceState());
  securityBioListState.set(emptySecurityResourceState());
  securityMutation.set(idleMutation());
}

export function resetSecurityStateForTest() {
  resetSecurityDeviceState();
}

deviceFeatureLifecycles.register("security", {
  resetForAuthenticatorChange: resetSecurityDeviceState,
  resetForTest: resetSecurityStateForTest,
});
