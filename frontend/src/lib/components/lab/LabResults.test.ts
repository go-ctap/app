import { Clipboard } from "@wailsio/runtime";
import { cleanup, render, screen, within } from "@testing-library/svelte";
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
  Assertion,
  GetAssertionResult as GetAssertionResultDTO,
  MakeCredentialResult as MakeCredentialResultDTO,
} from "../../../../bindings/github.com/go-ctap/kit/model/webauthn";

import GetAssertionResult from "$lib/components/lab/GetAssertionResult.svelte";
import MakeCredentialResult from "$lib/components/lab/MakeCredentialResult.svelte";
import { setAppLocale } from "$lib/i18n";
import { base64ToHex } from "$lib/lab-input";

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("svelte-sonner", () => ({ toast: toastMocks }));

const clipboardSetText = vi.spyOn(Clipboard, "SetText");

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
    document.body.style.pointerEvents = "";
  });

  it("distinguishes a successful GetAssertion response with 0 assertions", () => {
    render(GetAssertionResult, {
      result: new GetAssertionResultDTO({
        deviceId: "token-1",
        rpID: "example.com",
        assertions: [],
      }),
      responseEnvelope: null,
      runtimeError: null,
      bytesToHex: base64ToHex,
    });

    expect(screen.getByText("0 assertions")).toBeInTheDocument();
    expect(screen.getByText("The authenticator returned 0 assertions.")).toBeInTheDocument();
  });

  it("renders every assertion and preserves explicit 0 and false values", () => {
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

    render(GetAssertionResult, {
      result: new GetAssertionResultDTO({ deviceId: "token-1", rpID: "example.com", assertions }),
      responseEnvelope: null,
      runtimeError: null,
      bytesToHex: base64ToHex,
    });

    expect(screen.getByText("2 assertions")).toBeInTheDocument();
    const first = screen.getByRole("heading", { level: 4, name: "Assertion 0" }).closest("section") as HTMLElement;
    const second = screen.getByRole("heading", { level: 4, name: "Assertion 1" }).closest("section") as HTMLElement;
    expect(within(first).getByText("00")).toBeInTheDocument();
    expect(within(first).getByText("01")).toBeInTheDocument();
    expect(within(first).getAllByText("0")).toHaveLength(2);
    expect(within(first).getAllByText("False")).toHaveLength(3);
    expect(within(second).getAllByText("True")).toHaveLength(3);
  });

  it("copies the complete MakeCredential hex while displaying its byte count and raw disclosure", async () => {
    const user = userEvent.setup();
    const credentialIDHex = "00112233445566778899aabbccddeeff0011223344556677";
    const result = new MakeCredentialResultDTO({
      deviceId: "token-1",
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

    render(MakeCredentialResult, { result, responseEnvelope: null, runtimeError: null });

    expect(screen.getByText("24 bytes")).toBeInTheDocument();
    expect(screen.queryByText(credentialIDHex)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy Credential ID" }));
    expect(clipboardSetText).toHaveBeenCalledWith(credentialIDHex);

    await user.click(screen.getByRole("button", { name: "Raw envelope and result" }));
    expect(screen.getByText(new RegExp(credentialIDHex))).toBeInTheDocument();
  });
});
