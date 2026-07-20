import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { get } from "svelte/store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
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
} from "../../bindings/fidobench/service";

import {
  emptyLargeBlobsInventoryState,
  failLargeBlobsInventoryLoadWithResponse,
  largeBlobsDecodeMode as mutableLargeBlobsDecodeMode,
  largeBlobsInventoryState as mutableLargeBlobsInventoryState,
  largeBlobsMutation as mutableLargeBlobsMutation,
  largeBlobsReadState as mutableLargeBlobsReadState,
  largeBlobsSelectedCredentialID as mutableLargeBlobsSelectedCredentialID,
} from "$lib/features/largeblobs/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";
import {
  resetAppStateForTest,
  seedLargeBlobsEnvelopeForTest,
  seedSelectionForTest,
} from "$lib/store-test-utils";

import LargeBlobs from "./LargeBlobs.svelte";

const controllerMocks = vi.hoisted(() => ({
  readLargeBlob: vi.fn((_credentialIDHex: string) => Promise.resolve(true)),
  reloadLargeBlobs: vi.fn(() => Promise.resolve(true)),
  selectLargeBlobCredential: vi.fn((credentialIDHex: string) => {
    mutableLargeBlobsSelectedCredentialID.set(credentialIDHex);
    return credentialIDHex ? controllerMocks.readLargeBlob(credentialIDHex) : Promise.resolve(true);
  }),
  setLargeBlobsDecodeMode: vi.fn((mode: DecodeMode) => {
    mutableLargeBlobsDecodeMode.set(mode);
    const credentialIDHex = get(mutableLargeBlobsSelectedCredentialID);
    return credentialIDHex ? controllerMocks.readLargeBlob(credentialIDHex) : Promise.resolve(true);
  }),
}));
const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("$lib/features/largeblobs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/features/largeblobs")>()),
  readLargeBlob: controllerMocks.readLargeBlob,
  reloadLargeBlobs: controllerMocks.reloadLargeBlobs,
  selectLargeBlobCredential: controllerMocks.selectLargeBlobCredential,
  setLargeBlobsDecodeMode: controllerMocks.setLargeBlobsDecodeMode,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

