import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, waitFor, within } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PublicKeyCredentialDescriptor,
  PublicKeyCredentialType,
  PublicKeyCredentialUserEntity,
} from "../../../../bindings/github.com/go-ctap/ctap/credential";
import { AttestationStatementFormatIdentifier } from "../../../../bindings/github.com/go-ctap/ctap/attestation";
import {
  AuthenticationExtensionsPRFValues,
  CredentialPropertiesOutput,
} from "../../../../bindings/github.com/go-ctap/ctap/webauthn";
import { Kind as OperationKind } from "../../../../bindings/github.com/go-ctap/kit/model/operation";
import {
  Assertion,
  CredentialBlobCreateOutput,
  CredentialBlobGetOutput,
  GetAssertionOutput,
  GetAssertionClientExtensionResults,
  GetAssertionExtensionResults,
  GetAssertionPRFOutput,
  GetAssertionResult as GetAssertionResultDTO,
  MakeCredentialClientExtensionResults,
  MakeCredentialOutput,
  MakeCredentialExtensionResults,
  MakeCredentialPRFOutput,
  MakeCredentialResult as MakeCredentialResultDTO,
} from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";
import {
  GetAssertionEnvelope,
  MakeCredentialEnvelope,
} from "../../../../bindings/fidobench/service";

import GetAssertionResult from "$lib/components/lab/GetAssertionResult.svelte";
import MakeCredentialResult from "$lib/components/lab/MakeCredentialResult.svelte";
import { setAppLocale } from "$lib/i18n";
import { hexToBase64 } from "$lib/lab-input";

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

const clipboardSetText = vi.spyOn(Clipboard, "SetText");

function getAssertionEnvelope(result: GetAssertionResultDTO) {
  return new GetAssertionEnvelope({
    operationId: "get-assertion-1",
    selectionId: "authenticator-1",
    kind: OperationKind.GetAssertion,
    result: new GetAssertionOutput({ result }),
  });
}

function makeCredentialEnvelope(result: MakeCredentialResultDTO) {
  return new MakeCredentialEnvelope({
    operationId: "make-credential-1",
    selectionId: "authenticator-1",
    kind: OperationKind.MakeCredential,
    result: new MakeCredentialOutput({ result }),
  });
}

function renderGetResult(result: GetAssertionResultDTO) {
  return render(GetAssertionResult, { result, responseEnvelope: getAssertionEnvelope(result) });
}

function renderMakeResult(result: MakeCredentialResultDTO) {
  return render(MakeCredentialResult, { result, responseEnvelope: makeCredentialEnvelope(result) });
}

