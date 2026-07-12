import type { PublicKeyCredentialParameters } from "../../bindings/github.com/go-ctap/ctap/credential";

import { value } from "./overview-i18n.js";

const COSE_ALGORITHM_NAMES = new Map<number, string>([
  [-8, "EdDSA"],
  [-7, "ES256"],
  [-257, "RS256"],
]);

type TextValue = string | number | boolean | null | undefined;

export function textValue(input: TextValue, fallback = "") {
  if (input === null || input === undefined || input === "") return fallback;
  return String(input);
}

export function integerValue(input: number | null | undefined): number | undefined {
  return typeof input === "number" && Number.isSafeInteger(input) ? input : undefined;
}

export function unsignedIntegerValue(input: number | null | undefined): number | undefined {
  const amount = integerValue(input);
  return amount !== undefined && amount >= 0 ? amount : undefined;
}

export function formatAaguid(input: string | null | undefined) {
  return textValue(input, value.notReported());
}

export function formatDateTime(input: string | null | undefined) {
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

export function mdsUrlLabel(input: string | null | undefined) {
  const text = textValue(input, "");
  if (!text) return "";
  try {
    return new URL(text).hostname || text;
  } catch {
    return text;
  }
}

export function safeMDSImage(input: string | null | undefined) {
  if (!input) return "";
  const text = input.trim();
  if (!text.startsWith("data:image/")) return "";
  if (!text.includes(";base64,")) return "";
  return text;
}

export function algorithmLabel(alg: number) {
  const name = COSE_ALGORITHM_NAMES.get(alg);
  return name ? `${name} (${alg})` : String(alg);
}

export function formatAlgorithm(input: PublicKeyCredentialParameters) {
  return `${algorithmLabel(input.alg)} / ${input.type}`;
}

export function formatIntegerHex(input: number) {
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return String(input);
  const width = amount <= 0xff ? 2 : amount <= 0xffff ? 4 : 0;
  return `0x${amount.toString(16).toUpperCase().padStart(width, "0")}`;
}

export function formatNumberWithUnit(amount: number, unit: "bytes" | "codePoints" | "") {
  if (unit === "bytes") return value.bytes(amount);
  if (unit === "codePoints") return value.codePoints(amount);
  return String(amount);
}
