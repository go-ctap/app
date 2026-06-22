import { CERTIFICATION_LEVEL_RANGES, certificationLevelRange } from "./overview-ctap23.js";
import { m, value } from "./overview-i18n.js";
import { formatListItem } from "./overview-raw-format.js";
import { unsignedIntegerValue } from "./overview-utils.js";

export const EXTENSION_ROWS = [
  { id: "credProtect", name: m.matrix_name_credential_protection, description: m.matrix_desc_cred_protect },
  { id: "credBlob", name: m.matrix_name_credential_blob, description: m.matrix_desc_cred_blob },
  { id: "largeBlobKey", name: m.matrix_name_large_blob_key, description: m.matrix_desc_large_blob_key_extension_item },
  { id: "largeBlob", name: m.matrix_name_large_blob, description: m.matrix_desc_large_blob_extension_item },
  { id: "minPinLength", name: m.matrix_name_minimum_pin_length, description: m.matrix_desc_min_pin_length_extension },
  { id: "pinComplexityPolicy", name: m.matrix_name_pin_complexity_policy, description: m.matrix_desc_pin_complexity_extension },
  { id: "hmac-secret", name: m.matrix_name_hmac_secret, description: m.matrix_desc_hmac_secret },
  { id: "hmac-secret-mc", name: m.matrix_name_hmac_secret_at_creation, description: m.matrix_desc_hmac_secret_mc },
  { id: "thirdPartyPayment", name: m.matrix_name_third_party_payment, description: m.matrix_desc_third_party_payment },
] as const;

export const CERTIFICATION_ROWS = [
  { id: "FIPS-CMVP-2", name: m.matrix_name_fips1402_overall, description: m.matrix_desc_fips1402_overall, range: CERTIFICATION_LEVEL_RANGES["FIPS-CMVP-2"] },
  { id: "FIPS-CMVP-3", name: m.matrix_name_fips1403_overall, description: m.matrix_desc_fips1403_overall, range: CERTIFICATION_LEVEL_RANGES["FIPS-CMVP-3"] },
  { id: "FIPS-CMVP-2-PHY", name: m.matrix_name_fips1402_physical, description: m.matrix_desc_fips1402_physical, range: CERTIFICATION_LEVEL_RANGES["FIPS-CMVP-2-PHY"] },
  { id: "FIPS-CMVP-3-PHY", name: m.matrix_name_fips1403_physical, description: m.matrix_desc_fips1403_physical, range: CERTIFICATION_LEVEL_RANGES["FIPS-CMVP-3-PHY"] },
  { id: "CC-EAL", name: m.matrix_name_common_criteria_eal, description: m.matrix_desc_common_criteria, range: CERTIFICATION_LEVEL_RANGES["CC-EAL"] },
  { id: "FIDO", name: m.matrix_name_fido_certification, description: m.matrix_desc_fido_certification, range: CERTIFICATION_LEVEL_RANGES.FIDO },
  { id: "CCN-CPSTIC", name: m.matrix_name_ccn_cpstic_listing, description: m.matrix_desc_ccn_cpstic, range: CERTIFICATION_LEVEL_RANGES["CCN-CPSTIC"] },
] as const;

export function formatCertificationValue(id: string, input: unknown) {
  const level = unsignedIntegerValue(input);
  if (id === "FIDO" && level !== undefined && level >= 1 && level <= 6) {
    const baseLevel = Math.ceil(level / 2);
    return `FIDO L${baseLevel}${level % 2 === 0 ? "+" : ""}`;
  }
  return value.level(String(formatListItem(input)));
}

export function certificationRangeLabel(id: string) {
  const range = certificationLevelRange(id);
  if (!range) return value.integerValue();

  const [min, max] = range;
  return min === max ? value.integerExact(min) : value.integerRange(min, max);
}
