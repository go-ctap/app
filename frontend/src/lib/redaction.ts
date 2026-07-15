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
  "encIdentifier",
  "encCredStoreState",
  "output1Hex",
  "output2Hex",
  "first",
  "second",
].map(normalizeFieldName));

function normalizeFieldName(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function shouldRedactField(key: string, value: unknown) {
  return SECRET_FIELD_NAMES.has(normalizeFieldName(key)) && typeof value !== "boolean";
}

export function sanitizedJson(value: unknown) {
  return JSON.stringify(
    value,
    (key, item) => key && shouldRedactField(key, item) ? REDACTED : item,
    2,
  );
}