describe("WebAuthn Lab results", () => {
  beforeEach(() => {
    setAppLocale("en");
    clipboardSetText.mockReset();
    clipboardSetText.mockResolvedValue();
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
  });

  afterEach(async () => {
    cleanup();
    await tick();
    await new Promise((resolve) => setTimeout(resolve, 30));
    document.body.style.pointerEvents = "";
  });

  it("distinguishes a successful GetAssertion response with 0 assertions", () => {
    const result = new GetAssertionResultDTO({
      deviceFingerprint: "token-1",
      rpID: "example.com",
      assertions: [],
    });
    renderGetResult(result);

    expect(screen.getByText("0 assertions")).toBeInTheDocument();
    expect(screen.getByText("The authenticator returned 0 assertions.")).toBeInTheDocument();
  });

  it("selects assertions and preserves explicit 0 and false values", async () => {
    const user = userEvent.setup();
    const assertions = [
      new Assertion({
        index: 0,
        credential: new PublicKeyCredentialDescriptor({
          type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
          id: "AA==",
        }),
        authenticatorDataHex: "cafe",
        signatureHex: "aa",
        user: new PublicKeyCredentialUserEntity({
          id: "AQ==",
          name: "alice@example.com",
          displayName: "Alice",
        }),
        numberOfCredentials: 0,
        userSelected: false,
        signCount: 0,
        userPresent: false,
        userVerified: false,
      }),
      new Assertion({
        index: 1,
        credential: new PublicKeyCredentialDescriptor({
          type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
          id: "Ag==",
        }),
        authenticatorDataHex: "beef",
        signatureHex: "bb",
        numberOfCredentials: 2,
        userSelected: true,
        signCount: 7,
        userPresent: true,
        userVerified: true,
      }),
    ];

    const result = new GetAssertionResultDTO({ deviceFingerprint: "token-1", rpID: "example.com", assertions });
    renderGetResult(result);

    expect(screen.getByText("2 assertions")).toBeInTheDocument();
    expect(screen.getByText("00")).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
    expect(screen.getAllByText("False")).toHaveLength(3);

    await user.click(screen.getByRole("tab", { name: "Assertion 1" }));
    expect(screen.getAllByText("True")).toHaveLength(3);
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("renders authentication PRF results without a registration-only enabled field", () => {
    const secret = "cd".repeat(32);
    const result = new GetAssertionResultDTO({
      deviceFingerprint: "token-1",
      rpID: "example.com",
      assertions: [new Assertion({
        index: 0,
        credential: new PublicKeyCredentialDescriptor({
          type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
          id: "AA==",
        }),
        authenticatorDataHex: "cafe",
        signatureHex: "aa",
        extensionResults: new GetAssertionExtensionResults({
          client: new GetAssertionClientExtensionResults({
            prf: new GetAssertionPRFOutput({
              results: new AuthenticationExtensionsPRFValues({ first: hexToBase64(secret) }),
            }),
          }),
        }),
      })],
    });

    renderGetResult(result);

    expect(screen.getByText("prf · first")).toBeInTheDocument();
    expect(screen.queryByText("prf · enabled")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(secret);
  });

  it("labels credential blob output with the extension identifier", () => {
    const result = new GetAssertionResultDTO({
      deviceFingerprint: "token-1",
      rpID: "example.com",
      assertions: [new Assertion({
        index: 0,
        credential: new PublicKeyCredentialDescriptor({
          type: PublicKeyCredentialType.PublicKeyCredentialTypePublicKey,
          id: "AA==",
        }),
        authenticatorDataHex: "cafe",
        signatureHex: "aa",
        extensionResults: new GetAssertionExtensionResults({
          client: new GetAssertionClientExtensionResults({
            getCredBlob: new CredentialBlobGetOutput({ valueHex: "0102" }),
          }),
        }),
      })],
    });

    renderGetResult(result);

    expect(screen.getByText("credBlob")).toBeInTheDocument();
    expect(screen.queryByText("getCredBlob")).not.toBeInTheDocument();
  });

  it("copies the credential ID and opens the sanitized full response from technical details", async () => {
    const user = userEvent.setup();
    const credentialIDHex = "00112233445566778899aabbccddeeff0011223344556677";
    const result = new MakeCredentialResultDTO({
      deviceFingerprint: "token-1",
      rpID: "example.com",
      fmt: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
      credentialIDHex,
      publicKeyCOSEHex: "aabb",
      authenticatorDataHex: "ccdd",
      attestationObjectCBORHex: "eeff",
      signCount: 0,
      userPresent: true,
      userVerified: false,
      enterpriseAttestation: false,
    });

    renderMakeResult(result);

    expect(screen.getByText("24 bytes")).toBeInTheDocument();
    expect(screen.queryByText(credentialIDHex)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Passkey ID" }));
    expect(clipboardSetText).toHaveBeenCalledWith(credentialIDHex);

    await user.click(screen.getByRole("button", { name: "Technical details 4" }));
    const responseRow = screen.getByText("Full sanitized response").closest(".lab-protocol-row") as HTMLElement;
    await user.click(within(responseRow).getByRole("button", { name: "View" }));
    const responseSheet = await screen.findByRole("dialog", { name: "Full sanitized response" });
    await waitFor(() => expect(responseSheet).toHaveTextContent(credentialIDHex));
  });

  it("keeps PRF outputs out of the DOM until one value is explicitly revealed", async () => {
    const user = userEvent.setup();
    const secret = "ab".repeat(32);
    const result = new MakeCredentialResultDTO({
      deviceFingerprint: "token-1",
      rpID: "example.com",
      fmt: AttestationStatementFormatIdentifier.AttestationStatementFormatIdentifierPacked,
      credentialIDHex: "0011",
      publicKeyCOSEHex: "aabb",
      authenticatorDataHex: "ccdd",
      attestationObjectCBORHex: "eeff",
      extensionResults: new MakeCredentialExtensionResults({
        client: new MakeCredentialClientExtensionResults({
          credBlob: new CredentialBlobCreateOutput({ accepted: true }),
          credProps: new CredentialPropertiesOutput({ rk: false }),
          prf: new MakeCredentialPRFOutput({
            enabled: true,
            results: new AuthenticationExtensionsPRFValues({ first: hexToBase64(secret) }),
          }),
        }),
      }),
    });

    renderMakeResult(result);

    expect(document.body).not.toHaveTextContent(secret);
    expect(screen.getByLabelText("Hidden secret, 32 bytes")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "WebAuthn client outputs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "CTAP extension outputs" })).toBeInTheDocument();
    const credentialPropertiesRow = screen.getByText("credProps · rk").closest("div") as HTMLElement;
    expect(within(credentialPropertiesRow).getByText("False")).toBeInTheDocument();
    const secretRow = screen.getByText("prf · first").closest("div") as HTMLElement;
    expect(within(secretRow).queryByRole("button", { name: /copy/i })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Reveal this secret" }));
    expect(screen.getByText(secret)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Technical details 4" }));
    const responseRow = screen.getByText("Full sanitized response").closest(".lab-protocol-row") as HTMLElement;
    await user.click(within(responseRow).getByRole("button", { name: "View" }));
    expect(document.body).toHaveTextContent("[redacted]");
  });
});
