export type LargeBlobPayloadEncoding = "utf8" | "hex";
export type LargeBlobPayloadValidationError = "invalid-hex-character" | "odd-hex-length";

export type LargeBlobPayloadParseResult =
  | {
      ok: true;
      bytes: Uint8Array;
      base64: string;
      byteCount: number;
    }
  | {
      ok: false;
      error: LargeBlobPayloadValidationError;
    };

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function parseLargeBlobPayload(
  value: string,
  encoding: LargeBlobPayloadEncoding,
): LargeBlobPayloadParseResult {
  if (encoding === "utf8") {
    const bytes = new TextEncoder().encode(value);
    return {
      ok: true,
      bytes,
      base64: bytesToBase64(bytes),
      byteCount: bytes.byteLength,
    };
  }

  if (/[^0-9a-f\s]/i.test(value)) {
    return { ok: false, error: "invalid-hex-character" };
  }

  const normalized = value.replace(/\s/g, "");
  if (normalized.length % 2 !== 0) {
    return { ok: false, error: "odd-hex-length" };
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let offset = 0; offset < normalized.length; offset += 2) {
    bytes[offset / 2] = Number.parseInt(normalized.slice(offset, offset + 2), 16);
  }

  return {
    ok: true,
    bytes,
    base64: bytesToBase64(bytes),
    byteCount: bytes.byteLength,
  };
}
