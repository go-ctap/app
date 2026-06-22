import { value } from "./overview-i18n.js";

export function inlineList(items: readonly unknown[], fallback = value.stateUnknown()) {
  return items.length ? items.map((item) => String(formatListItem(item))).join(", ") : fallback;
}

export function formatListItem(input: unknown): string | number | boolean {
  if (typeof input === "number" || typeof input === "string" || typeof input === "boolean") return input;
  if (input === null || input === undefined) return value.stateUnknown();
  if (byteLength(input) !== undefined) return compactSecretValue(input);
  if (input && typeof input === "object") return stringify(input);
  return String(input);
}

export function compactSecretValue(input: unknown) {
  if (input === null || input === undefined || input === "") return value.notReported();
  const bytes = byteLength(input);
  if (bytes !== undefined) return value.reportedBytes(bytes);
  const text = String(input);
  return value.reportedChars(text.length);
}

export function byteLength(input: unknown): number | undefined {
  const bytes = byteArray(input);
  if (bytes) return bytes.length;
  if (typeof input !== "string") return undefined;

  const text = input.trim();
  if (isCanonicalUuid(text)) return 16;
  return isEvenLengthHex(text) ? text.length / 2 : undefined;
}

export function byteArray(input: unknown): Uint8Array | undefined {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (ArrayBuffer.isView(input)) {
    const view = input as ArrayBufferView;
    return new Uint8Array(view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength));
  }
  if (Array.isArray(input) && input.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) {
    return Uint8Array.from(input as number[]);
  }
  return undefined;
}

export function defaultListItemKey(input: unknown) {
  if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") return String(input);
  return stringify(input);
}

export function hasDuplicateListItems(items: readonly unknown[], key = defaultListItemKey) {
  const seen = new Set<string>();
  for (const item of items) {
    const itemKey = key(item);
    if (seen.has(itemKey)) return true;
    seen.add(itemKey);
  }
  return false;
}

export function stringify(input: unknown) {
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function isEvenLengthHex(text: string) {
  return text.length > 0 && text.length % 2 === 0 && [...text].every(isHexChar);
}

function isCanonicalUuid(text: string) {
  if (text.length !== 36) return false;
  for (const index of [8, 13, 18, 23]) {
    if (text[index] !== "-") return false;
  }
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "-" && !isHexChar(text[index])) return false;
  }
  return true;
}

function isHexChar(char: string) {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 70) || (code >= 97 && code <= 102);
}
