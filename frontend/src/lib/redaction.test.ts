import { describe, expect, it } from "vitest";

import { sanitizedJson } from "./redaction";

describe("sensitive output redaction", () => {
  it("redacts persistent credential-store identifiers from general JSON", () => {
    const json = sanitizedJson({
      authenticatorIdentifierHex: "00010203",
      credentialStoreStateHex: "10111213",
    });

    expect(json).not.toContain("00010203");
    expect(json).not.toContain("10111213");
    expect(json?.match(/\[redacted\]/g)).toHaveLength(2);
  });
});
