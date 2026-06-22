import { value } from "./overview-i18n.js";

const COSE_ALGORITHM_NAMES = new Map<number, string>([
  [-8, "EdDSA"],
  [-7, "ES256"],
  [-257, "RS256"],
]);

export function textValue(input: unknown, fallback = "") {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input);
}

export function integerValue(input: unknown): number | undefined {
  return typeof input === "number" && Number.isSafeInteger(input) ? input : undefined;
}

export function unsignedIntegerValue(input: unknown): number | undefined {
  const amount = integerValue(input);
  return amount !== undefined && amount >= 0 ? amount : undefined;
}

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

export function formatAaguid(input: unknown) {
  if (typeof input === "string") return input;
  const bytes = byteArray(input);
  return bytes?.length === 16 ? uuidFromBytes(bytes) : textValue(input, value.notReported());
}

export function formatDateTime(input: unknown) {
  const text = textValue(input, "");
  if (!text || text.startsWith("0001-01-01")) return "";
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function mdsUrlLabel(input: unknown) {
  const text = textValue(input, "");
  if (!text) return "";
  try {
    return new URL(text).hostname || text;
  } catch {
    return text;
  }
}

export function safeMDSImage(input: unknown) {
  if (typeof input !== "string") return "";
  const text = input.trim();
  if (!text.startsWith("data:image/")) return "";
  if (!text.includes(";base64,")) return "";
  return text;
}

export function algorithmIdentifier(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const item = input as Record<string, unknown>;
    return integerValue(item.alg) ?? integerValue(item.algorithm) ?? integerValue(item["3"]);
  }
  return undefined;
}

export function algorithmType(input: unknown) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const item = input as Record<string, unknown>;
    return typeof item.type === "string" && item.type ? item.type : "public-key";
  }
  return "";
}

export function algorithmLabel(alg: number) {
  const name = COSE_ALGORITHM_NAMES.get(alg);
  return name ? `${name} (${alg})` : String(alg);
}

export function formatAlgorithm(input: unknown) {
  const alg = algorithmIdentifier(input);
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const type = algorithmType(input);
    return alg === undefined ? stringify(input) : `${algorithmLabel(alg)} / ${type}`;
  }
  return alg === undefined ? formatListItem(input) : algorithmLabel(alg);
}

export function algorithmListItemKey(input: unknown) {
  if (input && typeof input === "object" && !Array.isArray(input)) {
    const alg = algorithmIdentifier(input);
    const type = algorithmType(input) || "public-key";
    return `${type}:${alg ?? stringify(input)}`;
  }
  return defaultListItemKey(input);
}

export function unsignedIntegerListItemKey(input: unknown) {
  const amount = unsignedIntegerValue(input);
  return amount === undefined ? defaultListItemKey(input) : String(amount);
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

export function formatIntegerHex(input: unknown) {
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return String(formatListItem(input));
  const width = amount <= 0xff ? 2 : amount <= 0xffff ? 4 : 0;
  return `0x${amount.toString(16).toUpperCase().padStart(width, "0")}`;
}

export function formatNumberWithUnit(amount: number, unit: "bytes" | "codePoints" | "") {
  if (unit === "bytes") return value.bytes(amount);
  if (unit === "codePoints") return value.codePoints(amount);
  return String(amount);
}

export function stringify(input: unknown) {
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function uuidFromBytes(bytes: Uint8Array) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
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
