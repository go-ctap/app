import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { get } from "svelte/store";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/telesma-app/kit";
import { Kind as OperationKind } from "../../bindings/github.com/telesma-app/kit/model/operation";
import type { CredentialTarget } from "../../bindings/github.com/telesma-app/kit/model/credentials";
import { Code } from "../../bindings/github.com/telesma-app/kit/model/failure";
import type {
  CredentialDeleteEnvelope,
  CredentialUpdateEnvelope,
  CredentialsEnvelope,
} from "../../bindings/telesma/service";

import {
  failPasskeysInventoryLoadAtRuntime,
  failPasskeysInventoryLoadWithResponse,
  passkeysMutation as mutablePasskeysMutation,
  passkeysVerificationFlow as mutablePasskeysVerificationFlow,
} from "$lib/features/passkeys/state";
import { setAppLocale } from "$lib/i18n";
import { setAdvancedMode } from "$lib/preferences";
import { failureForCode } from "$lib/test-support/failure";
import {
  resetAppStateForTest,
  seedPasskeysEnvelopeForTest,
  seedSelectionForTest,
} from "$lib/test-support/store-utils";
import { testHIDDevice } from "../test/device.js";

import Passkeys from "./Passkeys.svelte";

const controllerMocks = vi.hoisted(() => ({
  reloadPasskeys: vi.fn(() => Promise.resolve(true)),
}));

const workbenchMocks = vi.hoisted(() => ({
  navigateToScreen: vi.fn(() => Promise.resolve()),
}));

const toastMocks = vi.hoisted(() => ({ success: vi.fn() }));

const clipboardSetText = vi.spyOn(Clipboard, "SetText");

vi.mock("$lib/features/passkeys", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/features/passkeys")>()),
  reloadPasskeys: controllerMocks.reloadPasskeys,
}));
vi.mock("$lib/features/workbench", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/features/workbench")>()),
  navigateToScreen: workbenchMocks.navigateToScreen,
}));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

function credentialsEnvelope(readOnlyPermission = false): CredentialsEnvelope {
  return {
    operationId: "operation-1",
    selectionId: "authenticator-1",
    kind: OperationKind.ListCredentials,
    result: {
      device: testHIDDevice(),
      support: {
        credentialManagement: true,
        previewOnly: false,
        readOnlyPermission,
      },
      summary: {
        existingResidentCredentialsCount: 1,
        maxPossibleRemainingResidentCredentialsCount: 4,
        totalRPs: 1,
        totalCredentials: 1,
      },
      groups: [
        {
          rpID: "example.com",
          rpName: "Example",
          rpIDHashHex: "abcd",
          credentials: [
            {
              credentialIDHex: "cafe",
              credentialType: "public-key",
              userIDHex: "01",
              userName: "user@example.com",
              displayName: "Example User",
              credProtect: 2,
            },
          ],
        },
      ],
    },
  } as CredentialsEnvelope;
}

function emptyCredentialsEnvelope(): CredentialsEnvelope {
  const envelope = credentialsEnvelope();

  envelope.result!.summary.existingResidentCredentialsCount = 0;
  envelope.result!.summary.totalRPs = 0;
  envelope.result!.summary.totalCredentials = 0;
  envelope.result!.groups = [];

  return envelope;
}

function credentialUpdateTarget(): CredentialTarget {
  return {
    record: {
      credentialIDHex: "cafe",
      credentialType: "public-key",
      userIDHex: "01",
      userName: "user@example.com",
      displayName: "Example User",
      credProtect: 2,
    },
    rp: { id: "example.com", name: "Example", idHashHex: "abcd" },
    user: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
  };
}

