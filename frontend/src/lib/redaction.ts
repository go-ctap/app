const REDACTED = "[redacted]";

const SECRET_FIELD_NAMES = new Set([
  "pin",
  "pinCode",
  "currentPIN",
  "pinUvAuthToken",
  "pinUVAuthToken",
  "newPIN",
  "newPin",
  "oldPIN",
  "oldPin",
  "confirmationMessage",
  "resetConfirmation",
  "resetPhrase",
]);

const NORMALIZED_SECRET_FIELD_NAMES = new Set([...SECRET_FIELD_NAMES].map(normalizeFieldName));

function normalizeFieldName(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isSecretFieldName(key: string) {
  return NORMALIZED_SECRET_FIELD_NAMES.has(normalizeFieldName(key));
}

function shouldRedactField(key: string, value: unknown) {
  if (!isSecretFieldName(key)) return false;
  return typeof value !== "boolean";
}

export function sanitizeDisplayData(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeDisplayData(item, depth + 1));

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    output[key] = shouldRedactField(key, item) ? REDACTED : sanitizeDisplayData(item, depth + 1);
  }
  return output;
}

export function sanitizedJson(value: unknown) {
  return JSON.stringify(sanitizeDisplayData(value), null, 2);
}
