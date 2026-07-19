import { describe, expect, it } from "vitest";

import {
  editingMutation,
  executingMutation,
  failedEditableMutation,
  failedMutation,
  idleMutation,
  mutationExecutionContext,
  previewingMutation,
  reviewedMutation,
} from "./mutation-lifecycle.js";

describe("mutation lifecycle transitions", () => {
  const base = { kind: "write" as const, credentialIDHex: "cafe" };
  const request = { selectionId: "authenticator-1", dryRun: true };
  const envelope = { operationId: "operation-1" };

  it("builds each successful phase from domain base fields and typed contracts", () => {
    expect(idleMutation()).toEqual({ kind: "idle", phase: "idle" });
    expect(editingMutation(base, "invalid-payload" as const)).toEqual({
      ...base,
      phase: "editing",
      validationError: "invalid-payload",
    });
    expect(previewingMutation(base, request)).toEqual({
      ...base,
      phase: "previewing",
      previewRequest: request,
    });
    expect(reviewedMutation(base, request, envelope)).toEqual({
      ...base,
      phase: "review",
      previewRequest: request,
      previewEnvelope: envelope,
    });
    expect(executingMutation(base, request, envelope)).toEqual({
      ...base,
      phase: "executing",
      previewRequest: request,
      previewEnvelope: envelope,
    });
  });

  it("builds an error phase from explicit failure details", () => {
    const failed = failedEditableMutation(base, {
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError: null,
      failureReason: "runtime-error" as const,
    });

    expect(failed).toEqual({
      ...base,
      phase: "error",
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: null,
      runtimeError: null,
      failureReason: "runtime-error",
      validationError: null,
    });
  });

  it("allows execution from review or an execution retry only", () => {
    const review = reviewedMutation(base, request, envelope);
    expect(mutationExecutionContext(review)).toEqual({
      previewRequest: request,
      previewEnvelope: envelope,
    });

    const executionFailure = failedMutation(base, {
      failedPhase: "executing",
      previewRequest: request,
      previewEnvelope: envelope,
      responseEnvelope: envelope,
      runtimeError: null,
      failureReason: "response-error" as const,
    });
    expect(mutationExecutionContext(executionFailure)).toEqual({
      previewRequest: request,
      previewEnvelope: envelope,
    });

    const previewFailure = failedMutation(base, {
      failedPhase: "previewing",
      previewRequest: request,
      previewEnvelope: null,
      responseEnvelope: envelope,
      runtimeError: null,
      failureReason: "response-error" as const,
    });
    expect(mutationExecutionContext(previewFailure)).toBeNull();
  });
});
