# Overview refactor

Split replacement for the previous single `overview-rules.ts`.

## Files

- `overview-rules.ts` — public entrypoint; keeps the existing exported API.
- `overview-types.ts` — exported model types only.
- `overview-i18n.ts` — Paraglide bridge, value helpers, and explicit CTAP warning localization.
- `overview-utils.ts` — formatting/normalization helpers.
- `overview-shared.ts` — common row/group helpers.
- `overview-ctap23.ts` — CTAP 2.3 constants and data-only conformance findings. It does not import Paraglide and does not contain human-facing prose.
- `overview-conformance.ts` — localized `buildOverviewConformanceWarnings()` wrapper.
- `overview-matrix-rules.ts` — localized matrix metadata such as extension and certification labels.
- `overview-rows.ts` — table rows.
- `overview-signals.ts` — hero signal cards.
- `overview-hero.ts` — MDS hero model and minimal MDS observations.

Copy these files into the directory where the original `overview-rules.ts` lived. Imports assume the existing `../paraglide/messages.js` path.

## Intentional changes

- Removed `MATRIX_VALUE_MESSAGES` and regex-based post-processing of row values.
- Row values are localized at the call site through Paraglide/value helpers.
- Removed dynamic CTAP translation-key generation. `overview-i18n.ts` references every CTAP warning key directly via `m.overview_ctap_warning_*`.
- Missing CTAP translation keys now fail at the generated Paraglide/TypeScript layer instead of falling back silently.
- CTAP checks emit stable data-only findings from `overview-ctap23.ts`; localization is isolated in `overview-i18n.ts`.
- Removed live-vs-MDS deep diffing from overview. `buildOverviewMDSObservations()` reports only dangerous MDS status reports.
- Reduced certification display to one summary row; certification ranges are still checked against CTAP 2.3.
- Reduced COSE algorithm display to one summary row.
- Kept CTAP 2.3 conformance checks that are explicit in the spec and cheap to determine from getInfo.

## Required CTAP warning translation keys

Each finding id below is referenced explicitly in `overview-i18n.ts` as three Paraglide keys:

- `overview_ctap_warning_<id>_name`
- `overview_ctap_warning_<id>_description`
- `overview_ctap_warning_<id>_value`

This is only the naming convention for the concrete keys in the file; the code does not synthesize these names at runtime.

The description/value messages receive this argument object:

```ts
{
  id: CtapConformanceFindingId;
  source: string;
  value: string;
  field: string;
  minimum: number;
  command: string;
  extension: string;
  option: string;
  protocol: string;
  version: string;
}
```

Finding ids:

- `versions_required`
- `aaguid_required`
- `fido22_forbidden`
- `pin_uv_auth_protocols_list_empty`
- `pin_uv_auth_protocols_list_duplicate`
- `transports_list_empty`
- `transports_list_duplicate`
- `algorithms_list_empty`
- `algorithms_list_duplicate`
- `max_credential_count_in_list_positive`
- `max_credential_id_length_positive`
- `max_msg_size_minimum`
- `preferred_platform_uv_attempts_minimum`
- `ctap23_hmac_secret`
- `ctap23_rk_uv_state`
- `ctap23_rk_cred_mgmt`
- `ctap23_cred_protect`
- `ctap23_pin_uv_auth_token`
- `ctap23_pin_protocol_two`
- `credblob_requires_credprotect`
- `credblob_requires_limit`
- `credblob_limit_invalid`
- `credblob_limit_without_extension`
- `largeblob_mode_conflict`
- `largeblob_key_incomplete`
- `largeblobs_requires_limit`
- `largeblobs_limit_invalid`
- `largeblobs_limit_without_command`
- `min_pin_extension_without_option`
- `set_min_pin_without_uv`
- `set_min_pin_command_missing`
- `max_rpids_invalid`
- `max_rpids_without_set_min_pin`
- `min_pin_length_invalid`
- `min_pin_without_client_pin`
- `min_pin_missing`
- `max_pin_length_invalid`
- `max_pin_without_client_pin`
- `pin_complexity_extension_without_set_min_pin`
- `pin_complexity_without_client_pin`
- `no_mc_ga_without_client_pin`
- `uv_bio_enroll_without_bio_enroll`
- `uv_acfg_without_authnr_cfg`
- `always_uv_conflict`
- `enterprise_attestation_command_missing`
- `vendor_prototype_command_missing`
- `long_touch_command_missing`

Useful extraction command:

```sh
grep -o 'overview_ctap_warning_[a-z0-9_]*' overview-i18n.ts | sort -u
```
