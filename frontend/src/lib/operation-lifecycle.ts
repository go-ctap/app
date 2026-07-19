import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

import type { OperationEnvelope } from "./api.js";
import {
	applyAuthenticatorClosedError,
  applyOperationAuthenticatorBoundary,
} from "./authenticator-boundary.js";
import { internalFailure, runtimeFailureFrom } from "./failure.js";
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
  onRuntimeFailure?: (error: Failure) => void;
}

interface CompleteOperationOptions {
  contractValid?: boolean;
  summarize?: boolean;
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
  onRuntimeFailure,
}: RunOperationOptions<E>): Promise<OperationAttempt<E>> {
  beginOperation(label);
  try {
    return { ok: true, envelope: await call() };
  } catch (cause) {
    const error = runtimeFailureFrom(cause);
    onRuntimeFailure?.(error);
    summarizeOperationFailure(label, error);
		applyAuthenticatorClosedError(error);
    return { ok: false, error };
  }
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
