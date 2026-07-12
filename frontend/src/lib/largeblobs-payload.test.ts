import { describe, expect, it } from "vitest";

import { parseLargeBlobPayload } from "./largeblobs-payload";

describe("large blob payload encoding", () => {
  it("encodes UTF-8 text, including non-ASCII code points, as base64", () => {
    const result = parseLargeBlobPayload("Привет 👋", "utf8");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.base64).toBe("0J/RgNC40LLQtdGCIPCfkYs=");
    expect(result.byteCount).toBe(17);
    expect(Array.from(result.bytes)).toEqual(Array.from(new TextEncoder().encode("Привет 👋")));
  });

  it("accepts arbitrary whitespace between hex bytes", () => {
    const result = parseLargeBlobPayload("00 ff\n10\tA5", "hex");

    expect(result).toEqual({
      ok: true,
      bytes: new Uint8Array([0x00, 0xff, 0x10, 0xa5]),
      base64: "AP8QpQ==",
      byteCount: 4,
    });
  });

  it("rejects prefixes, separators, non-hex characters, and odd nibbles", () => {
    expect(parseLargeBlobPayload("0x10", "hex")).toEqual({ ok: false, error: "invalid-hex-character" });
    expect(parseLargeBlobPayload("aa:bb", "hex")).toEqual({ ok: false, error: "invalid-hex-character" });
    expect(parseLargeBlobPayload("gg", "hex")).toEqual({ ok: false, error: "invalid-hex-character" });
    expect(parseLargeBlobPayload("abc", "hex")).toEqual({ ok: false, error: "odd-hex-length" });
  });

  it("keeps an empty payload explicit for both encodings", () => {
    expect(parseLargeBlobPayload("", "utf8")).toMatchObject({ ok: true, base64: "", byteCount: 0 });
    expect(parseLargeBlobPayload(" \n\t", "hex")).toMatchObject({ ok: true, base64: "", byteCount: 0 });
  });
});
