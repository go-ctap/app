import {
  StateValue,
  type RetryState,
} from "../../../../bindings/github.com/go-ctap/kit/model/config";

import { m } from "../../../paraglide/messages.js";

export type SecurityTone = "ok" | "bad" | "warn" | "neutral";

export function stateLabel(state: StateValue) {
  if (state === StateValue.StateSupported) return m.status_supported();

  if (state === StateValue.StateUnsupported) return m.status_unsupported();

  if (state === StateValue.StateConfigured) return m.status_configured();

  if (state === StateValue.StateNotConfigured) return m.status_not_configured();

  if (state === StateValue.StatePreviewOnly) return m.preview_only();

  return m.state_unknown();
}

export function stateTone(state: StateValue): SecurityTone {
  if (state === StateValue.StateConfigured || state === StateValue.StateSupported) return "ok";

  if (state === StateValue.StateUnsupported) return "neutral";

  if (state === StateValue.StateNotConfigured || state === StateValue.StatePreviewOnly)
    return "warn";

  return "neutral";
}

export function booleanState(value: boolean | null | undefined) {
  if (value === true) return m.status_enabled();

  if (value === false) return m.status_disabled();

  return m.state_unknown();
}

export function reportedNumber(value: number | null | undefined) {
  return value == null ? m.not_reported() : String(value);
}

export function retryValue(retry: RetryState) {
  if (retry.remaining != null) return m.security_retries_remaining({ count: retry.remaining });

  return stateLabel(retry.state);
}

export function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
