import { cleanup, render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorCategory,
  OperationKind,
} from "../../bindings/github.com/go-ctap/kit/model";
import {
  BlobState,
  DecodeMode,
  LargeBlobKeyState,
  MutationOperation,
  type DecodeStatus,
  type MutationPreview,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type {
  LargeBlobListEnvelope,
  LargeBlobMutationEnvelope,
  LargeBlobReadEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import {
  emptyLargeBlobsInventoryState,
  largeBlobsDecodeMode as mutableLargeBlobsDecodeMode,
  largeBlobsInventoryState as mutableLargeBlobsInventoryState,
  largeBlobsMutation as mutableLargeBlobsMutation,
  largeBlobsReadState as mutableLargeBlobsReadState,
  largeBlobsSelectedCredentialID as mutableLargeBlobsSelectedCredentialID,
} from "$lib/features/largeblobs/state";
import { setAppLocale } from "$lib/i18n";
import {
  resetAppStateForTest,
  seedLargeBlobsEnvelopeForTest,
  seedSelectionForTest,
} from "$lib/store-test-utils";

import LargeBlobs from "./LargeBlobs.svelte";

const controllerMocks = vi.hoisted(() => ({
  readLargeBlob: vi.fn(() => Promise.resolve(true)),
  reloadLargeBlobs: vi.fn(() => Promise.resolve(true)),
}));
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("$lib/controller", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/controller")>()),
  readLargeBlob: controllerMocks.readLargeBlob,
  reloadLargeBlobs: controllerMocks.reloadLargeBlobs,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

function listEnvelope(): LargeBlobListEnvelope {
  return {
    operationId: "large-blob-list-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListLargeBlobs,
    result: {
      report: {
        device: { deviceId: "token-1", stableId: true },
        support: {
          largeBlobs: true,
          largeBlobKeyExtension: true,
          maxSerializedLargeBlobArray: 0,
        },
        array: {
          read: true,
          blobCount: 1,
          matchedBlobCount: 1,
          unmatchedBlobCount: 0,
        },
        credentials: [
          {
            credentialIDHex: "cafe",
            rp: { id: "example.com", name: "Example" },
            user: { userIDHex: "01", name: "zero@example.com", displayName: "Zero User" },
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyAvailable,
            blobPresent: true,
            blobState: BlobState.BlobStatePresent,
            blobByteCount: 0,
          },
          {
            credentialIDHex: "beef",
            rp: { id: "missing.example", name: "Missing key" },
            user: { userIDHex: "02", name: "missing@example.com", displayName: "Missing User" },
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyMissing,
            blobPresent: false,
            blobState: BlobState.BlobStateUnknownKeyMissing,
            blobByteCount: 0,
          },
          {
            credentialIDHex: "feed",
            rp: { id: "empty.example", name: "No blob" },
            user: { userIDHex: "03", name: "empty@example.com", displayName: "Empty User" },
            largeBlobKeyState: LargeBlobKeyState.LargeBlobKeyAvailable,
            blobPresent: false,
            blobState: BlobState.BlobStateMissing,
            blobByteCount: 0,
          },
        ],
      },
    },
  } as LargeBlobListEnvelope;
}

function readEnvelope(options: {
  missingKey?: boolean;
  rawHex?: string;
  decode?: DecodeStatus;
} = {}): LargeBlobReadEnvelope {
  const missingKey = options.missingKey ?? false;
  const rawHex = options.rawHex ?? "";
  return {
    operationId: "large-blob-read-1",
    sessionId: "session-1",
    kind: OperationKind.OperationReadLargeBlob,
    result: {
      report: {
        device: { deviceId: "token-1", stableId: true },
        support: { largeBlobs: true, largeBlobKeyExtension: true, maxSerializedLargeBlobArray: 0 },
        target: {
          credentialIDHex: missingKey ? "beef" : "cafe",
          rp: { id: missingKey ? "missing.example" : "example.com" },
          user: {},
        },
        largeBlobKeyState: missingKey
          ? LargeBlobKeyState.LargeBlobKeyMissing
          : LargeBlobKeyState.LargeBlobKeyAvailable,
        array: {
          read: true,
          blobCount: 1,
          blobPresent: !missingKey,
          blobState: missingKey
            ? BlobState.BlobStateUnknownKeyMissing
            : BlobState.BlobStatePresent,
          blobSize: 0,
        },
        blobPresent: !missingKey,
        rawHex,
        rawByteCount: rawHex.length / 2,
        decode: options.decode ?? {
          requested: true,
          mode: DecodeMode.DecodeModeJSON,
          success: false,
          failure: missingKey ? "no blob present" : "payload is not valid JSON",
        },
      },
    },
  } as LargeBlobReadEnvelope;
}

function missingBlobReadEnvelope(): LargeBlobReadEnvelope {
  const envelope = readEnvelope();
  envelope.result!.report.target.credentialIDHex = "feed";
  envelope.result!.report.target.rp.id = "empty.example";
  envelope.result!.report.array.blobPresent = false;
  envelope.result!.report.array.blobState = BlobState.BlobStateMissing;
  envelope.result!.report.blobPresent = false;
  return envelope;
}

function mutationPreview(operation: MutationOperation, overrides: Partial<MutationPreview> = {}): MutationPreview {
  return {
    operation,
    device: { deviceId: "token-1", stableId: true },
    support: { largeBlobs: true, largeBlobKeyExtension: true, maxSerializedLargeBlobArray: 0 },
    target: {
      credentialIDHex: operation === MutationOperation.MutationGC ? "" : "cafe",
      rp: { id: operation === MutationOperation.MutationGC ? "" : "example.com" },
      user: {},
    },
    largeBlobKeyState: operation === MutationOperation.MutationGC
      ? LargeBlobKeyState.$zero
      : LargeBlobKeyState.LargeBlobKeyAvailable,
    currentByteCount: 0,
    proposedByteCount: 0,
    serializedLargeBlobArraySizeBefore: 10,
    serializedLargeBlobArraySizeAfter: 10,
    serializedLargeBlobArrayLimit: 0,
    blobCountBefore: 1,
    blobCountAfter: 1,
    noBlob: false,
    ...overrides,
  } as MutationPreview;
}

function mutationEnvelope(preview: MutationPreview): LargeBlobMutationEnvelope {
  return {
    operationId: "large-blob-preview-1",
    sessionId: "session-1",
    kind: preview.operation === MutationOperation.MutationGC
      ? OperationKind.OperationGarbageCollectLargeBlobs
      : preview.operation === MutationOperation.MutationDelete
        ? OperationKind.OperationDeleteLargeBlob
        : OperationKind.OperationWriteLargeBlob,
    result: { preview, result: null },
  } as LargeBlobMutationEnvelope;
}

describe("LargeBlobs", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.readLargeBlob.mockClear();
    controllerMocks.reloadLargeBlobs.mockClear();
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
    resetAppStateForTest();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      sessionId: "session-1",
    });
  });

  afterEach(async () => {
    cleanup();
    await tick();
    document.body.style.pointerEvents = "";
  });

  it("does not own autoload and distinguishes not-loaded, loading, unsupported, and empty states", () => {
    const { unmount } = render(LargeBlobs);
    expect(controllerMocks.reloadLargeBlobs).not.toHaveBeenCalled();
    expect(screen.getByText("Large blobs not loaded")).toBeInTheDocument();
    unmount();

    mutableLargeBlobsInventoryState.set({
      ...emptyLargeBlobsInventoryState(),
      phase: "loading",
    });
    const loading = render(LargeBlobs);
    expect(screen.getByRole("table", { name: "Waiting for authenticator response." })).toBeInTheDocument();
    loading.unmount();

    const unsupported = listEnvelope();
    unsupported.result!.report.support.largeBlobs = false;
    seedLargeBlobsEnvelopeForTest(unsupported);
    const unsupportedView = render(LargeBlobs);
    expect(screen.getByText("Large blob management unavailable")).toBeInTheDocument();
    unsupportedView.unmount();

    const empty = listEnvelope();
    empty.result!.report.credentials = [];
    seedLargeBlobsEnvelopeForTest(empty);
    render(LargeBlobs);
    expect(screen.getByText("No resident credentials found")).toBeInTheDocument();
  });

  it("opens the inspector immediately after the selected semantic table row", async () => {
    const user = userEvent.setup();
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    render(LargeBlobs);

    const table = screen.getByRole("table", { name: "Blob credentials" });
    expect(within(table).getByRole("columnheader", { name: "RP name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "User name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Payload" })).toBeInTheDocument();

    const disclosure = screen.getByRole("button", { name: /Zero User, zero@example.com/ });
    const row = disclosure.closest("tr") as HTMLElement;
    expect(disclosure).toHaveAttribute("aria-controls", "large-blob-row-details-cafe");
    disclosure.focus();
    await user.keyboard("{Enter}");

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(row).toHaveAttribute("aria-selected", "true");
    const details = row.nextElementSibling as HTMLElement;
    expect(details).toHaveAttribute("id", "large-blob-row-details-cafe");
    expect(details.closest("table")).toBe(table);
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    const read = within(details).getByRole("button", { name: "Read blob" });
    expect(read).toBeInTheDocument();
    const interpretation = within(details).getByRole("group", { name: "Interpretation" });
    expect(within(interpretation).getByRole("radio", { name: "JSON" })).toHaveAttribute("aria-checked", "true");
    await user.click(read);
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledOnce();
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledWith("cafe");
  });

  it("keeps stale rows inspectable while blocking read and mutation actions", async () => {
    const user = userEvent.setup();
    const envelope = listEnvelope();
    seedLargeBlobsEnvelopeForTest(envelope, {
      category: ErrorCategory.ErrorTransportFailure,
      message: "refresh failed",
    });

    render(LargeBlobs);

    expect(screen.getByText("Large blob inventory may be stale")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Zero User, zero@example.com/ }));
    expect(screen.getByRole("button", { name: "Read blob" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Write" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("renders a present zero-byte blob as an empty payload and reads again only on demand", async () => {
    const user = userEvent.setup();
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: readEnvelope(),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    const readAgain = within(details).getByRole("button", { name: "Read again" });
    expect(within(details).getByText("Decoded payload is empty.")).toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
    expect(within(details).getByText("Present")).toBeInTheDocument();
    expect(controllerMocks.readLargeBlob).not.toHaveBeenCalled();
    await user.click(readAgain);
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledOnce();
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledWith("cafe");
  });

  it("keeps read available for a missing key and shows its typed state", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("beef");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "beef",
      request: {
        sessionId: "session-1",
        credentialIdHex: "beef",
      },
      responseEnvelope: readEnvelope({ missingKey: true }),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-beef") as HTMLElement;
    expect(within(details).getByRole("button", { name: "Read again" })).toBeEnabled();
    expect(within(details).getAllByText("Large-blob key unavailable").length).toBeGreaterThan(0);
    expect(within(details).getAllByText("Key unavailable").length).toBeGreaterThan(0);
  });

  it("distinguishes a missing blob from a present zero-byte blob", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("feed");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "feed",
      request: {
        sessionId: "session-1",
        credentialIdHex: "feed",
      },
      responseEnvelope: missingBlobReadEnvelope(),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-feed") as HTMLElement;
    expect(within(details).getAllByText("Missing").length).toBeGreaterThan(0);
    expect(within(details).queryByText("Decoded payload is empty.")).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
  });

  it("renders valid UTF-8 JSON as structured data", () => {
    const envelope = readEnvelope({
      rawHex: "7b22666f726d6174223a226a736f6e227d",
      decode: {
        requested: true,
        mode: DecodeMode.DecodeModeJSON,
        success: true,
        decodedValue: { format: "json" },
      },
    });
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: envelope,
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getAllByText("Decoded as JSON").length).toBeGreaterThan(0);
    expect(within(details).getByText(/"format": "json"/)).toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
  });

  it("renders the backend UTF-8 interpretation selected for the read", () => {
    const envelope = readEnvelope({
      rawHex: "746578742076696577",
      decode: {
        requested: true,
        mode: DecodeMode.DecodeModeUTF8,
        success: true,
        decodedText: "text view",
      },
    });
    mutableLargeBlobsDecodeMode.set(DecodeMode.DecodeModeUTF8);
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: envelope,
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getByRole("region", { name: "UTF-8 text" })).toHaveTextContent("text view");
    expect(within(details).queryByText("Decoded as JSON")).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
  });

  it("shows raw hex when the requested backend interpretation fails", () => {
    const envelope = readEnvelope({
      rawHex: "fffe",
      decode: {
        requested: true,
        mode: DecodeMode.DecodeModeUTF8,
        success: false,
        failure: "payload is not valid UTF-8",
      },
    });
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: { sessionId: "session-1", credentialIdHex: "cafe" },
      responseEnvelope: envelope,
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getByRole("region", { name: "Raw hex" })).toHaveTextContent("fffe");
    expect(within(details).getByText("Payload interpretation failed")).toBeInTheDocument();
    expect(within(details).getByText("payload is not valid UTF-8")).toBeInTheDocument();
    expect(within(details).queryByText("Decoded as JSON")).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "UTF-8 text" })).not.toBeInTheDocument();
  });

  it("shows cleanup no-op as information with zero preview counts and no confirmation", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationGC, { noop: true });
    const envelope = mutationEnvelope(preview);
    mutableLargeBlobsMutation.set({
      kind: "cleanup",
      phase: "noop",
      previewRequest: { sessionId: "session-1", dryRun: true },
      previewEnvelope: envelope,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("dialog", { name: "Large blob cleanup" });
    expect(within(dialog).getByText("0 matched")).toBeInTheDocument();
    expect(within(dialog).getByText("0 unmatched")).toBeInTheDocument();
    expect(within(dialog).queryByText("Credential ID")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Confirm cleanup" })).not.toBeInTheDocument();
  });

  it("renders a destructive delete preview in an accessible alert dialog", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationDelete, {
      serializedLargeBlobArraySizeAfter: 4,
      blobCountAfter: 0,
    });
    const envelope = mutationEnvelope(preview);
    mutableLargeBlobsMutation.set({
      kind: "delete",
      phase: "review",
      credentialIDHex: "cafe",
      previewRequest: { sessionId: "session-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope: envelope,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm delete" });
    expect(within(dialog).getByText("10 bytes before")).toBeInTheDocument();
    expect(within(dialog).getByText("4 bytes after")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();
  });

  it("renders write review in a regular dialog with explicit confirmation", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationCreate, {
      serializedLargeBlobArraySizeAfter: 24,
      proposedByteCount: 5,
    });
    const envelope = mutationEnvelope(preview);
    mutableLargeBlobsMutation.set({
      kind: "write",
      phase: "review",
      credentialIDHex: "cafe",
      draft: { payload: "hello", encoding: "utf8" },
      previewRequest: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
        payload: "aGVsbG8=",
        dryRun: true,
      },
      previewEnvelope: envelope,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("dialog", { name: "Write large blob" });
    expect(within(dialog).getByRole("button", { name: "Confirm write" })).toBeInTheDocument();
    expect(within(dialog).getByText("5 bytes")).toBeInTheDocument();
  });

  it("renders cleanup review in an accessible destructive alert dialog", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationGC, {
      serializedLargeBlobArraySizeAfter: 4,
      blobCountAfter: 0,
      matchedBlobCount: 0,
      unmatchedBlobCount: 1,
      noop: false,
    });
    const envelope = mutationEnvelope(preview);
    mutableLargeBlobsMutation.set({
      kind: "cleanup",
      phase: "review",
      previewRequest: { sessionId: "session-1", dryRun: true },
      previewEnvelope: envelope,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm cleanup" });
    expect(within(dialog).getByText("1 unmatched")).toBeInTheDocument();
    expect(within(dialog).queryByText("Credential ID")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm cleanup" })).toBeInTheDocument();
  });

  it("shows capacity metrics from an error preview without enabling confirmation", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationCreate, {
      serializedLargeBlobArraySizeBefore: 10,
      serializedLargeBlobArraySizeAfter: 1200,
      serializedLargeBlobArrayLimit: 0,
    });
    const envelope = {
      ...mutationEnvelope(preview),
      error: { category: ErrorCategory.ErrorInvalidState, message: "capacity exceeded" },
    } as LargeBlobMutationEnvelope;
    mutableLargeBlobsMutation.set({
      kind: "write",
      phase: "error",
      credentialIDHex: "cafe",
      draft: { payload: "hello", encoding: "utf8" },
      failedPhase: "previewing",
      previewRequest: {
        sessionId: "session-1",
        credentialIdHex: "cafe",
        payload: "aGVsbG8=",
        dryRun: true,
      },
      previewEnvelope: null,
      responseEnvelope: envelope,
      runtimeError: null,
      failureReason: "response-error",
      validationError: null,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("dialog", { name: "Write large blob" });
    expect(within(dialog).getByText("10 bytes before")).toBeInTheDocument();
    expect(within(dialog).getByText("1200 bytes after")).toBeInTheDocument();
    expect(within(dialog).getByText("Array limit: 0 bytes")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Confirm write" })).not.toBeInTheDocument();
  });
});
