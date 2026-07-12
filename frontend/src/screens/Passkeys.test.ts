import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { get } from "svelte/store";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind, VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";
import type {
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/github.com/go-ctap/kit/service";

import {
  emptyPasskeysInventoryState,
  failPasskeysInventoryLoadAtRuntime,
  passkeysInventoryState as mutablePasskeysInventoryState,
  passkeysMutation as mutablePasskeysMutation,
  passkeysVerificationFlow as mutablePasskeysVerificationFlow,
} from "$lib/features/passkeys/state";
import { setAppLocale } from "$lib/i18n";
import { resetAppStateForTest, seedPasskeysEnvelopeForTest, seedSelectionForTest } from "$lib/store-test-utils";

import Passkeys from "./Passkeys.svelte";

const controllerMocks = vi.hoisted(() => ({
  loadPasskeys: vi.fn(() => Promise.resolve()),
  reloadPasskeys: vi.fn(() => Promise.resolve(true)),
}));
const toastMocks = vi.hoisted(() => ({ success: vi.fn() }));
const clipboardSetText = vi.spyOn(Clipboard, "SetText");

vi.mock("$lib/controller", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/controller")>()),
  loadPasskeys: controllerMocks.loadPasskeys,
  reloadPasskeys: controllerMocks.reloadPasskeys,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

function credentialsEnvelope(): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    sessionId: "session-1",
    kind: OperationKind.OperationListCredentials,
    result: {
      report: {
        device: {
          deviceId: "token-1",
          stableId: true,
        },
        support: {
          credentialManagement: true,
          previewOnly: false,
          readOnlyPermission: false,
        },
        summary: {
          existingResidentCredentialsCount: 1,
          maxPossibleRemainingResidentCredentialsCount: 4,
          totalRPs: 1,
          totalCredentials: 1,
        },
        groups: [{
          rpID: "example.com",
          rpName: "Example",
          rpIDHashHex: "abcd",
          credentials: [{
            credentialIDHex: "cafe",
            credentialType: "public-key",
            userIDHex: "01",
            userName: "user@example.com",
            displayName: "Example User",
            credProtect: 2,
          }],
        }],
      },
    },
  } as CredentialsEnvelope;
}

function mixedRelyingPartyEnvelope(): CredentialsEnvelope {
  const envelope = credentialsEnvelope();
  envelope.result!.report.summary.existingResidentCredentialsCount = 3;
  envelope.result!.report.summary.totalRPs = 2;
  envelope.result!.report.summary.totalCredentials = 3;
  envelope.result!.report.groups = [
    {
      rpID: "solo.example",
      rpName: "Solo",
      rpIDHashHex: "aaaa",
      credentials: [{
        credentialIDHex: "a1",
        userIDHex: "01",
        userName: "solo@example.com",
        displayName: "Solo User",
        credProtect: 2,
      }],
    },
    {
      rpID: "team.example",
      rpName: "Team",
      rpIDHashHex: "bbbb",
      credentials: [
        {
          credentialIDHex: "b1",
          userIDHex: "02",
          userName: "alice@team.example",
          displayName: "Alice",
          credProtect: 1,
        },
        {
          credentialIDHex: "b2",
          userIDHex: "03",
          userName: "bob@team.example",
          displayName: "Bob",
          credProtect: 3,
        },
      ],
    },
  ];
  return envelope;
}