function mixedRelyingPartyEnvelope(): CredentialsEnvelope {
  const envelope = credentialsEnvelope();

  envelope.result!.summary.existingResidentCredentialsCount = 3;
  envelope.result!.summary.totalRPs = 2;
  envelope.result!.summary.totalCredentials = 3;
  envelope.result!.groups = [
    {
      rpID: "solo.example",
      rpName: "Solo",
      rpIDHashHex: "aaaa",
      credentials: [
        {
          credentialIDHex: "a1",
          userIDHex: "01",
          userName: "solo@example.com",
          displayName: "Solo User",
          credProtect: 2,
        },
      ],
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
    setAdvancedMode(true);
    controllerMocks.reloadPasskeys.mockClear();
    workbenchMocks.navigateToScreen.mockClear();
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

  it("shows the not-loaded state before inventory is available", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });

    render(Passkeys);

    expect(screen.getByText("Passkeys not loaded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read state" })).not.toBeInTheDocument();
  });

  it("keeps an empty inventory in context and offers useful next actions", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(emptyCredentialsEnvelope());

    render(Passkeys);

    const table = screen.getByRole("table", { name: "Discoverable passkeys" });

    expect(within(table).getByRole("columnheader", { name: "RP name" })).toBeInTheDocument();
    expect(
      within(table).getByText("This authenticator has no discoverable passkeys"),
    ).toBeInTheDocument();
    expect(within(table).getByText(/The inventory loaded successfully\./)).toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: "Open WebAuthn Lab" }));
    expect(workbenchMocks.navigateToScreen).toHaveBeenCalledWith("lab");

    await user.click(within(table).getByRole("button", { name: "Reload inventory" }));
    await waitFor(() => expect(controllerMocks.reloadPasskeys).toHaveBeenCalledOnce());
  });

  it("shows the unavailable perCredMgmtRO badge when unsupported", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    expect(screen.getByText("Read-only passkey management: Not available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read state" })).not.toBeInTheDocument();
  });

  it("shows only the perCredMgmtRO badge when supported", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope(true));

    render(Passkeys);

    expect(screen.getByText("Read-only passkey management: Supported")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Read state" })).not.toBeInTheDocument();
  });

  it("keeps a typed inventory error out of the empty state", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    failPasskeysInventoryLoadWithResponse(false);

    render(Passkeys);

    expect(
      screen.getByText("Load discoverable passkeys from the selected authenticator."),
    ).toBeInTheDocument();
    expect(screen.queryByText("The PIN is invalid.")).not.toBeInTheDocument();
  });

  it("does not turn an unsupported verification flow into unsupported credential management", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    failPasskeysInventoryLoadWithResponse(false);

    render(Passkeys);

    expect(
      screen.getByText("Load discoverable passkeys from the selected authenticator."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("The requested verification flow is not supported."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Passkey management unavailable")).not.toBeInTheDocument();
  });

  it("opens credential details immediately after the selected table row", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    const credential = screen.getByRole("button", { name: /Example User, user@example.com/ });
    const record = credential.closest("tr");

    expect(record).not.toBeNull();
    expect(credential.closest("td")).toBe(record?.cells[0]);
    expect(within(record!.cells[1]).queryByRole("button")).not.toBeInTheDocument();
    expect(credential).toHaveAttribute("aria-expanded", "false");
    expect(credential).toHaveAttribute("aria-controls", "passkey-row-details-cafe");
    await user.click(credential);

    const details = record?.nextElementSibling as HTMLElement;

    expect(details).toHaveAttribute("id", "passkey-row-details-cafe");
    expect(details.closest("table")).toBe(
      screen.getByRole("table", { name: "Discoverable passkeys" }),
    );
    expect(
      within(screen.getByRole("table", { name: "Discoverable passkeys" })).getAllByRole("row"),
    ).toHaveLength(3);
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

  it("removes the raw JSON region and its divider when Advanced Mode is disabled", async () => {
    const user = userEvent.setup();

    setAdvancedMode(false);
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    const credential = screen.getByRole("button", { name: /Example User, user@example.com/ });
    const record = credential.closest("tr") as HTMLElement;

    await user.click(credential);

    const details = record.nextElementSibling as HTMLElement;

    expect(details.querySelector(".passkey-raw-separator")).not.toBeInTheDocument();
    expect(details.querySelector(".passkey-raw")).not.toBeInTheDocument();
    expect(within(details).queryByRole("button", { name: "Copy JSON" })).not.toBeInTheDocument();
  });

  it("collapses inline credential details when the selected row is clicked again", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
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
      selectionId: "authenticator-1",
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
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByText("public-key")).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText("Search RP, user, passkey ID, or hash"),
      "does-not-exist",
    );
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
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    const compact = screen.getByText("UV 2");

    expect(compact).toHaveAttribute("title", "Level 2 · UV optional with passkey list");
    expect(screen.queryByText("Level 2 · UV optional with passkey list")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByText("Level 2 · UV optional with passkey list")).toBeInTheDocument();
  });

  it("renders every passkey as a flat table row without RP collapsibles", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(mixedRelyingPartyEnvelope());

    render(Passkeys);

    const table = screen.getByRole("table", { name: "Discoverable passkeys" });

    expect(within(table).getByRole("columnheader", { name: "RP name" })).toHaveAttribute(
      "data-slot",
      "expandable-data-table-disclosure-header",
    );
    expect(within(table).getByRole("columnheader", { name: "User name" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Passkey ID" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "UV" })).toHaveAttribute(
      "data-align",
      "end",
    );
    expect(within(table).getAllByRole("row")).toHaveLength(4);

    expect(
      screen.getByRole("button", { name: /Solo User, solo@example\.com, Solo/ }),
    ).toBeInTheDocument();

    const alice = screen.getByRole("button", { name: /Alice, alice@team\.example/ });
    const bob = screen.getByRole("button", { name: /Bob, bob@team\.example/ });

    expect(alice).toHaveAttribute("aria-expanded", "false");
    expect(bob).toBeInTheDocument();
    expect(screen.queryByText("2 passkeys")).not.toBeInTheDocument();

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

  it("opens the typed update dialog from the inspector", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    await user.click(screen.getByRole("button", { name: "Edit" }));

    const dialog = screen.getByRole("dialog", { name: "Edit passkey user" });

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("User name")).toHaveValue("user@example.com");
    expect(within(dialog).getByLabelText("Display name")).toHaveValue("Example User");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("keeps exactly one verification mode selected when the active mode is clicked again", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
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

  it("keeps stale rows actionable while showing the failed refresh warning", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());
    failPasskeysInventoryLoadAtRuntime();

    render(Passkeys);

    expect(screen.getByText("Passkey inventory could not be refreshed")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The last successfully loaded data remains visible\. Reload passkeys to try again\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Communication with the authenticator failed\./),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload passkeys" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: /Example User, user@example.com/ }));
    expect(screen.getByRole("button", { name: "Edit" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("dialog", { name: "Edit passkey user" })).toBeInTheDocument();
  });

  it("renders unsupported credential management as a non-retry state", () => {
    const unsupported = credentialsEnvelope();

    unsupported.result!.support.credentialManagement = false;
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(unsupported);

    render(Passkeys);

    expect(screen.getByText("Passkey management unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("distinguishes an authenticator's real empty inventory", () => {
    const empty = credentialsEnvelope();

    empty.result!.groups = [];
    empty.result!.summary.existingResidentCredentialsCount = 0;
    empty.result!.summary.totalRPs = 0;
    empty.result!.summary.totalCredentials = 0;
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(empty);

    render(Passkeys);

    expect(screen.getByText("This authenticator has no discoverable passkeys")).toBeInTheDocument();
    expect(screen.queryByText("No matching passkeys")).not.toBeInTheDocument();
  });

  it("closes the update dialog during work and restores it for review or error", async () => {
    const envelope = credentialsEnvelope();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(envelope);

    const previewEnvelope = {
      operationId: "update-preview-1",
      selectionId: "authenticator-1",
      kind: OperationKind.UpdateCredentialUser,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.com",
          current: { userIDHex: "01", name: "user@example.com", displayName: "Example User" },
          proposed: { userIDHex: "01", name: "updated@example.com", displayName: "Example User" },
          warnings: [
            {
              severity: "warning",
              code: "credential.update_user.mutation",
              message: "toolkit fallback",
            },
          ],
        },
        result: null,
      },
    } as CredentialUpdateEnvelope;
    const previewRequest = {
      selectionId: "authenticator-1",
      target: credentialUpdateTarget(),
      name: "updated@example.com",
      nameProvided: true,
      dryRun: true,
    };
    const mutation = {
      kind: "update",
      target: credentialUpdateTarget(),
      form: { name: "updated@example.com", displayName: "Example User" },
    } as const;

    mutablePasskeysMutation.set({
      ...mutation,
      operation: { phase: "previewing" },
    });

    render(Passkeys);

    expect(screen.queryByRole("dialog", { name: "Edit passkey user" })).not.toBeInTheDocument();

    mutablePasskeysMutation.set({
      ...mutation,
      operation: {
        phase: "review",
        previewRequest,
        previewEnvelope,
        previewValue: previewEnvelope.result!.preview,
      },
    });

    const dialog = await screen.findByRole("dialog", { name: "Edit passkey user" });

    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText(
        "Changing this information may prevent you from signing in with this passkey.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("credential.update_user.mutation")).not.toBeInTheDocument();
    expect(screen.getByText("Current value")).toBeInTheDocument();
    expect(screen.getByText("Proposed value")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Preview JSON" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(within(dialog).getByRole("button", { name: "Confirm update" })).toBeEnabled();

    mutablePasskeysMutation.set({
      ...mutation,
      operation: {
        phase: "executing",
        previewEnvelope,
        previewValue: previewEnvelope.result!.preview,
        request: { ...previewRequest, dryRun: false },
      },
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Edit passkey user" })).not.toBeInTheDocument();
    });

    mutablePasskeysMutation.set({
      ...mutation,
      operation: {
        phase: "error",
        failedPhase: "executing",
        previewEnvelope,
        previewValue: previewEnvelope.result!.preview,
        request: { ...previewRequest, dryRun: false },
        responseEnvelope: {
          operationId: "update-error-1",
          selectionId: "authenticator-1",
          kind: OperationKind.UpdateCredentialUser,
          error: failureForCode(Code.CodeTransportFailure),
        } as CredentialUpdateEnvelope,
        runtimeError: null,
      },
    });

    const errorDialog = await screen.findByRole("dialog", { name: "Edit passkey user" });

    expect(
      within(errorDialog).getByText("Communication with the authenticator failed."),
    ).toBeInTheDocument();
    expect(within(errorDialog).getByRole("button", { name: "Confirm update" })).toBeEnabled();
    expect(within(errorDialog).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("renders the typed delete preview in an accessible alert dialog", async () => {
    const user = userEvent.setup();

    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    const previewEnvelope = {
      operationId: "delete-preview-1",
      selectionId: "authenticator-1",
      kind: OperationKind.DeleteCredential,
      authenticatorClosed: false,
      result: {
        preview: {
          credentialIDHex: "cafe",
          rpID: "example.com",
          rpName: "Example",
          userIDHex: "01",
          userName: "user@example.com",
          displayName: "Example User",
          warnings: [
            {
              severity: "destructive",
              code: "credential.delete.destructive",
              message: "toolkit fallback",
            },
          ],
        },
        result: null,
      },
    } as CredentialDeleteEnvelope;

    mutablePasskeysMutation.set({
      kind: "delete",
      credentialIDHex: "cafe",
      operation: {
        phase: "review",
        previewRequest: { credentialIDHex: "cafe", dryRun: true },
        previewEnvelope,
        previewValue: previewEnvelope.result!.preview,
      },
    });

    render(Passkeys);

    const dialog = screen.getByRole("alertdialog", { name: "Confirm delete" });

    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByText("Deleting this discoverable passkey is destructive and cannot be undone."),
    ).toBeInTheDocument();
    expect(screen.queryByText("credential.delete.destructive")).not.toBeInTheDocument();
    expect(screen.getAllByText("cafe").length).toBeGreaterThan(0);
    expect(within(dialog).getByRole("button", { name: "Preview JSON" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
  });

  it("shows a regular error dialog instead of delete confirmation when dry-run fails without a preview", () => {
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectionId: "authenticator-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    const errorEnvelope = {
      operationId: "delete-preview-1",
      selectionId: "authenticator-1",
      kind: OperationKind.DeleteCredential,
      authenticatorClosed: false,
      error: failureForCode(Code.CodeTransportFailure),
    } as CredentialDeleteEnvelope;

    mutablePasskeysMutation.set({
      kind: "delete",
      credentialIDHex: "cafe",
      operation: {
        phase: "error",
        failedPhase: "previewing",
        responseEnvelope: errorEnvelope,
        runtimeError: null,
      },
    });

    render(Passkeys);

    expect(screen.queryByRole("alertdialog", { name: "Confirm delete" })).not.toBeInTheDocument();

    const dialog = screen.getByRole("dialog", { name: "Passkey deletion preview" });

    expect(
      within(dialog).getByText("Communication with the authenticator failed."),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(within(dialog).queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });
});
