import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorCategory, OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { CredentialsEnvelope, InteractionPrompt, OperationEventEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { pendingInteraction } from "./features/interaction/state.js";
import { statusBar as mutableStatusBar } from "./features/workbench/state.js";
import { setAppLocale } from "./i18n.js";
import { resetAppStateForTest, seedPendingInteractionForTest, seedSelectionForTest } from "./store-test-utils.js";
import { pendingInteraction as readonlyPendingInteraction, sessionStatus, statusBar } from "./stores.js";
import { setStatusOperation, setStatusOutcome, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

const serviceMocks = vi.hoisted(() => ({
  CancelOperation: vi.fn(),
  ResolveInteraction: vi.fn(),
}));
const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("../../bindings/fidobench/ctapkitservice", () => serviceMocks);
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

const token: DeviceReport = {
  deviceId: "token-1",
  ordinalAlias: "1",
  stableId: true,
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  vendor: Vendor.VendorUnknown,
  product: "Test key",
};

function seedSession(state: "ready" | "running" = "running") {
  seedSelectionForTest("token-1", token, {
    state,
    sessionId: "session-1",
  });
}

function seedOperation() {
  setStatusOperation({ operationId: "operation-1", sessionId: "session-1", label: "Inventory" });
  seedPendingInteractionForTest({
    operationId: "operation-1",
    sessionId: "session-1",
    interactionId: "interaction-1",
    request: { kind: "confirm" },
  } as InteractionPrompt);
}

describe("operation controller", () => {
  beforeEach(() => {
    setAppLocale("en");
    vi.clearAllMocks();
    resetAppStateForTest();
  });

  it("keeps an accepted cancellation active until the terminal envelope", async () => {
    seedSession();
    seedOperation();
    serviceMocks.CancelOperation.mockResolvedValue(true);
    const { cancelActiveOperation } = await import("./operation-controller.js");

    await expect(cancelActiveOperation()).resolves.toBe("accepted");

    expect(serviceMocks.CancelOperation).toHaveBeenCalledWith({ operationId: "operation-1" });
    expect(get(statusBar).activeOperation).toMatchObject({
      operationId: "operation-1",
      cancelPending: false,
      cancelRequested: true,
    });
    expect(get(sessionStatus).state).toBe("running");
    expect(get(readonlyPendingInteraction)).toBeNull();
  });

  it("finishes stale UI activity and reports when the operation already ended", async () => {
    seedSession();
    seedOperation();
    serviceMocks.CancelOperation.mockResolvedValue(false);
    const { cancelActiveOperation } = await import("./operation-controller.js");

    await expect(cancelActiveOperation()).resolves.toBe("already-finished");

    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(sessionStatus).state).toBe("ready");
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "info", title: "Operation already finished" });
  });

  it("preserves the operation and interaction after a thrown cancel failure", async () => {
    seedSession();
    seedOperation();
    serviceMocks.CancelOperation.mockRejectedValue(new Error("bridge offline"));
    const { cancelActiveOperation } = await import("./operation-controller.js");

    await expect(cancelActiveOperation()).resolves.toBe("failed");

    expect(get(statusBar).activeOperation).toMatchObject({
      operationId: "operation-1",
      cancelPending: false,
      cancelError: { message: "bridge offline" },
    });
    expect(get(readonlyPendingInteraction)?.interactionId).toBe("interaction-1");
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "error", title: "Could not cancel operation" });
  });

  it("retries only through a live ready session", async () => {
    const retry = vi.fn();
    const { retryLastStatusOutcome } = await import("./operation-controller.js");
    setStatusOutcome({ tone: "error", title: "Failed", retry });

    await expect(retryLastStatusOutcome()).resolves.toBe(false);
    expect(retry).not.toHaveBeenCalled();

    seedSession("ready");
    await expect(retryLastStatusOutcome()).resolves.toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("presents canceled operation errors as informational and never retryable", () => {
    const retry = vi.fn();
    seedSession();
    seedOperation();

    summarizeOperationFailure(
      "Credential inventory",
      { category: ErrorCategory.ErrorCanceled, message: "context canceled" },
      retry,
    );

    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Credential inventory canceled",
    });
    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();
    expect(toastMocks.info).toHaveBeenCalledWith(
      "Credential inventory canceled",
      expect.objectContaining({ description: "context canceled", important: true }),
    );
  });

  it("presents a canceled generated envelope as informational", () => {
    const retry = vi.fn();
    seedSession();
    seedOperation();

    summarizeEnvelope("Credential inventory", {
      operationId: "operation-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      error: { category: ErrorCategory.ErrorCanceled, message: "operation canceled" },
    } as CredentialsEnvelope, retry);

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Credential inventory canceled",
    });
    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();
  });

  it("does not offer retry for an uncategorized runtime failure", () => {
    const retry = vi.fn();
    seedSession();
    seedOperation();

    summarizeOperationFailure("Credential inventory", { message: "TypeError: invalid payload" }, retry);

    expect(get(statusBar).lastOutcome?.retry).toBeUndefined();
    expect(toastMocks.error).toHaveBeenCalledWith(
      "Credential inventory failed",
      expect.objectContaining({ description: "TypeError: invalid payload", important: true }),
    );
  });

  it("offers retry from a toast for retryable operation failures", () => {
    const retry = vi.fn();
    seedSession();
    seedOperation();

    summarizeOperationFailure(
      "Credential inventory",
      { category: ErrorCategory.ErrorTimeout, message: "authenticator timed out" },
      retry,
    );

    const options = toastMocks.error.mock.calls.at(-1)?.[1];
    expect(options).toMatchObject({
      description: "authenticator timed out",
      action: { label: "Retry" },
    });
    options.action.onClick();
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("runtime operation events", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
    seedSession("ready");
  });

  it("captures operation ids and determinate progress from progress events", async () => {
    const { handleOperationProgress } = await import("./event-controller.js");
    handleOperationProgress({
      operationId: "operation-1",
      sessionId: "session-1",
      event: {
        stage: "capturing-bio-sample",
        completed: 1,
        total: 3,
        sampleStatus: "good",
      },
    } as OperationEventEnvelope);

    expect(get(statusBar).activeOperation).toMatchObject({
      operationId: "operation-1",
      completed: 1,
      total: 3,
      sampleStatus: "good",
    });
    expect(get(sessionStatus)).toMatchObject({ state: "running" });
  });

  it("captures an operation id from an interaction before any progress event", async () => {
    const { handleInteractionRequested } = await import("./interaction-controller.js");
    handleInteractionRequested({
      operationId: "operation-2",
      sessionId: "session-1",
      interactionId: "interaction-2",
      request: { kind: "confirm", message: "Touch the key" },
    } as InteractionPrompt);

    expect(get(mutableStatusBar).activeOperation).toMatchObject({
      operationId: "operation-2",
      stage: "interaction-required",
    });
    expect(get(pendingInteraction)?.interactionId).toBe("interaction-2");
  });
});
