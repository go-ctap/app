import { describe, expect, it } from "vitest";

import { VerificationFlow } from "../../bindings/github.com/go-ctap/kit/model";

import {
  buildCredentialUpdatePreviewRequest,
  normalizeCredentialUpdateForm,
  validateCredentialUpdate,
} from "./passkeys-controller";

describe("passkeys mutation requests", () => {
  it("marks only normalized fields that actually changed", () => {
    const request = buildCredentialUpdatePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      { userIDHex: "AABB", name: "old", displayName: "Visible" },
      { userIDHex: " aabb ", name: "", displayName: " Changed " },
    );

    expect(request).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      name: "",
      nameProvided: true,
      displayName: "Changed",
      displayProvided: true,
      dryRun: true,
    });
    expect(request).not.toHaveProperty("userIdHex");
    expect(request).not.toHaveProperty("userIdProvided");
  });

  it("marks a genuinely changed normalized user ID exactly", () => {
    const request = buildCredentialUpdatePreviewRequest(
      "session-1",
      VerificationFlow.VerificationFlowPIN,
      "cafe",
      { userIDHex: "AABB", name: "user", displayName: "Visible" },
      { userIDHex: " ccDD ", name: " user ", displayName: "Visible" },
    );

    expect(request).toEqual({
      sessionId: "session-1",
      verificationFlow: VerificationFlow.VerificationFlowPIN,
      credentialIdHex: "cafe",
      userIdHex: "ccdd",
      userIdProvided: true,
      dryRun: true,
    });
    expect(request).not.toHaveProperty("nameProvided");
    expect(request).not.toHaveProperty("displayProvided");
  });

  it("normalizes hex and validates required, even-length user IDs", () => {
    expect(normalizeCredentialUpdateForm({ userIDHex: " AAbb ", name: " User ", displayName: " Display " })).toEqual({
      userIDHex: "aabb",
      name: "User",
      displayName: "Display",
    });
    expect(validateCredentialUpdate(
      { userIDHex: "aa", name: "user", displayName: "User" },
      { userIDHex: "", name: "user", displayName: "User" },
    )).toBe("user-id-required");
    expect(validateCredentialUpdate(
      { userIDHex: "aa", name: "user", displayName: "User" },
      { userIDHex: "abc", name: "user", displayName: "User" },
    )).toBe("user-id-invalid-hex");
    expect(validateCredentialUpdate(
      { userIDHex: "AA", name: " user ", displayName: "User" },
      { userIDHex: "aa", name: "user", displayName: " User " },
    )).toBe("no-changes");
  });
});
