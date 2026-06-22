import { cleanup, render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { CredentialsEnvelope } from "../../bindings/github.com/go-ctap/kit/service";

import { setAppLocale } from "$lib/i18n";
import { resetAppStateForTest, seedPasskeysEnvelopeForTest, seedSelectionForTest } from "$lib/store-test-utils";

import Passkeys from "./Passkeys.svelte";

const controllerMocks = vi.hoisted(() => ({
  loadPasskeys: vi.fn(() => Promise.resolve()),
}));

vi.mock("$lib/controller", () => ({
  loadPasskeys: controllerMocks.loadPasskeys,
}));

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
          }],
        }],
      },
    },
  } as CredentialsEnvelope;
}

describe("Passkeys", () => {
  beforeEach(() => {
    setAppLocale("en");
    controllerMocks.loadPasskeys.mockClear();
    resetAppStateForTest();
  });

  afterEach(() => {
    cleanup();
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

  it("opens the inspector when clicking a credential row", async () => {
    const user = userEvent.setup();
    seedSelectionForTest("token-1", null, {
      state: "ready",
      selectedSelector: "token-1",
      selectedDevice: null,
      sessionId: "session-1",
    });
    seedPasskeysEnvelopeForTest(credentialsEnvelope());

    render(Passkeys);

    await user.click(screen.getByText("Example (example.com)"));

    expect(screen.getByText("public-key")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
  });
});
