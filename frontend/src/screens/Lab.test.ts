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
import { MakeCredentialInput, MakeCredentialPreview } from "../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
  MakeCredentialEnvelope,
  MakeCredentialRequest,
} from "../../bindings/github.com/go-ctap/kit/service";

import { createLabState, labState as mutableLabState } from "$lib/features/lab/state";
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
  fingerprint: "token-1",
  ordinalAlias: "1",
  product: "Test authenticator",
});

function selectToken() {
  seedSelectionForTest(token.fingerprint, token, { state: "ready", sessionId: "session-1" });
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

  it("does not render a local token-selection empty state", () => {
    render(Lab);

    expect(screen.queryByText("Select an authenticator")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "WebAuthn Lab" })).not.toBeInTheDocument();
  });

  it("renders operation tabs and preserves the independent drafts", async () => {
    const user = userEvent.setup();
    selectToken();
    render(Lab);

    expect(screen.queryByRole("heading", { name: "WebAuthn Lab" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Scenario" })).toBeInTheDocument();
    expect(screen.getByText("Create a credential, review the exact request, then exercise it with an assertion."))
      .toBeInTheDocument();
    expect(screen.getByText("Test authenticator")).toBeInTheDocument();
    expect(screen.queryByText("1. Test authenticator")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fill demo values" })).toBeEnabled();
    expect(screen.getByRole("tab", { name: "MakeCredential" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "GetAssertion" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "MakeCredential" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "GetAssertion" })).not.toBeInTheDocument();

    const make = stepCard("MakeCredential");
    expect(within(make).getByLabelText("RP name")).toHaveValue("Example");
    expect((within(make).getByLabelText("User ID hex") as HTMLInputElement).value).toMatch(/^[0-9a-f]{32}$/);
    await user.clear(within(make).getByLabelText("RP name"));
    await user.type(within(make).getByLabelText("RP name"), "Edited make RP");

    await user.click(screen.getByRole("tab", { name: "GetAssertion" }));
    const assertion = stepCard("GetAssertion");
    expect(within(assertion).getByLabelText("RP ID")).toHaveValue("example.com");
    expect(within(assertion).getByText(/Leave empty to let the authenticator choose/)).toBeInTheDocument();
    await user.clear(within(assertion).getByLabelText("RP ID"));
    await user.type(within(assertion).getByLabelText("RP ID"), "get.example.com");

    await user.click(screen.getByRole("tab", { name: "MakeCredential" }));
    expect(within(stepCard("MakeCredential")).getByLabelText("RP name")).toHaveValue("Edited make RP");
    await user.click(screen.getByRole("tab", { name: "GetAssertion" }));
    expect(within(stepCard("GetAssertion")).getByLabelText("RP ID")).toHaveValue("get.example.com");
  });

  it("renders configure sections sequentially and keeps extension include separate from expand", async () => {
    const user = userEvent.setup();
    selectToken();
    render(Lab);

    const make = stepCard("MakeCredential");
    expect(within(make).queryByRole("tab")).not.toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "Basics" })).toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "Extensions · 0" })).toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "WebAuthn client extensions" })).toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "CTAP authenticator extensions" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: /prf.*client-side/i })).toBeInTheDocument();

    const includeCredProps = within(make).getByRole("switch", { name: "Include credProps" });
    const expandCredProps = within(make).getByRole("button", { name: /credProps/i });
    expect(includeCredProps).not.toBe(expandCredProps);
    expect(expandCredProps).toHaveAttribute("aria-expanded", "false");

    await user.click(includeCredProps);
    expect(within(make).getByRole("heading", { name: "Extensions · 1" })).toBeInTheDocument();
    expect(expandCredProps).toHaveAttribute("aria-expanded", "true");
    expect(within(make).queryByRole("switch", { name: "Enabled" })).not.toBeInTheDocument();
    expect(within(make).getByRole("switch", { name: "Include credProtect" })).toBeEnabled();
    expect(within(make).getByRole("switch", { name: "Include credBlob" })).toBeEnabled();
    expect(within(make).getByRole("switch", { name: "Include hmac-secret" })).toBeEnabled();
    expect(within(make).getByRole("switch", { name: "Include hmac-secret-mc" })).toBeEnabled();
    expect(within(make).queryByText("hmacCreateSecret")).toBeNull();
    expect(within(make).getByRole("switch", { name: "Include largeBlob" })).toBeDisabled();
    expect(within(make).getByRole("switch", { name: "Include payment" })).toBeDisabled();

    await user.click(screen.getByRole("tab", { name: "GetAssertion" }));
    const assertion = stepCard("GetAssertion");
    expect(within(assertion).queryByRole("tab")).not.toBeInTheDocument();
    expect(within(assertion).getByRole("heading", { name: "Extensions · 0" })).toBeInTheDocument();
    expect(within(assertion).getByRole("heading", { name: "WebAuthn client extensions" })).toBeInTheDocument();
    expect(within(assertion).getByRole("heading", { name: "CTAP authenticator extensions" })).toBeInTheDocument();
    const includePRF = within(assertion).getByRole("switch", { name: "Include prf" });
    expect(includePRF).toBeEnabled();
    expect(within(assertion).getByRole("button", { name: /prf.*client-side/i })).toBeInTheDocument();
    expect(within(assertion).getByRole("switch", { name: "Include credBlob" })).toBeEnabled();
    expect(within(assertion).getByRole("switch", { name: "Include hmac-secret" })).toBeEnabled();
    expect(within(assertion).getByRole("switch", { name: "Include largeBlob" })).toBeDisabled();
    expect(within(assertion).queryByRole("switch", { name: "Include payment" })).not.toBeInTheDocument();

    await user.click(includePRF);
    const addOverride = within(assertion).getByRole("button", { name: "Add credential override" });
    expect(addOverride).toBeDisabled();
    expect(within(assertion).getByText(/requires exactly one allow-list credential/)).toBeInTheDocument();

    mutableLabState.update((state) => ({
      ...state,
      getDraft: {
        ...state.getDraft,
        allowList: [{ credentialIDHex: "aabb", transports: [] }],
      },
    }));
    await tick();
    expect(addOverride).toBeEnabled();
    await user.click(addOverride);
    expect(get(mutableLabState).getDraft.extensions.prf.evalByCredential).toHaveLength(1);
    expect(addOverride).toBeDisabled();

    const override = assertion.querySelector(".lab-prf-override") as HTMLElement;
    await user.click(within(override).getByRole("button", { name: "Remove" }));
    mutableLabState.update((state) => ({
      ...state,
      getDraft: {
        ...state.getDraft,
        allowList: [
          { credentialIDHex: "aabb", transports: [] },
          { credentialIDHex: "ccdd", transports: [] },
        ],
      },
    }));
    await tick();
    expect(addOverride).toBeDisabled();
  });

  it("runs the primary action on single-line Enter but preserves textarea Enter", async () => {
    const user = userEvent.setup();
    selectToken();
    mutableLabState.set(createLabState());
    render(Lab);

    const make = stepCard("MakeCredential");
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
    expect(within(make).getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
    const raw = within(make).getByLabelText("Raw client data JSON");
    expect(await fireEvent.keyDown(raw, { key: "Enter" })).toBe(true);
    expect(controllerMocks.previewMakeCredential).not.toHaveBeenCalled();

    expect(await fireEvent.keyDown(raw, { key: "Enter", ctrlKey: true })).toBe(false);
    expect(controllerMocks.previewMakeCredential).toHaveBeenCalledOnce();
  });

  it("locks action controls in both operation tabs while the session is running", async () => {
    const user = userEvent.setup();
    seedSelectionForTest(token.fingerprint, token, { state: "running", sessionId: "session-1" });
    render(Lab);

    const make = stepCard("MakeCredential");
    expect(within(make).getByLabelText("RP ID")).toBeDisabled();
    expect(within(make).getByRole("button", { name: "Preview" })).toBeDisabled();
    await user.click(screen.getByRole("tab", { name: "GetAssertion" }));
    const assertion = stepCard("GetAssertion");
    expect(within(assertion).getByLabelText("RP ID")).toBeDisabled();
    expect(within(assertion).getByRole("button", { name: "Preview" })).toBeDisabled();
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
          input: new MakeCredentialInput({
            rp: { id: "example.com", name: "Example" },
            user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
            pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
          }),
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

    const make = stepCard("MakeCredential");
    expect(within(make).queryByLabelText("RP ID")).not.toBeInTheDocument();
    expect(within(make).getByRole("heading", { name: "Reviewed snapshot" })).toBeInTheDocument();
    expect(within(make).getByText("Configure").closest("li")).not.toHaveAttribute("data-completed");
    expect(within(make).getByRole("button", { name: "View" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Execute" })).toBeInTheDocument();
    expect(within(make).queryByText(/not valid JSON/)).not.toBeInTheDocument();
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
          input: new MakeCredentialInput({
            rp: { id: "example.com", name: "Example" },
            user: { id: "AA==", name: "alice@example.com", displayName: "Alice" },
            pubKeyCredParams: [{ type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey, alg: -7 }],
          }),
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

    const make = stepCard("MakeCredential");
    expect(within(make).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Retry preview" })).toBeInTheDocument();
    expect(within(make).queryByRole("button", { name: "Execute" })).not.toBeInTheDocument();
    const failedPreviewRP = within(make).getByLabelText("RP ID");
    expect(failedPreviewRP).toBeEnabled();
    await fireEvent.input(failedPreviewRP, { target: { value: "edited.example.com" } });
    expect(get(mutableLabState).makeStep.phase).toBe("editing");

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
    expect(within(make).getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(within(make).queryByRole("button", { name: "Retry preview" })).not.toBeInTheDocument();
    expect(within(make).getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("fills demo values for the active operation without replacing the scenario", async () => {
    const user = userEvent.setup();
    selectToken();
    render(Lab);

    const make = stepCard("MakeCredential");
    const before = get(mutableLabState);
    await user.clear(within(make).getByLabelText("RP name"));
    await user.type(within(make).getByLabelText("RP name"), "Edited");

    await user.click(screen.getByRole("button", { name: "Fill demo values" }));

    const after = get(mutableLabState);
    expect(within(make).getByLabelText("RP name")).toHaveValue("Example");
    expect(after.makeDraft.userIDHex).not.toBe(before.makeDraft.userIDHex);
    expect(after.getDraft).toEqual(before.getDraft);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
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
