import { describe, expect, it } from "vitest";
import { sanitizeLogData } from "./stores";

describe("sanitizeLogData", () => {
  it("redacts interaction and PIN mutation secrets without hiding CTAP capability fields", () => {
    expect(sanitizeLogData({
      pin: "123456",
      currentPIN: "111111",
      newPIN: "222222",
      pinUvAuthToken: "token",
      confirmationMessage: "reset phrase",
      info: {
        minPINLength: 4,
        pinUvAuthProtocols: [1, 2],
      },
    })).toEqual({
      pin: "[redacted]",
      currentPIN: "[redacted]",
      newPIN: "[redacted]",
      pinUvAuthToken: "[redacted]",
      confirmationMessage: "[redacted]",
      info: {
        minPINLength: 4,
        pinUvAuthProtocols: [1, 2],
      },
    });
  });
});
