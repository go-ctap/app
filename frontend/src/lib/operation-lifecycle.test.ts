import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope } from "../../bindings/telesma/service";

import { setAppLocale } from "./i18n.js";
import {
  operationStageFailureDetails,
  requestForCurrentSelection,
  runTypedOperationStage,
} from "./operation-lifecycle.js";
import {
  cancelOperationRecovery,
  operationRecovery,
  retryOperationRecovery,
} from "./operation-recovery.js";
import {
  resetAppStateForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "./store-test-utils.js";
import { failureForCode } from "./test-failure.js";
import { statusBar } from "./features/workbench/state.js";
import { testSmartCardDevice } from "../test/device.js";

function envelope(error: CredentialsEnvelope["error"] = null): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    error,
  } as CredentialsEnvelope;
}

function seedReadyCard(id = "card-1") {
  const card = testSmartCardDevice(id);
  seedDevicesForTest([card]);
  seedSelectionForTest(id, card, {
    state: "ready",
    selectionId: `authenticator-${id}`,
  });
}

describe("typed operation stages", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
    seedReadyCard();
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

    const outcome = await runTypedOperationStage({
      label: "Execute",
      call: async (): Promise<CredentialsEnvelope> => { throw new Error("bridge unavailable"); },
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
    expect(get(operationRecovery)).toBeNull();
  });

  it("does not replay before an explicit retry and cancel returns the first envelope", async () => {
    const response = envelope(failureForCode(Code.CodeUserPresenceRequired));
    const call = vi.fn(async () => response);
    const pending = runTypedOperationStage({
      label: "List credentials",
      call,
      extract: () => null,
      onFailure: () => {},
    });

    await vi.waitFor(() => expect(get(operationRecovery)).not.toBeNull());
    expect(call).toHaveBeenCalledOnce();
    expect(get(statusBar).activeOperation).toBeNull();

    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    seedReadyCard("card-2");
    await Promise.resolve();
    expect(call).toHaveBeenCalledOnce();

    cancelOperationRecovery();
    const outcome = await pending;
    expect(outcome).toMatchObject({
      ok: false,
      reason: "response-error",
      envelope: response,
    });
    expect(call).toHaveBeenCalledOnce();
  });

  it("retries as a new attempt with the current selection ID", async () => {
    const response = envelope(failureForCode(Code.CodeUserPresenceRequired));
    const request = { selectionId: "stale-selection" };
    const sentSelectionIds: string[] = [];
    const responses = [response, envelope()];
    const call = vi.fn(async () => {
      sentSelectionIds.push(requestForCurrentSelection(request).selectionId);
      return responses.shift()!;
    });
    const pending = runTypedOperationStage({
      label: "List credentials",
      call,
      extract: (value) => value.error ? null : {},
      onFailure: () => {},
    });

    await vi.waitFor(() => expect(get(operationRecovery)).not.toBeNull());
    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    seedReadyCard("card-2");
    expect(retryOperationRecovery()).toBe(true);

    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(sentSelectionIds).toEqual([
      "authenticator-card-1",
      "authenticator-card-2",
    ]);
  });

  it("prompts again when an explicit retry receives another eligible error", async () => {
    const response = envelope(failureForCode(Code.CodeUserPresenceRequired));
    const call = vi.fn(async () => response);
    const pending = runTypedOperationStage({
      label: "List credentials",
      call,
      extract: () => null,
      onFailure: () => {},
    });

    await vi.waitFor(() => expect(call).toHaveBeenCalledTimes(1));
    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    seedReadyCard("card-2");
    retryOperationRecovery();
    await vi.waitFor(() => {
      expect(call).toHaveBeenCalledTimes(2);
      expect(get(operationRecovery)).toMatchObject({ mustRemove: true });
    });

    cancelOperationRecovery();
    await expect(pending).resolves.toMatchObject({ ok: false, reason: "response-error" });
  });

  it("allows secret-bearing callers to opt out of recovery", async () => {
    const response = envelope(failureForCode(Code.CodeUserPresenceRequired));
    const call = vi.fn(async () => response);

    const outcome = await runTypedOperationStage({
      label: "Set PIN",
      call,
      cardPresenceRecovery: false,
      extract: () => null,
      onFailure: () => {},
    });

    expect(outcome).toMatchObject({ ok: false, reason: "response-error" });
    expect(call).toHaveBeenCalledOnce();
    expect(get(operationRecovery)).toBeNull();
  });
});
