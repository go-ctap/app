import type { Warning } from "../../bindings/github.com/go-ctap/kit/model/safety";

import { m } from "../paraglide/messages.js";

const warningMessages: Readonly<Record<string, () => string>> = {
  "bio.enroll.mutation": m.security_warning_bio_enroll,
  "bio.remove.destructive": m.security_warning_bio_remove,
  "bio.rename.mutation": m.security_warning_bio_rename,
  "config.always_uv.change": m.security_warning_always_uv_change,
  "config.min_pin_length.enterprise_overlap": m.security_warning_min_pin_enterprise,
  "config.min_pin_length.irreversible": m.security_warning_min_pin_irreversible,
  "config.min_pin_length.policy": m.security_warning_min_pin_policy,
  "credential.delete.destructive": m.credential_delete_warning_destructive,
  "credential.delete.irreversible": m.credential_delete_warning_irreversible,
  "credential.update_user.mutation": m.credential_update_warning_mutation,
  "credential.update_user.scope": m.credential_update_warning_scope,
  "large_blob.delete_existing": m.large_blob_delete_warning,
  "large_blob.delete_noop": m.large_blob_delete_noop,
  "large_blob.garbage_collect_unmatched": m.large_blob_cleanup_warning_unmatched,
  "large_blob.replace_existing": m.large_blob_replace_warning,
  "large_blob.shared_array_rewrite": m.large_blob_shared_array_warning,
  "pin.change.mutation": m.security_warning_pin_change,
  "pin.dry_run.local_only": m.security_warning_pin_dry_run,
  "pin.mutation": m.security_warning_pin_mutation,
  "pin.set.mutation": m.security_warning_pin_set,
  "reset.factory.credentials": m.security_warning_reset_credentials,
  "reset.factory.destructive": m.security_warning_reset_destructive,
  "reset.factory.power_up_window": m.security_warning_reset_power_up,
  "webauthn.make_credential.mutation": m.warning_webauthn_make_credential_mutation,
};

export function warningMessage(warning: Warning): string {
  return warningMessages[warning.code]?.() ?? warning.message;
}
