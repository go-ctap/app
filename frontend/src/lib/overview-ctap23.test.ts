import { describe, expect, it } from "vitest";
import { buildCtap23ConformanceFindings, type CtapConformanceFindingId } from "./overview-ctap23";
import type { OverviewContext } from "./overview-types";

function findingIds(context: OverviewContext): CtapConformanceFindingId[] {
  return buildCtap23ConformanceFindings(context).map((finding) => finding.id);
}

function validCtap23Context(overrides: Record<string, unknown> = {}): OverviewContext {
  return {
    info: {
      versions: ["FIDO_2_3"],
      aaguid: "00112233-4455-6677-8899-aabbccddeeff",
      extensions: ["hmac-secret", "credProtect"],
      options: {
        rk: true,
        clientPin: true,
        credMgmt: true,
        pinUvAuthToken: true,
        largeBlobs: true,
        setMinPINLength: true,
      },
      pinUvAuthProtocols: [2],
      transports: ["usb"],
      algorithms: [{ type: "public-key", alg: -7 }],
      authenticatorConfigCommands: [3],
      maxCredentialCountInList: 1,
      maxCredentialIdLength: 64,
      maxMsgSize: 1200,
      preferredPlatformUvAttempts: 1,
      maxSerializedLargeBlobArray: 1024,
      minPINLength: 4,
      maxPINLength: 64,
      maxRPIDsForSetMinPINLength: 3,
      ...overrides,
    },
  };
}

describe("buildCtap23ConformanceFindings", () => {
  it("does not warn for a complete CTAP 2.3 getInfo profile", () => {
    expect(findingIds(validCtap23Context())).toEqual([]);
  });

  it("flags CTAP 2.3 PIN/UV token and protocol requirements", () => {
    expect(findingIds(validCtap23Context({
      options: {
        clientPin: true,
        credMgmt: true,
        pinUvAuthToken: false,
        rk: true,
      },
      pinUvAuthProtocols: [1],
    }))).toEqual(expect.arrayContaining([
      "ctap23_pin_uv_auth_token",
      "ctap23_pin_protocol_two",
    ]));
  });

  it("flags minimum PIN length capability inconsistencies", () => {
    expect(findingIds(validCtap23Context({
      extensions: ["hmac-secret", "credProtect", "minPinLength"],
      options: {
        setMinPINLength: true,
      },
      authenticatorConfigCommands: [],
      minPINLength: 3,
      maxPINLength: 7,
      maxRPIDsForSetMinPINLength: 2,
    }))).toEqual(expect.arrayContaining([
      "set_min_pin_without_uv",
      "set_min_pin_command_missing",
      "min_pin_length_invalid",
      "min_pin_without_client_pin",
      "max_pin_length_invalid",
      "max_pin_without_client_pin",
    ]));
  });

  it("flags malformed or duplicate required lists", () => {
    expect(findingIds(validCtap23Context({
      pinUvAuthProtocols: [2, 2],
      transports: [],
      algorithms: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -7 },
      ],
    }))).toEqual(expect.arrayContaining([
      "pin_uv_auth_protocols_list_duplicate",
      "transports_list_empty",
      "algorithms_list_duplicate",
    ]));
  });
});
