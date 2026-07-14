import { cleanup, fireEvent, render, screen, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { get } from "svelte/store";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OperationKind } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { Severity, Warning } from "../../bindings/github.com/go-ctap/kit/model/safety";
import { PublicKeyCredentialType } from "../../bindings/github.com/go-ctap/ctap/credential";
import { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { MakeCredentialPreview } from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
  MakeCredentialEnvelope,
  MakeCredentialRequest,
} from "../../bindings/github.com/go-ctap/kit/service";

import { createPresetState, labState as mutableLabState } from "$lib/features/lab/state";
import { setAppLocale } from "$lib/i18n";
import { failureForCode } from "$lib/test-failure";
import { resetAppStateForTest, seedSelectionForTest } from "$lib/store-test-utils";

import Lab from "./Lab.svelte";

const controllerMocks = vi.hoisted(() => ({
  previewMakeCredential: vi.fn(() => Promise.resolve(true)),
  runGetAssertion: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("$lib/controller", async (importOriginal) => ({
  ...(await importOriginal<typeof import("$lib/controller")>()),
  previewLabMakeCredential: controllerMocks.previewMakeCredential,
  runLabGetAssertion: controllerMocks.runGetAssertion,
}));

const token = new DeviceReport({
  deviceId: "token-1",
  ordinalAlias: "1",
  stableId: true,
  product: "Test authenticator",
});

function selectToken() {
  seedSelectionForTest(token.deviceId, token, { state: "ready", sessionId: "session-1" });
}

function stepCard(name: string) {
  return screen.getByRole("heading", { level: 2, name }).closest('[data-slot="card"]') as HTMLElement;
}

describe("WebAuthn Lab screen", () => {
  beforeEach(() => {
    setAppLocale("en");
    resetAppStateForTest();
    controllerMocks.previewMakeCredential.mockClear();
    controllerMocks.runGetAssertion.mockClear();
  });

  afterEach(async () => {
    cleanup();
    await tick();
    document.body.style.pointerEvents = "";
  });

  it("shows a dedicated no-device state", () => {
    render(Lab);

    expect(screen.getByText("Select an authenticator")).toBeInTheDocument();
    expect(screen.getByText(/run MakeCredential and GetAssertion/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "WebAuthn Lab" })).not.toBeInTheDocument();
  });

  it("renders the default preset and both ordered steps", () => {
    selectToken();
    render(Lab);

    expect(screen.getByRole("heading", { level: 2, name: "WebAuthn Lab" })).toBeInTheDocument();
    expect(screen.getByText(/Test authenticator/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preset" })).toHaveTextContent("Discoverable passkey");
    expect(screen.getByRole("heading", { level: 2, name: "1. MakeCredential" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "2. GetAssertion" })).toBeInTheDocument();

    const make = stepCard("1. MakeCredential");
    const assertion = stepCard("2. GetAssertion");
    expect(within(make).getByLabelText("RP name")).toHaveValue("Example");
    expect((within(make).getByLabelText("User ID hex") as HTMLInputElement).value).toMatch(/^[0-9a-f]{32}$/);
    expect(within(assertion).getByLabelText("RP ID")).toHaveValue("example.com");
    expect(within(assertion).getByText(/Leave empty to let the authenticator choose/)).toBeInTheDocument();
  });

  it("runs the primary action on single-line Enter but preserves textarea Enter", async () => {
    const user = userEvent.setup();
    selectToken();
    mutableLabState.set(createPresetState("minimal"));
    render(Lab);

    const make = stepCard("1. MakeCredential");
    const rpName = within(make).getByLabelText("RP name");
    rpName.focus();
    await user.keyboard("{Enter}");
    expect(controllerMocks.previewMakeCredential).toHaveBeenCalledOnce();

    controllerMocks.previewMakeCredential.mockClear();
    mutableLabState.update((state) => ({
      ...state,
      makeDraft: {
        ...state.makeDraft,
        clientData: { ...state.makeDraft.clientData, mode: "raw" },
      },
    }));
    await tick();
    await user.click(within(make).getByRole("button", { name: "Advanced request" }));
    const raw = within(make).getByLabelText("Raw client data JSON");
    expect(await fireEvent.keyDown(raw, { key: "Enter" })).toBe(true);
    expect(controllerMocks.previewMakeCredential).not.toHaveBeenCalled();

    expect(await fireEvent.keyDown(raw, { key: "Enter", ctrlKey: true })).toBe(false);
    expect(controllerMocks.previewMakeCredential).toHaveBeenCalledOnce();
  });

  it("locks both steps while the shared authenticator session is running", () => {
    seedSelectionForTest(token.deviceId, token, { state: "running", sessionId: "session-1" });
    render(Lab);

    const make = stepCard("1. MakeCredential");
    const assertion = stepCard("2. GetAssertion");
    expect(within(make).getByLabelText("RP ID")).toBeDisabled();
    expect(within(assertion).getByLabelText("RP ID")).toBeDisabled();
    expect(within(make).getByRole("button", { name: "Preview" })).toBeDisabled();
    expect(within(assertion).getByRole("button", { name: "Run GetAssertion" })).toBeDisabled();
  });

  it("keeps the reviewed request visible and locks its draft", () => {
    selectToken();
    const current = get(mutableLabState);
    const previewRequest = new MakeCredentialRequest({
      sessionId: "session-1",
      rp: { id: "example.com", name: "Example" },
      user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
      clientDataJSON: "e30=",
      pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
      dryRun: true,
    });
    const previewEnvelope = new MakeCredentialEnvelope({
      operationId: "make-preview-1",
      sessionId: "session-1",
      kind: OperationKind.OperationMakeCredential,
      result: {
        preview: new MakeCredentialPreview({
          device: token,
          rp: { id: "example.com", name: "Example" },
          user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
          pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
          warnings: [new Warning({
            severity: Severity.SeverityWarning,
            code: "webauthn.make_credential.mutation",
            message: "Backend fallback",
          })],
        }),
        result: null,
      },
    });
    mutableLabState.set({
      ...current,
      makeDraft: {
        ...current.makeDraft,
        clientData: {
          ...current.makeDraft.clientData,
          mode: "raw",
          rawJSON: "{not-json\n",
        },
      },
      makeStep: {
        phase: "review",
        previewRequest,
        previewEnvelope,
      },
    });

    render(Lab);

    const make = stepCard("1. MakeCredential");
    expect(within(make).getByLabelText("RP ID")).toBeDisabled();
    expect(within(make).getByRole("heading", { name: "Reviewed snapshot" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Typed preview" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(within(make).getAllByText(/not valid JSON/).length).toBeGreaterThan(0);
    expect(within(make).getByText("A new credential may be created on this authenticator.")).toBeInTheDocument();
    expect(within(make).queryByText("webauthn.make_credential.mutation")).not.toBeInTheDocument();
  });

  it("keeps the original action for each failed MakeCredential phase", async () => {
    selectToken();
    const current = get(mutableLabState);
    const previewRequest = new MakeCredentialRequest({
      sessionId: "session-1",
      rp: { id: "example.com", name: "Example" },
      user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
      clientDataJSON: "e30=",
      pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
      dryRun: true,
    });
    const previewEnvelope = new MakeCredentialEnvelope({
      operationId: "make-preview-1",
      sessionId: "session-1",
      kind: OperationKind.OperationMakeCredential,
      result: {
        preview: new MakeCredentialPreview({
          device: token,
          rp: { id: "example.com", name: "Example" },
          user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
          pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
        }),
        result: null,
      },
    });
    const executionRequest = new MakeCredentialRequest({
      ...previewRequest,
      dryRun: false,
      confirmed: true,
    });

    mutableLabState.set({
      ...current,
      makeStep: {
        phase: "error",
        previewRequest,
        previewEnvelope: null,
        request: null,
        responseEnvelope: new MakeCredentialEnvelope({
          operationId: "make-preview-error",
          sessionId: "session-1",
          kind: OperationKind.OperationMakeCredential,
          error: failureForCode(Code.CodeTransportFailure),
        }),
        runtimeError: null,
      },
    });
    render(Lab);

    const make = stepCard("1. MakeCredential");
    expect(within(make).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(within(make).queryByRole("button", { name: "Confirm" })).not.toBeInTheDocument();

    mutableLabState.update((state) => ({
      ...state,
      makeStep: {
        phase: "error",
        previewRequest,
        previewEnvelope,
        request: executionRequest,
        responseEnvelope: new MakeCredentialEnvelope({
          operationId: "make-execution-error",
          sessionId: "session-1",
          kind: OperationKind.OperationMakeCredential,
          error: failureForCode(Code.CodeTransportFailure),
        }),
        runtimeError: null,
      },
    }));
    await tick();
    expect(within(make).getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    expect(within(make).queryByRole("button", { name: "Preview" })).not.toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("can cancel and then reapply the current preset to a custom scenario", async () => {
    const user = userEvent.setup();
    selectToken();
    render(Lab);

    const make = stepCard("1. MakeCredential");
    await user.clear(within(make).getByLabelText("RP name"));
    await user.type(within(make).getByLabelText("RP name"), "Edited");

    const preset = screen.getByRole("button", { name: "Preset" });
    await user.click(preset);
    await user.keyboard("{ArrowDown}{Enter}");

    let dialog = screen.getByRole("alertdialog", { name: "Discard the current Lab run?" });
    expect(within(dialog).getByText(/edited fields, a reviewed request, or operation results/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(get(mutableLabState).pendingPresetID).toBeNull();
    document.body.style.pointerEvents = "";

    await user.click(preset);
    await user.keyboard("{ArrowDown}{Enter}");
    dialog = screen.getByRole("alertdialog", { name: "Discard the current Lab run?" });
    await user.click(within(dialog).getByRole("button", { name: "Apply preset" }));

    expect(get(mutableLabState)).toMatchObject({
      presetID: "discoverable",
      isCustom: false,
      pendingPresetID: null,
      makeDraft: { rpName: "Example" },
    });
  });

  it("renders and cancels a context-aware handoff replacement AlertDialog", async () => {
    const user = userEvent.setup();
    selectToken();
    mutableLabState.update((state) => ({
      ...state,
      pendingHandoff: {
        rpID: "other.example",
        credentialIDHex: "cafe",
      },
    }));
    render(Lab);

    const dialog = screen.getByRole("alertdialog", { name: "Replace the GetAssertion scenario?" });
    expect(within(dialog).getByText(/replaces its RP and allow list/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(get(mutableLabState).pendingHandoff).toBeNull();
  });
});
