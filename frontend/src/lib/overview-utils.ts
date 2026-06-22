import { value } from "./overview-i18n.js";
import {
  byteArray,
  defaultListItemKey,
  formatListItem,
  stringify,
} from "./overview-raw-format.js";

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

function uuidFromBytes(bytes: Uint8Array) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
