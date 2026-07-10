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

export function formatCertificationValue(id: string, input: unknown) {
  const level = unsignedIntegerValue(input);
  if (id === "FIDO" && level !== undefined && level >= 1 && level <= 6) {
    const baseLevel = Math.ceil(level / 2);
    return `FIDO L${baseLevel}${level % 2 === 0 ? "+" : ""}`;
  }
  return value.level(String(formatListItem(input)));
}
