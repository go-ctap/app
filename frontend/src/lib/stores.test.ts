import { describe, expect, it } from "vitest";
import { sanitizeDisplayData } from "./redaction";
import { sanitizeLogData } from "./stores";

describe("sanitizeDisplayData", () => {
  it("redacts interaction and PIN mutation secrets without hiding CTAP capability fields", () => {
    expect(sanitizeDisplayData({
      pin: "123456",
      currentPIN: "111111",
      newPIN: "222222",
      pinUvAuthToken: "token",
      confirmationMessage: "reset phrase",
      resetConfirmation: "erase everything",
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
      info: {
        minPINLength: 4,
        pinUvAuthProtocols: [1, 2],
        options: {
          pinUvAuthToken: true,
        },
      },
    });
  });

  it("keeps the log sanitizer on the shared redaction contract", () => {
    expect(sanitizeLogData({ oldPIN: "111111" })).toEqual({ oldPIN: "[redacted]" });
  });
});
