import { describe, expect, it } from "vitest";

import { AuthenticatorTransport } from "../../bindings/github.com/go-ctap/ctap/credential";
import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";

import { createPresetState } from "./features/lab/state";
import {
  base64ToHex,
  base64ToUTF8,
  base64URLToHex,
  buildAuthenticatorOptions,
  buildClientDataJSON,
  buildGetAssertionRequest,
  buildMakeCredentialRequest,
  hexToBase64,
  hexToBase64URL,
  isHTTPOrigin,
  randomBase64URL,
  randomHex,
  utf8ToBase64,
  validateGetAssertionDraft,
  validateMakeCredentialDraft,
} from "./lab-input";

function sequentialRandom() {
  let next = 0;
  return (target: Uint8Array) => {
    target.forEach((_, index) => {
      target[index] = next;
      next = (next + 1) & 0xff;
    });
  };
}

describe("WebAuthn Lab binary inputs", () => {
  it("generates deterministic byte-exact hex and unpadded base64url", () => {
    const source = sequentialRandom();
    expect(randomHex(4, source)).toBe("00010203");
    expect(randomBase64URL(4, source)).toBe("BAUGBw");
  });

  it("converts strict hex, base64, base64url, and UTF-8 without loss", () => {
    expect(hexToBase64("00ff10a5")).toBe("AP8QpQ==");
    expect(base64ToHex("AP8QpQ==")).toBe("00ff10a5");
    expect(hexToBase64URL("fbff00")).toBe("-_8A");
    expect(base64URLToHex("-_8A")).toBe("fbff00");

    const encoded = utf8ToBase64("Привет 👋");
    expect(encoded).toBe("0J/RgNC40LLQtdGCIPCfkYs=");
    expect(base64ToUTF8(encoded)).toBe("Привет 👋");
  });

  it("rejects odd or decorated hex and non-canonical base64 encodings", () => {
    expect(() => hexToBase64("abc")).toThrow("invalid hex");
    expect(() => hexToBase64("0x10")).toThrow("invalid hex");
    expect(() => base64ToHex("AP8QpQ")).toThrow("invalid base64");
    expect(() => base64URLToHex("YQ==")).toThrow("invalid base64url");
  });
});

describe("WebAuthn Lab presets", () => {
  it("creates fresh independent identifiers and challenges from the provided source", () => {
    const state = createPresetState("discoverable", sequentialRandom());

    expect(state.makeDraft.userIDHex).toBe("000102030405060708090a0b0c0d0e0f");
    expect(base64URLToHex(state.makeDraft.clientData.challenge)).toBe(
      "101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f",
    );
    expect(base64URLToHex(state.getDraft.clientData.challenge)).toBe(
      "303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f",
    );
    expect(state.makeDraft.clientData.challenge).not.toBe(state.getDraft.clientData.challenge);
    expect(state.presetID).toBe("discoverable");
    expect(state.isCustom).toBe(false);
  });

  it("applies each preset without inventing unrelated options", () => {
    const minimal = createPresetState("minimal", sequentialRandom());
    expect(buildAuthenticatorOptions(minimal.makeDraft)).toBeUndefined();
    expect(buildAuthenticatorOptions(minimal.getDraft)).toBeUndefined();

    const discoverable = createPresetState("discoverable", sequentialRandom());
    expect(buildAuthenticatorOptions(discoverable.makeDraft)).toEqual({ residentKey: true });
    expect(buildAuthenticatorOptions(discoverable.getDraft)).toBeUndefined();

    const securityKey = createPresetState("non-discoverable", sequentialRandom());
    expect(buildAuthenticatorOptions(securityKey.makeDraft)).toEqual({ residentKey: false });

    const uv = createPresetState("uv-required", sequentialRandom());
    expect(buildAuthenticatorOptions(uv.makeDraft)).toEqual({ userVerification: true });
    expect(buildAuthenticatorOptions(uv.getDraft)).toEqual({ userVerification: true });
  });
});