function listEnvelope(): LargeBlobListEnvelope {
  return {
    operationId: "large-blob-list-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListLargeBlobs,
    result: {
      device: { fingerprint: "token-1" },
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
    selectionId: "authenticator-1",
    kind: OperationKind.ReadLargeBlob,
    result: {
      device: { fingerprint: "token-1" },
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
  } as LargeBlobReadEnvelope;
}

function missingBlobReadEnvelope(): LargeBlobReadEnvelope {
  const envelope = readEnvelope();
  envelope.result!.target.credentialIDHex = "feed";
  envelope.result!.target.rp.id = "empty.example";
  envelope.result!.array.blobPresent = false;
  envelope.result!.array.blobState = BlobState.BlobStateMissing;
  envelope.result!.blobPresent = false;
  return envelope;
}

function mutationPreview(operation: MutationOperation, overrides: Partial<MutationPreview> = {}): MutationPreview {
  return {
    operation,
    device: { fingerprint: "token-1" },
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
    selectionId: "authenticator-1",
    kind: preview.operation === MutationOperation.MutationGC
      ? OperationKind.GarbageCollectLargeBlobs
      : preview.operation === MutationOperation.MutationDelete
        ? OperationKind.DeleteLargeBlob
        : OperationKind.WriteLargeBlob,
    result: { preview, result: null },
  } as LargeBlobMutationEnvelope;
}

describe("LargeBlobs", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.readLargeBlob.mockClear();
    controllerMocks.reloadLargeBlobs.mockClear();
    controllerMocks.selectLargeBlobCredential.mockClear();
    controllerMocks.setLargeBlobsDecodeMode.mockClear();
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
    resetAppStateForTest();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
  });

  afterEach(async () => {
    cleanup();
    await tick();
    document.body.style.pointerEvents = "";
  });

  it("distinguishes not-loaded, loading, unsupported, and empty states", () => {
    const { unmount } = render(LargeBlobs);
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
    unsupported.result!.support.largeBlobs = false;
    seedLargeBlobsEnvelopeForTest(unsupported);
    const unsupportedView = render(LargeBlobs);
    expect(screen.getByText("Large blob management unavailable")).toBeInTheDocument();
    unsupportedView.unmount();

    const empty = listEnvelope();
    empty.result!.credentials = [];
    seedLargeBlobsEnvelopeForTest(empty);
    render(LargeBlobs);
    expect(screen.getByText("No resident credentials found")).toBeInTheDocument();
  });

  it("keeps a typed inventory error out of the empty state", () => {
    failLargeBlobsInventoryLoadWithResponse({
      operationId: "large-blob-list-error",
      selectionId: "authenticator-1",
      kind: OperationKind.ListLargeBlobs,
      error: failureForCode(Code.CodePINInvalid),
    } as LargeBlobListEnvelope);

    render(LargeBlobs);

    expect(screen.getByText("Load credentials and the serialized large-blob array from the authenticator.")).toBeInTheDocument();
    expect(screen.queryByText("The PIN is invalid.")).not.toBeInTheDocument();
  });

  it("places cleanup in the overview footer with the passkeys verification pattern", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());

    render(LargeBlobs);

    const cleanupAction = screen.getByRole("button", { name: "Cleanup" });
    expect(cleanupAction.closest('[data-slot="card-footer"]')).toBeInTheDocument();

    const verification = screen.getByRole("group", { name: "User verification" });
    expect(within(verification).getByRole("radio", { name: "Auto" })).toBeInTheDocument();
    expect(within(verification).getByRole("radio", { name: "PIN" })).toBeInTheDocument();
  });

  it("does not turn an unsupported verification flow into unsupported large blobs", () => {
    failLargeBlobsInventoryLoadWithResponse({
      operationId: "verification-flow-error",
      selectionId: "authenticator-1",
      kind: OperationKind.ListLargeBlobs,
      error: failureForCode(Code.CodeVerificationFlowUnsupported),
    } as LargeBlobListEnvelope);

    render(LargeBlobs);

    expect(screen.getByText("Load credentials and the serialized large-blob array from the authenticator.")).toBeInTheDocument();
    expect(screen.queryByText("The requested verification flow is not supported.")).not.toBeInTheDocument();
    expect(screen.queryByText("Large blob management unavailable")).not.toBeInTheDocument();
  });

  it("reads the default format as soon as credential details open", async () => {
    const user = userEvent.setup();
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    render(LargeBlobs);

    const table = screen.getByRole("table", { name: "Blob credentials" });
    expect(within(table).getByRole("columnheader", { name: "RP name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "User name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Payload" })).toBeInTheDocument();

    const disclosure = screen.getByRole("button", { name: /Zero User, zero@example.com/ });
    const row = disclosure.closest("tr") as HTMLTableRowElement;
    expect(disclosure.closest("td")).toBe(row.cells[0]);
    expect(within(row.cells[1]).queryByRole("button")).not.toBeInTheDocument();
    expect(disclosure).toHaveAttribute("aria-controls", "large-blob-row-details-cafe");
    disclosure.focus();
    await user.keyboard("{Enter}");

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(row).toHaveAttribute("aria-selected", "true");
    const details = row.nextElementSibling as HTMLElement;
    expect(details).toHaveAttribute("id", "large-blob-row-details-cafe");
    expect(details.closest("table")).toBe(table);
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(controllerMocks.selectLargeBlobCredential).toHaveBeenCalledWith("cafe");
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledOnce();
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledWith("cafe");
    expect(within(details).queryByRole("button", { name: "Read large blob" })).not.toBeInTheDocument();

    await user.click(within(details).getByRole("radio", { name: "CBOR" }));
    expect(controllerMocks.setLargeBlobsDecodeMode).toHaveBeenCalledWith(DecodeMode.DecodeModeCBOR);
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledTimes(2);
    expect(controllerMocks.readLargeBlob).toHaveBeenLastCalledWith("cafe");
  });

  it("keeps stale rows and their actions available while showing the warning", async () => {
    const user = userEvent.setup();
    const envelope = listEnvelope();
    seedLargeBlobsEnvelopeForTest(envelope, failureForCode(Code.CodeTransportFailure));

    render(LargeBlobs);

    expect(screen.getByText("Large blob inventory could not be refreshed")).toBeInTheDocument();
    expect(screen.getByText(/The last successfully loaded data remains visible\. Reload large blobs to try again\./)).toBeInTheDocument();
    expect(screen.queryByText(/Communication with the authenticator failed\./)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Zero User, zero@example.com/ }));
    expect(controllerMocks.readLargeBlob).toHaveBeenCalledWith("cafe");
    expect(screen.queryByRole("button", { name: "Read large blob" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("renders a present zero-byte result without a manual Read action", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: {
        selectionId: "authenticator-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: readEnvelope(),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getByText("Decoded payload is empty.")).toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
    expect(within(details).getByText("Present")).toBeInTheDocument();
    expect(controllerMocks.readLargeBlob).not.toHaveBeenCalled();
    expect(within(details).queryByRole("button", { name: "Read large blob" })).not.toBeInTheDocument();
  });

  it("shows the typed state for a missing key without a manual Read action", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("beef");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "beef",
      request: {
        selectionId: "authenticator-1",
        credentialIdHex: "beef",
      },
      responseEnvelope: readEnvelope({ missingKey: true }),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-beef") as HTMLElement;
    expect(within(details).queryByRole("button", { name: "Read large blob" })).not.toBeInTheDocument();
    expect(within(details).getAllByText("Large-blob key unavailable").length).toBeGreaterThan(0);
    expect(within(details).getAllByText("Key unavailable").length).toBeGreaterThan(0);
  });

  it.each([Code.CodeOperationCanceled, Code.CodeTransportFailure])(
    "does not restore a manual Read action after %s",
    (code) => {
      seedLargeBlobsEnvelopeForTest(listEnvelope());
      mutableLargeBlobsSelectedCredentialID.set("cafe");
      mutableLargeBlobsReadState.set({
        phase: "error",
        credentialIDHex: "cafe",
        request: { selectionId: "authenticator-1", credentialIdHex: "cafe" },
        responseEnvelope: {
          operationId: "large-blob-read-error",
          selectionId: "authenticator-1",
          kind: OperationKind.ReadLargeBlob,
          error: failureForCode(code),
        } as LargeBlobReadEnvelope,
        runtimeError: null,
        failureReason: "response-error",
      });

      render(LargeBlobs);

      const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
      expect(within(details).queryByRole("button", { name: "Read large blob" })).not.toBeInTheDocument();
    },
  );

  it("distinguishes a missing blob from a present zero-byte blob", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("feed");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "feed",
      request: {
        selectionId: "authenticator-1",
        credentialIdHex: "feed",
      },
      responseEnvelope: missingBlobReadEnvelope(),
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-feed") as HTMLElement;
    expect(within(details).getAllByText("Missing").length).toBeGreaterThan(0);
    expect(within(details).getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(within(details).queryByText("Decoded payload is empty.")).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "UTF-8 text" })).not.toBeInTheDocument();
  });

  it("renders valid UTF-8 JSON as structured data", async () => {
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
        selectionId: "authenticator-1",
        credentialIdHex: "cafe",
      },
      responseEnvelope: envelope,
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getAllByText("Decoded as JSON").length).toBeGreaterThan(0);
    const json = within(details).getByRole("region", { name: "Decoded as JSON" });
    await waitFor(() => expect(json.querySelector("pre.shiki")).toBeInTheDocument());
    expect(json).toHaveTextContent(/"format": "json"/);
    expect(within(details).queryByRole("region", { name: "Raw hex" })).not.toBeInTheDocument();
  });

  it("renders the selected UTF-8 interpretation", () => {
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
        selectionId: "authenticator-1",
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

  it("opens an existing blob as an edit with its current UTF-8 value", async () => {
    const user = userEvent.setup();
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
      request: { selectionId: "authenticator-1", credentialIdHex: "cafe" },
      responseEnvelope: envelope,
    });
    render(LargeBlobs);

    await user.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit large blob" });
    expect(within(dialog).getByRole("textbox", { name: "Payload" })).toHaveValue("text view");
    expect(within(dialog).getByRole("radio", { name: "UTF-8 text" })).toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Preview changes" })).toBeEnabled();

    mutableLargeBlobsMutation.set({
      kind: "write",
      phase: "review",
      credentialIDHex: "cafe",
      draft: { payload: "text view", encoding: "utf8" },
      previewRequest: {
        selectionId: "authenticator-1",
        credentialIdHex: "cafe",
        payload: "dGV4dCB2aWV3",
        dryRun: true,
      },
      previewEnvelope: mutationEnvelope(mutationPreview(MutationOperation.MutationReplace)),
    });
    await tick();

    expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  it("shows only raw hex when automatic interpretation fails", () => {
    const envelope = readEnvelope({
      rawHex: "fffe",
      decode: {
        requested: true,
        mode: DecodeMode.DecodeModeUTF8,
        success: false,
        failure: failureForCode(Code.CodeLargeBlobUTF8Invalid),
      },
    });
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    mutableLargeBlobsSelectedCredentialID.set("cafe");
    mutableLargeBlobsReadState.set({
      phase: "ready",
      credentialIDHex: "cafe",
      request: { selectionId: "authenticator-1", credentialIdHex: "cafe" },
      responseEnvelope: envelope,
    });

    render(LargeBlobs);

    const details = document.getElementById("large-blob-row-details-cafe") as HTMLElement;
    expect(within(details).getByRole("region", { name: "Raw hex" })).toHaveTextContent("fffe");
    expect(within(details).queryByText("Decoded as JSON")).not.toBeInTheDocument();
    expect(within(details).queryByRole("region", { name: "UTF-8 text" })).not.toBeInTheDocument();
  });

  it("shows delete review as an alert dialog and hides it during execution", async () => {
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
      previewRequest: { selectionId: "authenticator-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope: envelope,
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm delete" });
    expect(within(dialog).getByText("10 bytes before")).toBeInTheDocument();
    expect(within(dialog).getByText("4 bytes after")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();

    mutableLargeBlobsMutation.set({
      kind: "delete",
      phase: "executing",
      credentialIDHex: "cafe",
      previewRequest: { selectionId: "authenticator-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope: envelope,
    });
    await tick();
    expect(screen.queryByRole("alertdialog", { name: "Confirm delete" })).not.toBeInTheDocument();
  });

  it("hides write during requests and restores its action after an execution error", async () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationCreate, {
      serializedLargeBlobArraySizeAfter: 24,
      proposedByteCount: 5,
    });
    const envelope = mutationEnvelope(preview);
    const previewRequest = {
      selectionId: "authenticator-1",
      credentialIdHex: "cafe",
      payload: "aGVsbG8=",
      dryRun: true,
    };
    const mutation = {
      kind: "write",
      credentialIDHex: "cafe",
      draft: { payload: "hello", encoding: "utf8" },
      previewRequest,
      previewEnvelope: envelope,
    } as const;
    mutableLargeBlobsMutation.set({
      kind: "write",
      phase: "previewing",
      credentialIDHex: "cafe",
      draft: mutation.draft,
      previewRequest,
    });

    render(LargeBlobs);

    expect(screen.queryByRole("dialog", { name: "Write large blob" })).not.toBeInTheDocument();

    mutableLargeBlobsMutation.set({ ...mutation, phase: "review" });
    await tick();

    const dialog = screen.getByRole("dialog", { name: "Write large blob" });
    expect(within(dialog).getByRole("button", { name: "Confirm write" })).toBeInTheDocument();
    expect(within(dialog).getByText("5 bytes")).toBeInTheDocument();
    expect(within(dialog).queryByText("Preview ready")).not.toBeInTheDocument();

    mutableLargeBlobsMutation.set({ ...mutation, phase: "executing" });
    await tick();
    expect(screen.queryByRole("dialog", { name: "Write large blob" })).not.toBeInTheDocument();

    mutableLargeBlobsMutation.set({
      ...mutation,
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: {
        operationId: "write-error-1",
        selectionId: "authenticator-1",
        kind: OperationKind.WriteLargeBlob,
        error: failureForCode(Code.CodeTransportFailure),
      } as LargeBlobMutationEnvelope,
      runtimeError: null,
      failureReason: "response-error",
      validationError: null,
    });
    await tick();
    const reopenedDialog = screen.getByRole("dialog", { name: "Write large blob" });
    expect(within(reopenedDialog).getByText("Communication with the authenticator failed.")).toBeInTheDocument();
    expect(within(reopenedDialog).getByRole("button", { name: "Confirm write" })).toBeEnabled();
    expect(within(reopenedDialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("hides cleanup during execution and restores its action after an error", async () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationGC, {
      serializedLargeBlobArraySizeAfter: 4,
      blobCountAfter: 0,
      matchedBlobCount: 0,
      unmatchedBlobCount: 1,
      noop: false,
    });
    const envelope = mutationEnvelope(preview);
    const previewRequest = { selectionId: "authenticator-1", dryRun: true };
    const mutation = {
      kind: "cleanup",
      previewRequest,
      previewEnvelope: envelope,
    } as const;
    mutableLargeBlobsMutation.set({ ...mutation, phase: "review" });

    render(LargeBlobs);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm cleanup" });
    expect(within(dialog).getByText("1 unmatched")).toBeInTheDocument();
    expect(within(dialog).queryByText("Credential ID")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm cleanup" })).toBeInTheDocument();

    mutableLargeBlobsMutation.set({ ...mutation, phase: "executing" });
    await tick();
    expect(screen.queryByRole("alertdialog", { name: "Confirm cleanup" })).not.toBeInTheDocument();

    mutableLargeBlobsMutation.set({
      ...mutation,
      phase: "error",
      failedPhase: "executing",
      responseEnvelope: {
        operationId: "cleanup-error-1",
        selectionId: "authenticator-1",
        kind: OperationKind.GarbageCollectLargeBlobs,
        error: failureForCode(Code.CodeTransportFailure),
      } as LargeBlobMutationEnvelope,
      runtimeError: null,
      failureReason: "response-error",
    });
    await tick();
    const reopenedDialog = screen.getByRole("alertdialog", { name: "Confirm cleanup" });
    expect(within(reopenedDialog).getByText("Communication with the authenticator failed.")).toBeInTheDocument();
    expect(within(reopenedDialog).getByRole("button", { name: "Confirm cleanup" })).toBeEnabled();
    expect(within(reopenedDialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("keeps the delete confirmation action after any execution error", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const previewEnvelope = mutationEnvelope(mutationPreview(MutationOperation.MutationDelete));
    const errorEnvelope = {
      operationId: "large-blob-delete-1",
      selectionId: "authenticator-1",
      kind: OperationKind.DeleteLargeBlob,
      error: failureForCode(Code.CodeTransportFailure),
    } as LargeBlobMutationEnvelope;
    mutableLargeBlobsMutation.set({
      kind: "delete",
      phase: "error",
      credentialIDHex: "cafe",
      failedPhase: "executing",
      previewRequest: { selectionId: "authenticator-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope,
      responseEnvelope: errorEnvelope,
      runtimeError: null,
      failureReason: "response-error",
    });

    render(LargeBlobs);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm delete" });
    expect(within(dialog).getByText("Communication with the authenticator failed.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm delete" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("keeps a capacity preview error editable without turning its action into retry", () => {
    seedLargeBlobsEnvelopeForTest(listEnvelope());
    const preview = mutationPreview(MutationOperation.MutationCreate, {
      serializedLargeBlobArraySizeBefore: 10,
      serializedLargeBlobArraySizeAfter: 1200,
      serializedLargeBlobArrayLimit: 0,
    });
    const envelope = {
      ...mutationEnvelope(preview),
      error: failureForCode(Code.CodeLargeBlobArrayTooLarge),
    } as LargeBlobMutationEnvelope;
    mutableLargeBlobsMutation.set({
      kind: "write",
      phase: "error",
      credentialIDHex: "cafe",
      draft: { payload: "hello", encoding: "utf8" },
      failedPhase: "previewing",
      previewRequest: {
        selectionId: "authenticator-1",
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
    expect(within(dialog).getByRole("textbox", { name: "Payload" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Preview write" })).toBeEnabled();
    expect(within(dialog).queryByRole("button", { name: "Confirm write" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
