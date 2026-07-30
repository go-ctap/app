import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import type { CredentialsEnvelope } from "../../bindings/telesma/service";

import { runConfirmedPreview } from "$lib/confirmed-operation.js";
import { setAppLocale } from "$lib/i18n.js";
import { runTypedOperationStage } from "$lib/operation-lifecycle.js";
import {
  cancelOperationRecovery,
  operationRecovery,
  retryOperationRecovery,
} from "$lib/operation-recovery.js";
import {
  resetAppStateForTest,
  seedDevicesForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils.js";
import { failureForCode } from "$lib/test-support/failure.js";
import { statusBar } from "$lib/features/workbench/state.js";
import { testSmartCardDevice } from "../test/device.js";

function envelope(error?: NonNullable<CredentialsEnvelope["error"]>): CredentialsEnvelope {
  const base = {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    authenticatorClosed: false,
  };

  return error
    ? ({ ...base, error } as CredentialsEnvelope)
    : ({ ...base, result: {} } as CredentialsEnvelope);
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

  it("classifies a generated response error without extracting a result", async () => {
    const response = envelope(failureForCode(Code.CodeTransportFailure));
    const onFailure = vi.fn();
    const extract = vi.fn(() => ({ preview: true }));

    const outcome = await runTypedOperationStage({
      label: "Preview",
      call: async () => response,
      extract,
      onFailure,
    });

    if (outcome.ok) throw new Error("expected an operation-stage failure");

    expect(outcome).toEqual({ ok: false, reason: "response-error", envelope: response });
    expect(extract).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledWith(outcome);
  });

  it("keeps thrown runtime failures separate from generated envelopes", async () => {
    const onFailure = vi.fn();

    const outcome = await runTypedOperationStage({
      label: "Execute",
      call: async (): Promise<CredentialsEnvelope> => {
        throw new Error("bridge unavailable");
      },
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

  it("retries the same captured request only after an explicit decision", async () => {
    const response = envelope(failureForCode(Code.CodeUserPresenceRequired));
    const request = { marker: "frozen" };
    const sentRequests: (typeof request)[] = [];
    const responses = [response, envelope()];
    const call = vi.fn(async () => {
      sentRequests.push(request);

      return responses.shift()!;
    });
    const pending = runTypedOperationStage({
      label: "List credentials",
      call,
      extract: (value) => (value.error ? null : {}),
      onFailure: () => {},
    });

    await vi.waitFor(() => expect(get(operationRecovery)).not.toBeNull());
    seedDevicesForTest([]);
    seedSelectionForTest("", null, { state: "idle" });
    seedReadyCard("card-2");
    expect(retryOperationRecovery()).toBe(true);

    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(sentRequests).toEqual([request, request]);
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

  it("finishes a confirmed preview that does not require review", async () => {
    const response = envelope();
    const preview = { requiresReview: false };
    const publish = vi.fn();
    const onSkipped = vi.fn();

    await expect(
      runConfirmedPreview({
        label: "Preview cleanup",
        request: { marker: "frozen" },
        call: async () => response,
        extract: () => preview,
        publish,
        shouldReview: (value) => value.requiresReview,
        onSkipped,
      }),
    ).resolves.toBe(true);

    expect(publish).toHaveBeenCalledOnce();
    expect(publish).toHaveBeenCalledWith({ phase: "previewing" });
    expect(onSkipped).toHaveBeenCalledWith(preview, response);
    expect(get(statusBar).activeOperation).toBeNull();
  });

  it("retains the extracted preview value in review state", async () => {
    const response = envelope();
    const preview = { requiresReview: true };
    const publish = vi.fn();

    await expect(
      runConfirmedPreview({
        label: "Preview mutation",
        request: { marker: "frozen" },
        call: async () => response,
        extract: () => preview,
        publish,
      }),
    ).resolves.toBe(true);

    expect(publish).toHaveBeenLastCalledWith({
      phase: "review",
      previewRequest: { marker: "frozen" },
      previewEnvelope: response,
      previewValue: preview,
    });
  });
});
