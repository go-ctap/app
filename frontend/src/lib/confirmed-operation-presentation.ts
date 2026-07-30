import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { m } from "../paraglide/messages.js";
import { failureMessage, isCanceledFailure } from "$lib/failure.js";

type ConfirmedFailure = {
  runtimeError: Failure | null;
  responseEnvelope: { error?: Failure | null } | null;
};

export function confirmedFailureMessage(failure: ConfirmedFailure) {
  return (
    failureMessage(failure.runtimeError) ??
    failureMessage(failure.responseEnvelope?.error) ??
    m.operation_failed()
  );
}

export function confirmedFailureCanceled(failure: ConfirmedFailure) {
  return (
    isCanceledFailure(failure.runtimeError) || isCanceledFailure(failure.responseEnvelope?.error)
  );
}
