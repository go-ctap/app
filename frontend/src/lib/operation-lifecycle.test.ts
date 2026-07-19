import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope } from "../../bindings/fidobench/service";

import { setAppLocale } from "./i18n.js";
import {
  operationStageFailureDetails,
  runTypedOperationStage,
} from "./operation-lifecycle.js";
import { resetAppStateForTest } from "./store-test-utils.js";
import { failureForCode } from "./test-failure.js";
import { statusBar } from "./features/workbench/state.js";

function envelope(error: CredentialsEnvelope["error"] = null): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    error,
  } as CredentialsEnvelope;
}

describe("typed operation stages", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
  });

  it("classifies a generated response error before its extracted partial value", async () => {
    const response = envelope(failureForCode(Code.CodeTransportFailure));
    const onFailure = vi.fn();

    const outcome = await runTypedOperationStage({
      label: "Preview",
      call: async () => response,
      extract: () => ({ preview: true }),
      onFailure,
    });

    if (outcome.ok) throw new Error("expected an operation-stage failure");
    expect(outcome).toMatchObject({ ok: false, reason: "response-error", envelope: response });
    expect(onFailure).toHaveBeenCalledWith(outcome);
    expect(operationStageFailureDetails(outcome, "missing-preview")).toEqual({
      responseEnvelope: response,
      runtimeError: null,
      failureReason: "response-error",
    });
  });

  it("reports a successful envelope with no typed contract as a contract failure", async () => {
    const response = envelope();

    const outcome = await runTypedOperationStage({
      label: "Execute",
      call: async () => response,
      extract: () => null,
      onFailure: () => {},
    });

    expect(outcome).toEqual({ ok: false, reason: "missing-contract", envelope: response });
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "error" });
  });

  it("keeps thrown runtime failures separate from generated envelopes", async () => {
    const onFailure = vi.fn();

    const outcome = await runTypedOperationStage<CredentialsEnvelope, object>({
      label: "Execute",
      call: async () => { throw new Error("bridge unavailable"); },
      extract: () => ({}),
      onFailure,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: "runtime-error",
      error: failureForCode(Code.CodeInternalError),
    });
    expect(onFailure).toHaveBeenCalledWith(outcome);
    expect("envelope" in outcome).toBe(false);
  });
});
