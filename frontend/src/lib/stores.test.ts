import { describe, expect, it } from "vitest";

import { sanitizedJson } from "./redaction";

describe("sanitizedJson", () => {
  it("redacts interaction and PIN mutation secrets without hiding CTAP capability fields", () => {
    const json = sanitizedJson({
      pin: "123456",
      currentPIN: "111111",
      newPIN: "222222",
      pinUvAuthToken: "token",
      resetConfirmation: "erase everything",
      encIdentifier: "00112233445566778899aabbccddeeff",
      encCredStoreState: "ffeeddccbbaa99887766554433221100",
      info: {
        minPINLength: 4,
        pinUvAuthProtocols: [1, 2],
        options: {
          pinUvAuthToken: true,
        },
      },
    });
    expect(JSON.parse(json)).toEqual({
      pin: "[redacted]",
      currentPIN: "[redacted]",
      newPIN: "[redacted]",
      pinUvAuthToken: "[redacted]",
      resetConfirmation: "[redacted]",
      encIdentifier: "[redacted]",
      encCredStoreState: "[redacted]",
      info: {
        minPINLength: 4,
        pinUvAuthProtocols: [1, 2],
        options: {
          pinUvAuthToken: true,
        },
      },
    });
  });

  it("keeps spec-shaped PRF values out of sanitized JSON", () => {
    const json = sanitizedJson({
      request: {
        salt1Hex: "11".repeat(32),
        salt2Hex: "22".repeat(32),
        first: "request-prf-input",
        second: "request-prf-input-2",
      },
      result: {
        output1Hex: "aa".repeat(32),
        output2Hex: "bb".repeat(32),
        first: "ee".repeat(32),
        second: "ff".repeat(32),
      },
    });

    expect(JSON.parse(json)).toEqual({
      request: {
        salt1Hex: "11".repeat(32),
        salt2Hex: "22".repeat(32),
        first: "[redacted]",
        second: "[redacted]",
      },
      result: {
        output1Hex: "[redacted]",
        output2Hex: "[redacted]",
        first: "[redacted]",
        second: "[redacted]",
      },
    });
  });
});
