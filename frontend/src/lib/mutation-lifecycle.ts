import type { Failure } from "../../bindings/github.com/go-ctap/kit/model/failure";

export type MutationFailedPhase = "previewing" | "executing";

export type MutationFailureReason =
  | "response-error"
  | "runtime-error"
  | "missing-preview"
  | "missing-result";

export type MutationIdleState = {
  kind: "idle";
  phase: "idle";
};

export type MutationEditingState<TValidationError extends string> = {
  phase: "editing";
  validationError: TValidationError | null;
};

export type MutationPreviewingState<TRequest> = {
  phase: "previewing";
  previewRequest: TRequest;
};

export type MutationReviewState<TRequest, TEnvelope> = {
  phase: "review";
  previewRequest: TRequest;
  previewEnvelope: TEnvelope;
};

export type MutationExecutingState<TRequest, TEnvelope> = {
  phase: "executing";
  previewRequest: TRequest;
  previewEnvelope: TEnvelope;
};

export type MutationErrorState<
  TRequest,
  TEnvelope,
> = {
  phase: "error";
  failedPhase: MutationFailedPhase;
  previewRequest: TRequest | null;
  previewEnvelope: TEnvelope | null;
  responseEnvelope: TEnvelope | null;
  runtimeError: Failure | null;
  failureReason: MutationFailureReason;
};

export type MutationLifecycle<
  TBase,
  TRequest,
  TEnvelope,
> =
  | (TBase & MutationPreviewingState<TRequest>)
  | (TBase & MutationReviewState<TRequest, TEnvelope>)
  | (TBase & MutationExecutingState<TRequest, TEnvelope>)
  | (TBase & MutationErrorState<TRequest, TEnvelope>);

export type EditableMutationLifecycle<
  TBase,
  TRequest,
  TEnvelope,
  TValidationError extends string,
> =
  | (TBase & MutationEditingState<TValidationError>)
  | (TBase & MutationPreviewingState<TRequest>)
  | (TBase & MutationReviewState<TRequest, TEnvelope>)
  | (TBase & MutationExecutingState<TRequest, TEnvelope>)
  | (
      TBase
      & MutationErrorState<TRequest, TEnvelope>
      & { validationError: TValidationError | null }
    );

export function idleMutation(): MutationIdleState {
  return { kind: "idle", phase: "idle" };
}

export function editingMutation<
  TBase extends object,
  TValidationError extends string,
>(
  base: TBase,
  validationError: TValidationError | null,
): TBase & MutationEditingState<TValidationError> {
  return { ...base, phase: "editing", validationError };
}

export function previewingMutation<TBase extends object, TRequest>(
  base: TBase,
  previewRequest: TRequest,
): TBase & MutationPreviewingState<TRequest> {
  return { ...base, phase: "previewing", previewRequest };
}

export function reviewedMutation<TBase extends object, TRequest, TEnvelope>(
  base: TBase,
  previewRequest: TRequest,
  previewEnvelope: TEnvelope,
): TBase & MutationReviewState<TRequest, TEnvelope> {
  return { ...base, phase: "review", previewRequest, previewEnvelope };
}

export function executingMutation<TBase extends object, TRequest, TEnvelope>(
  base: TBase,
  previewRequest: TRequest,
  previewEnvelope: TEnvelope,
): TBase & MutationExecutingState<TRequest, TEnvelope> {
  return { ...base, phase: "executing", previewRequest, previewEnvelope };
}

export function failedMutation<
  TBase extends object,
  TRequest,
  TEnvelope,
>(
  base: TBase,
  failure: Omit<MutationErrorState<TRequest, TEnvelope>, "phase">,
): TBase & MutationErrorState<TRequest, TEnvelope> {
  return { ...base, phase: "error", ...failure };
}

export function failedEditableMutation<
  TBase extends object,
  TRequest,
  TEnvelope,
>(
  base: TBase,
  failure: Omit<MutationErrorState<TRequest, TEnvelope>, "phase">,
): TBase
  & MutationErrorState<TRequest, TEnvelope>
  & { validationError: null } {
  return { ...base, phase: "error", ...failure, validationError: null };
}

type MutationExecutionCandidate<TRequest, TEnvelope> =
  | MutationReviewState<TRequest, TEnvelope>
  | MutationErrorState<TRequest, TEnvelope>;

export function mutationExecutionContext<
  TRequest,
  TEnvelope,
>(
  mutation: MutationExecutionCandidate<TRequest, TEnvelope>,
): { previewRequest: TRequest; previewEnvelope: TEnvelope } | null {
  if (mutation.phase === "review") {
    return {
      previewRequest: mutation.previewRequest,
      previewEnvelope: mutation.previewEnvelope,
    };
  }
  if (
    mutation.failedPhase !== "executing"
    || mutation.previewRequest === null
    || mutation.previewEnvelope === null
  ) return null;
  return {
    previewRequest: mutation.previewRequest,
    previewEnvelope: mutation.previewEnvelope,
  };
}
