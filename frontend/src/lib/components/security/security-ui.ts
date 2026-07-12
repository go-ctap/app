import { StateValue, type RetryState } from "../../../../bindings/github.com/go-ctap/kit/model/config";
import type { Warning } from "../../../../bindings/github.com/go-ctap/kit/model/safety";

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
  if (state === StateValue.StateNotConfigured || state === StateValue.StatePreviewOnly) return "warn";
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

export function warningMessage(warning: Warning) {
  if (warning.code === "config.always_uv.change") return m.security_warning_always_uv_change();
  if (warning.code === "config.min_pin_length.policy") return m.security_warning_min_pin_policy();
  if (warning.code === "config.min_pin_length.irreversible") return m.security_warning_min_pin_irreversible();
  if (warning.code === "config.min_pin_length.enterprise_overlap") return m.security_warning_min_pin_enterprise();
  if (warning.code === "bio.enroll.mutation") return m.security_warning_bio_enroll();
  if (warning.code === "bio.rename.mutation") return m.security_warning_bio_rename();
  if (warning.code === "bio.remove.destructive") return m.security_warning_bio_remove();
  if (warning.code === "reset.factory.destructive") return m.security_warning_reset_destructive();
  if (warning.code === "reset.factory.credentials") return m.security_warning_reset_credentials();
  if (warning.code === "reset.factory.power_up_window") return m.security_warning_reset_power_up();
  return warning.message;
}

export function utf8ByteLength(value: string) {
  return new TextEncoder().encode(value).byteLength;
}
