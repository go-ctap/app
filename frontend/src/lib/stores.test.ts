import { describe, expect, it } from "vitest";

import { sanitizeDisplayData } from "./redaction";

describe("sanitizeDisplayData", () => {
  it("redacts interaction and PIN mutation secrets without hiding CTAP capability fields", () => {
    expect(sanitizeDisplayData({
      pin: "123456",
      currentPIN: "111111",
      newPIN: "222222",
      pinUvAuthToken: "token",
      confirmationMessage: "reset phrase",
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
    })).toEqual({
      pin: "[redacted]",
      currentPIN: "[redacted]",
      newPIN: "[redacted]",
      pinUvAuthToken: "[redacted]",
      confirmationMessage: "[redacted]",
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
});