describe("WebAuthn Lab client data and validation", () => {
  it("builds fixed ordered create/get client data JSON", () => {
    const input = { challenge: "AQID", origin: "https://example.com" };
    expect(buildClientDataJSON("create", input)).toBe(
      '{"type":"webauthn.create","challenge":"AQID","origin":"https://example.com","crossOrigin":false}',
    );
    expect(buildClientDataJSON("get", input)).toBe(
      '{"type":"webauthn.get","challenge":"AQID","origin":"https://example.com","crossOrigin":false}',
    );
  });

  it("requires an exact HTTP(S) origin and a nonempty strict base64url challenge in builder mode", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.makeDraft.clientData.origin = "https://example.com/path";
    state.makeDraft.clientData.challenge = "not+padded=";

    expect(validateMakeCredentialDraft(state.makeDraft).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "make.clientData.origin", code: "invalid-origin" }),
      expect.objectContaining({ field: "make.clientData.challenge", code: "invalid-base64url" }),
    ]));
  });

  it("accepts ports but rejects credentials, paths, queries, fragments, and a trailing slash", () => {
    expect(isHTTPOrigin("http://localhost:8080")).toBe(true);
    expect(isHTTPOrigin("https://example.com:443")).toBe(true);
    expect(isHTTPOrigin("https://user@example.com")).toBe(false);
    expect(isHTTPOrigin("https://example.com/")).toBe(false);
    expect(isHTTPOrigin("https://example.com/path")).toBe(false);
    expect(isHTTPOrigin("https://example.com?query=1")).toBe(false);
    expect(isHTTPOrigin("https://example.com#fragment")).toBe(false);
  });

  it("warns about invalid raw JSON without blocking exact raw UTF-8 bytes", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.getDraft.clientData.mode = "raw";
    state.getDraft.clientData.rawJSON = "{not JSON}\nПривет";

    const validation = validateGetAssertionDraft(state.getDraft);
    expect(validation.valid).toBe(true);
    expect(validation.warnings).toEqual([
      { field: "get.clientData.rawJSON", code: "invalid-json" },
    ]);

    const request = buildGetAssertionRequest("session-1", state.getDraft);
    expect(base64ToUTF8(request.clientDataJSON)).toBe("{not JSON}\nПривет");
  });
});

describe("WebAuthn Lab request builders", () => {
  it("keeps algorithm order and duplicates and omits every Auto option", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.makeDraft.algorithms = ["-7", "-257", "-7", "42"];
    const request = buildMakeCredentialRequest("session-1", state.makeDraft);

    expect(request.pubKeyCredParams.map(({ alg }) => alg)).toEqual([-7, -257, -7, 42]);
    expect(request.pubKeyCredParams.map(({ type }) => type)).toEqual([
      "public-key",
      "public-key",
      "public-key",
      "public-key",
    ]);
    expect(request.options).toBeUndefined();
    expect(request.excludeList).toBeUndefined();
    expect(request.verificationFlow).toBeUndefined();
    expect(JSON.parse(JSON.stringify(request))).not.toHaveProperty("options");
  });

  it("passes explicit false, PIN flow, descriptors, and their order exactly", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.getDraft.verificationFlow = VerificationFlow.VerificationFlowPIN;
    state.getDraft.userPresence = "false";
    state.getDraft.allowList = [
      {
        credentialIDHex: "00ff",
        transports: [
          AuthenticatorTransport.AuthenticatorTransportUSB,
          AuthenticatorTransport.AuthenticatorTransportNFC,
        ],
      },
      { credentialIDHex: "aabb", transports: [] },
      { credentialIDHex: "00ff", transports: [] },
    ];

    const request = buildGetAssertionRequest("session-1", state.getDraft);
    expect(request.verificationFlow).toBe("pin");
    expect(request.options).toEqual({ userPresence: false });
    expect(request.allowList?.map(({ id }) => base64ToHex(id))).toEqual(["00ff", "aabb", "00ff"]);
    expect(request.allowList?.[0].transports).toEqual(["usb", "nfc"]);
    expect(request.allowList?.[1].transports).toBeUndefined();
    expect(JSON.parse(JSON.stringify(request.allowList?.[1]))).not.toHaveProperty("transports");
  });

  it("reports zero, fractional, unsafe, and malformed algorithm IDs", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.makeDraft.algorithms = ["0", "1.5", "9007199254740992", "ES256"];
    const validation = validateMakeCredentialDraft(state.makeDraft);

    expect(validation.valid).toBe(false);
    expect(validation.errors.filter(({ code }) => code === "invalid-algorithm")).toHaveLength(4);
  });

  it("validates all user and descriptor IDs as nonempty even-length hex", () => {
    const state = createPresetState("minimal", sequentialRandom());
    state.makeDraft.userIDHex = "abc";
    state.makeDraft.excludeList = [{ credentialIDHex: "", transports: [] }];
    state.getDraft.allowList = [{ credentialIDHex: "zz", transports: [] }];

    expect(validateMakeCredentialDraft(state.makeDraft).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "make.userIDHex", code: "invalid-hex" }),
      expect.objectContaining({ field: "make.excludeList.0.credentialIDHex", code: "required" }),
    ]));
    expect(validateGetAssertionDraft(state.getDraft).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: "get.allowList.0.credentialIDHex", code: "invalid-hex" }),
    ]));
  });
});
