import { value } from "./overview-i18n.js";

type InlineValue = string | number | boolean;

export function inlineList(items: readonly InlineValue[], fallback = value.stateUnknown()) {
  return items.length ? items.join(", ") : fallback;
}

export function compactSecretValue(input: string | undefined) {
  return input ? value.reportedChars(input.length) : value.notReported();
}