describe("Passkeys", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.loadPasskeys.mockClear();
    controllerMocks.reloadPasskeys.mockClear();
    clipboardSetText.mockReset();
    clipboardSetText.mockResolvedValue();
    toastMocks.success.mockClear();
    resetAppStateForTest();
  });

  afterEach(async () => {
    cleanup();
    await tick();
    document.body.style.pointerEvents = "";
  });

  it("does not own passkeys autoload lifecycle", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });

    render(Passkeys);

    expect(controllerMocks.loadPasskeys).not.toHaveBeenCalled();
    expect(screen.getByText("Passkeys not loaded")).toBeInTheDocument();
  });

  it("opens credential details immediately after the selected table row", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    const credential = screen.getByRole("button", { name: /Example User, user@example.com/ });
    const record = credential.closest("tr");
    expect(record).not.toBeNull();
    expect(credential).toHaveAttribute("aria-expanded", "false");
    expect(credential).toHaveAttribute("aria-controls", "passkey-row-details-cafe");
    await user.click(credential);

    const details = record?.nextElementSibling as HTMLElement;
    expect(details).toHaveAttribute("id", "passkey-row-details-cafe");
    expect(details.closest("table")).toBe(screen.getByRole("table", { name: "Resident credentials" }));
    expect(within(screen.getByRole("table", { name: "Resident credentials" })).getAllByRole("row")).toHaveLength(3);
    expect(within(details).getByText("public-key")).toBeInTheDocument();
    expect(within(details).getAllByText("01").length).toBeGreaterThan(0);
    const copyJson = within(details).getByRole("button", { name: "Copy JSON" });
    expect(copyJson).toBeInTheDocument();
    await user.click(copyJson);
    await waitFor(() => expect(clipboardSetText).toHaveBeenCalledOnce());
    await waitFor(() => expect(toastMocks.success).toHaveBeenCalledWith("JSON copied"));
    expect(credential).toHaveAttribute("aria-expanded", "true");
    expect(record).toHaveAttribute("aria-selected", "true");
  });

  it("collapses inline credential details when the selected row is clicked again", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    const credential = screen.getByRole("button", { name: /Example User, user@example.com/ });
    const record = credential.closest("tr") as HTMLElement;

    await user.click(credential);
    const details = record.nextElementSibling as HTMLElement;
    expect(within(details).getByText("public-key")).toBeInTheDocument();
    await user.click(credential);
    await tick();

    expect(screen.queryByText("public-key")).not.toBeInTheDocument();
    expect(credential).toHaveAttribute("aria-expanded", "false");
    expect(record).toHaveAttribute("aria-selected", "false");
  });

  it("supports keyboard selection through semantic credential buttons", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    const credential = screen.getByRole("button", { name: /Example User, user@example.com/ });
    credential.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByText("public-key")).toBeInTheDocument();
  });

  it("hides inline details with a filtered row and restores them when filters are cleared", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByText("public-key")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search RP, user, credential ID, or hash"), "does-not-exist");
    await tick();

    expect(screen.getByText("No matching passkeys")).toBeInTheDocument();
    expect(screen.queryByText("public-key")).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    expect(screen.getByText("public-key")).toBeInTheDocument();
  });

  it("uses a compact UV badge without dropping the full credProtect explanation", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    const compact = screen.getByText("UV 2");
    expect(compact).toHaveAttribute("title", "Level 2 · UV optional with credential list");
    expect(screen.queryByText("Level 2 · UV optional with credential list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByText("Level 2 · UV optional with credential list")).toBeInTheDocument();
  });

  it("does not render a duplicate resident-credentials card heading", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    expect(screen.queryByRole("heading", { name: "Resident credentials" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Resident credentials")).toBeInTheDocument();
  });

  it("presents inventory as one fact and capacity as remaining space", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    const inventory = screen.getByRole("region", { name: "Credential inventory" });
    expect(within(inventory).getByText("1 credentials")).toBeInTheDocument();
    expect(within(inventory).getByText("1 relying parties")).toBeInTheDocument();

    const capacity = screen.getByRole("region", { name: "Remaining resident capacity" });
    expect(within(capacity).getByText("4")).toBeInTheDocument();
    expect(within(capacity).queryByText("1 stored · up to 4 remaining")).not.toBeInTheDocument();
  });

  it("renders every passkey as a flat table row without RP collapsibles", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(mixedRelyingPartyEnvelope());

    render(Passkeys);

    const table = screen.getByRole("table", { name: "Resident credentials" });
    expect(within(table).getByRole("columnheader", { name: "RP name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "User name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Credential ID" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "UV" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(4);

    expect(screen.getByRole("button", { name: /Solo User, solo@example\.com, Solo/ })).toBeInTheDocument();
    const alice = screen.getByRole("button", { name: /Alice, alice@team\.example/ });
    const bob = screen.getByRole("button", { name: /Bob, bob@team\.example/ });
    expect(alice).toHaveAttribute("aria-expanded", "false");
    expect(bob).toBeInTheDocument();
    expect(screen.queryByText("2 credentials")).not.toBeInTheDocument();

    const aliceRow = alice.closest("tr") as HTMLElement;
    await user.click(alice);
    expect(alice).toHaveAttribute("aria-expanded", "true");
    expect(aliceRow).toHaveAttribute("aria-selected", "true");
    expect(aliceRow.nextElementSibling).toHaveAttribute("id", "passkey-row-details-b1");
    expect(within(table).getAllByRole("row")).toHaveLength(5);
    expect(bob).toBeInTheDocument();

    await user.click(alice);

    expect(alice).toHaveAttribute("aria-expanded", "false");
    expect(aliceRow).toHaveAttribute("aria-selected", "false");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(bob).toBeInTheDocument();
  });

  it("confirms a successful forced reload immediately", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    await user.click(screen.getByRole("button", { name: "Reload credentials" }));

    expect(controllerMocks.reloadPasskeys).toHaveBeenCalledOnce();
    expect(toastMocks.success).toHaveBeenCalledWith("Credentials reloaded from the authenticator");
  });

  it("opens the typed update dialog from the inspector", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("dialog", { name: "Edit credential user" })).toBeInTheDocument();
    expect(screen.getByLabelText("User ID hex")).toHaveValue("01");
    expect(screen.getByLabelText("Display name")).toHaveValue("Example User");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("keeps exactly one verification mode selected when the active mode is clicked again", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    const auto = screen.getByRole("radio", { name: "Auto" });
    const pin = screen.getByRole("radio", { name: "PIN" });

    expect(auto).toHaveAttribute("aria-checked", "true");
    await user.click(auto);
    await tick();
    expect(auto).toHaveAttribute("aria-checked", "true");
    expect(get(mutablePasskeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowDefault);

    await user.click(pin);
    expect(pin).toHaveAttribute("aria-checked", "true");
    expect(get(mutablePasskeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
    await user.click(pin);
    await tick();
    expect(pin).toHaveAttribute("aria-checked", "true");
    expect(get(mutablePasskeysVerificationFlow)).toBe(VerificationFlow.VerificationFlowPIN);
  });

  it("renders a cold loading skeleton with the final credential-table structure", () => {
    seedSelectionForTest("token-1", null, {
      state: "running",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    mutablePasskeysInventoryState.set({
      ...emptyPasskeysInventoryState(),
      phase: "loading",
    });

    render(Passkeys);

    const table = screen.getByRole("table", { name: "Waiting for authenticator response." });
    expect(within(table).getByRole("columnheader", { name: "RP name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "User name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Credential ID" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "UV" })).toBeInTheDocument();
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    for (const row of rows.slice(1)) {
      expect(within(row).getAllByRole("cell")).toHaveLength(4);
    }
    expect(screen.queryByText("No passkeys found")).not.toBeInTheDocument();
  });

  it("keeps stale rows visible and disables their mutations until refresh succeeds", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());
    failPasskeysInventoryLoadAtRuntime({ message: "refresh failed" });

    render(Passkeys);

    expect(screen.getByText("Inventory may be stale")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("renders unsupported credential management as a non-retry state", () => {
    const unsupported = credentialsEnvelope();
    unsupported.result!.report.support.credentialManagement = false;
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(unsupported);

    render(Passkeys);

    expect(screen.getByText("Credential management unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("distinguishes an authenticator's real empty inventory", () => {
    const empty = credentialsEnvelope();
    empty.result!.report.groups = [];
    empty.result!.report.summary.existingResidentCredentialsCount = 0;
    empty.result!.report.summary.totalRPs = 0;
    empty.result!.report.summary.totalCredentials = 0;
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(empty);

    render(Passkeys);

    expect(screen.getByText("No passkeys found")).toBeInTheDocument();
    expect(screen.queryByText("No matching passkeys")).not.toBeInTheDocument();
  });

  it("renders typed localized update preview warnings in an accessible dialog", async () => {
    const user = userEvent.setup();
    const envelope = credentialsEnvelope();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(envelope);
    const previewEnvelope = {
      operationId: "update-preview-1",
      sessionId: "session-1",
      kind: OperationKind.OperationUpdateCredentialUser,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.com",
          current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
          proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
          warnings: [{
            severity: "warning",
            code: "credential.update_user.mutation",
            message: "toolkit fallback",
          }],
        },
        result: null,
      },
    } as CredentialUpdateEnvelope;
    mutablePasskeysMutation.set({
      kind: "update",
      phase: "review",
      credentialIDHex: "cafe",
      original: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
      form: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
      previewRequest: { sessionId: "session-1", credentialIdHex: "cafe", name: "updated@example.com", nameProvided: true, dryRun: true },
      previewEnvelope,
      responseEnvelope: previewEnvelope,
    });

    render(Passkeys);

    expect(screen.getByRole("dialog", { name: "Edit credential user" })).toBeInTheDocument();
    expect(screen.getByText("This changes the user information stored with the resident credential.")).toBeInTheDocument();
    expect(screen.getByText("Current value")).toBeInTheDocument();
    expect(screen.getByText("Proposed value")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("renders the typed delete preview in an accessible alert dialog", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());
    const previewEnvelope = {
      operationId: "delete-preview-1",
      sessionId: "session-1",
      kind: OperationKind.OperationDeleteCredential,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.com",
          rpName: "Example",
          userIDHex: "01",
          userName: "user@example.com",
          displayName: "Example User",
          warnings: [{
            severity: "destructive",
            code: "credential.delete.destructive",
            message: "toolkit fallback",
          }],
        },
        result: null,
      },
    } as CredentialDeleteEnvelope;
    mutablePasskeysMutation.set({
      kind: "delete",
      phase: "review",
      credentialIDHex: "cafe",
      previewRequest: { sessionId: "session-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope,
      responseEnvelope: previewEnvelope,
    });

    render(Passkeys);

    expect(screen.getByRole("alertdialog", { name: "Confirm delete" })).toBeInTheDocument();
    expect(screen.getByText("Deleting this resident credential is destructive and cannot be undone.")).toBeInTheDocument();
    expect(screen.getAllByText("cafe").length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("shows a regular error dialog instead of delete confirmation when dry-run fails without a preview", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());
    const errorEnvelope = {
      operationId: "delete-preview-1",
      sessionId: "session-1",
      kind: OperationKind.OperationDeleteCredential,
      error: { category: "transport-failure", message: "preview failed" },
    } as CredentialDeleteEnvelope;
    mutablePasskeysMutation.set({
      kind: "delete",
      phase: "error",
      credentialIDHex: "cafe",
      failedPhase: "previewing",
      previewRequest: { sessionId: "session-1", credentialIdHex: "cafe", dryRun: true },
      previewEnvelope: null,
      responseEnvelope: errorEnvelope,
      runtimeError: null,
      failureReason: "response-error",
    });

    render(Passkeys);

    expect(screen.queryByRole("alertdialog", { name: "Confirm delete" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Credential delete preview" })).toBeInTheDocument();
    expect(screen.getByText("preview failed")).toBeInTheDocument();
  });
});
