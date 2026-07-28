import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

import type { OperationEnvelope } from "./api.js";
import {
  applyAuthenticatorClosedError,
  applyOperationAuthenticatorBoundary,
  currentSelectionID,
} from "./authenticator-boundary.js";
import { internalFailure, runtimeFailureFrom } from "./failure.js";
import { offerOperationRecovery } from "./operation-recovery.js";
import {
  beginOperation,
  finishOperation,
  summarizeEnvelope,
  summarizeOperationContractFailure,
  summarizeOperationFailure,
} from "./workbench-state.js";

export type OperationAttempt<E extends OperationEnvelope> =
  | { ok: true; envelope: E }
  | { ok: false; error: Failure };

interface RunOperationOptions<E extends OperationEnvelope> {
  label: string;
  call: () => Promise<E>;
  cardPresenceRecovery?: boolean;
  onRuntimeFailure?: (error: Failure) => void;
}

export interface CompleteOperationOptions {
  contractValid?: boolean;
  summarize?: boolean;
}

export type TypedOperationStageFailure<E extends OperationEnvelope, TValue> =
  | { ok: false; reason: "runtime-error"; error: Failure }
  | { ok: false; reason: "response-error"; envelope: E; value: TValue | null }
  | { ok: false; reason: "missing-contract"; envelope: E };

export type TypedOperationStageOutcome<E extends OperationEnvelope, TValue> =
  | { ok: true; envelope: E; value: TValue }
  | TypedOperationStageFailure<E, TValue>;

/**
 * Rebinds a captured request to the authenticator selected for this attempt.
 * Mutation is intentional so feature history reflects the request actually sent.
 */
export function requestForCurrentSelection<T extends { selectionId: string }>(
  request: T,
): T {
  request.selectionId = currentSelectionID();
  return request;
}

interface RunTypedOperationStageOptions<E extends OperationEnvelope, TValue> {
  label: string;
  call: () => Promise<E>;
  cardPresenceRecovery?: boolean;
  extract: (envelope: E) => TValue | null;
  onFailure: (failure: TypedOperationStageFailure<E, TValue>) => void;
  onSuccess?: (value: TValue, envelope: E) => void;
  completion?: CompleteOperationOptions
    | ((value: TValue | null, envelope: E) => CompleteOperationOptions);
}

export function operationStageFailureDetails<
  E extends OperationEnvelope,
  TValue,
  TContractReason extends string,
>(
  failure: TypedOperationStageFailure<E, TValue>,
  contractReason: TContractReason,
) {
  switch (failure.reason) {
    case "runtime-error":
      return {
        responseEnvelope: null,
        runtimeError: failure.error,
        failureReason: failure.reason,
      };
    case "response-error":
      return {
        responseEnvelope: failure.envelope,
        runtimeError: null,
        failureReason: failure.reason,
      };
    case "missing-contract":
      return {
        responseEnvelope: failure.envelope,
        runtimeError: null,
        failureReason: contractReason,
      };
  }
}

/**
 * Runs the bridge portion of a typed authenticator operation.
 *
 * Runtime failures remain separate from generated service envelopes. Feature
 * state is updated before the authenticator boundary is applied so an invalid
 * selection can clear the just-failed device state consistently.
 */
export async function runOperation<E extends OperationEnvelope>({
  label,
  call,
  cardPresenceRecovery = true,
  onRuntimeFailure,
}: RunOperationOptions<E>): Promise<OperationAttempt<E>> {
  while (true) {
    beginOperation(label);
    try {
      const envelope = await call();
      const recovery = cardPresenceRecovery && envelope.error
        ? offerOperationRecovery(label, envelope.error)
        : null;
      if (recovery) {
        finishOperation();
        if (await recovery === "retry") continue;
      }
      return { ok: true, envelope };
    } catch (cause) {
      const error = runtimeFailureFrom(cause);
      onRuntimeFailure?.(error);
      summarizeOperationFailure(label, error);
      applyAuthenticatorClosedError(error);
      return { ok: false, error };
    }
  }
}

/**
 * Runs one typed preview or execution stage and classifies its outcome.
 *
 * Feature controllers retain ownership of their generated DTOs and state
 * transitions. This helper only enforces the shared ordering: runtime failure,
 * response failure, missing typed contract, success, then operation-boundary
 * completion.
 */
export async function runTypedOperationStage<
  E extends OperationEnvelope,
  TValue,
>({
  label,
  call,
  cardPresenceRecovery,
  extract,
  onFailure,
  onSuccess,
  completion,
}: RunTypedOperationStageOptions<E, TValue>): Promise<TypedOperationStageOutcome<E, TValue>> {
  let runtimeOutcome: TypedOperationStageFailure<E, TValue> | null = null;
  const attempt = await runOperation({
    label,
    call,
    cardPresenceRecovery,
    onRuntimeFailure: (error) => {
      runtimeOutcome = { ok: false, reason: "runtime-error", error };
      onFailure(runtimeOutcome);
    },
  });
  if (!attempt.ok) {
    return runtimeOutcome ?? { ok: false, reason: "runtime-error", error: attempt.error };
  }

  const envelope = attempt.envelope;
  const value = extract(envelope);
  let outcome: TypedOperationStageOutcome<E, TValue>;

  if (envelope.error) {
    outcome = { ok: false, reason: "response-error", envelope, value };
    onFailure(outcome);
  } else if (value === null) {
    outcome = { ok: false, reason: "missing-contract", envelope };
    onFailure(outcome);
  } else {
    onSuccess?.(value, envelope);
    outcome = { ok: true, envelope, value };
  }

  const options = typeof completion === "function"
    ? completion(value, envelope)
    : completion;
  completeOperation(label, envelope, {
    ...options,
    contractValid: value !== null,
  });
  return outcome;
}

/**
 * Completes a real generated operation response after feature state has
 * consumed it. Contract validation is explicit because result extraction is
 * owned by the feature controller and stays fully typed.
 */
export function completeOperation(
  label: string,
  envelope: OperationEnvelope,
  {
    contractValid = true,
    summarize = true,
  }: CompleteOperationOptions = {},
) {
  if (summarize) {
    if (envelope.error || contractValid) {
      summarizeEnvelope(label, envelope);
    } else {
      summarizeOperationContractFailure(label, internalFailure());
    }
  } else {
    finishOperation();
  }
  applyOperationAuthenticatorBoundary(envelope);
}
