import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { CredentialsEnvelope, InteractionPrompt, OperationEventEnvelope } from "../../bindings/github.com/go-ctap/kit/service";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { pendingInteraction } from "./features/interaction/state.js";
import { failureForCode } from "./test-failure.js";
import { statusBar as mutableStatusBar } from "./features/workbench/state.js";
import { setAppLocale } from "./i18n.js";
import { resetAppStateForTest, seedPendingInteractionForTest, seedSelectionForTest } from "./store-test-utils.js";
import { pendingInteraction as readonlyPendingInteraction, sessionStatus, statusBar } from "./stores.js";
import { setStatusOperation, summarizeEnvelope, summarizeOperationFailure } from "./workbench-state.js";

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
      cancelError: failureForCode(Code.CodeInternalError),
    });
    expect(get(readonlyPendingInteraction)?.interactionId).toBe("interaction-1");
    expect(get(statusBar).lastOutcome).toMatchObject({ tone: "error", title: "Could not cancel operation" });
  });

  it("presents canceled operation errors as informational", () => {
    seedSession();
    seedOperation();

    summarizeOperationFailure("Credential inventory", failureForCode(Code.CodeOperationCanceled));

    expect(get(statusBar).activeOperation).toBeNull();
    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Credential inventory canceled",
    });
    expect(toastMocks.info).toHaveBeenCalledWith(
      "Credential inventory canceled",
      expect.objectContaining({ description: "The operation was canceled.", important: true }),
    );
  });

  it("presents a canceled generated envelope as informational", () => {
    seedSession();
    seedOperation();

    summarizeEnvelope("Credential inventory", {
      operationId: "operation-1",
      sessionId: "session-1",
      kind: OperationKind.OperationListCredentials,
      error: failureForCode(Code.CodeOperationCanceled),
    } as CredentialsEnvelope);

    expect(get(statusBar).lastOutcome).toMatchObject({
      tone: "info",
      title: "Credential inventory canceled",
    });
  });

  it("presents an uncategorized runtime failure without an action", () => {
    seedSession();
    seedOperation();

    summarizeOperationFailure("Credential inventory", failureForCode(Code.CodeInternalError));

    expect(toastMocks.error).toHaveBeenCalledWith(
      "Credential inventory failed",
      expect.objectContaining({ description: "The operation failed because of an internal error.", important: true }),
    );
  });

  it("reports a timed-out operation without adding an action", () => {
    seedSession();
    seedOperation();

    summarizeOperationFailure("Credential inventory", failureForCode(Code.CodeOperationTimeout));

    const options = toastMocks.error.mock.calls.at(-1)?.[1];
    expect(options).toMatchObject({ description: "The operation timed out." });
    expect(options).not.toHaveProperty("action");
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
