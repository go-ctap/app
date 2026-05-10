import type { OverviewContext } from "./overview-types.js";
import {
  algorithmListItemKey,
  arrayValue,
  boolOption,
  byteLength,
  formatIntegerHex,
  hasDuplicateListItems,
  hasOwn,
  objectValue,
  unsignedIntegerListItemKey,
  unsignedIntegerValue,
} from "./overview-utils.js";

export const CTAP_2_3_VERSION = "FIDO_2_3";
export const FORBIDDEN_VERSION_IDS = new Set(["FIDO_2_2"]);

export const CONFIG_COMMAND_ID = {
  enableEnterpriseAttestation: 0x01,
  toggleAlwaysUv: 0x02,
  setMinPINLength: 0x03,
  enableLongTouchForReset: 0x04,
  vendorPrototype: 0xff,
} as const;

const CONFIG_COMMANDS = [
  { id: CONFIG_COMMAND_ID.enableEnterpriseAttestation, name: "enableEnterpriseAttestation" },
  { id: CONFIG_COMMAND_ID.toggleAlwaysUv, name: "toggleAlwaysUv" },
  { id: CONFIG_COMMAND_ID.setMinPINLength, name: "setMinPINLength" },
  { id: CONFIG_COMMAND_ID.enableLongTouchForReset, name: "enableLongTouchForReset" },
  { id: CONFIG_COMMAND_ID.vendorPrototype, name: "vendorPrototype" },
] as const;

export const CERTIFICATION_LEVEL_RANGES = {
  "FIPS-CMVP-2": [1, 4],
  "FIPS-CMVP-3": [1, 4],
  "FIPS-CMVP-2-PHY": [1, 4],
  "FIPS-CMVP-3-PHY": [1, 4],
  "CC-EAL": [1, 7],
  FIDO: [1, 6],
  "CCN-CPSTIC": [1, 1],
} as const;

export type CtapConformanceFindingId =
  | "versions_required"
  | "aaguid_required"
  | "fido22_forbidden"
  | "pin_uv_auth_protocols_list_empty"
  | "pin_uv_auth_protocols_list_duplicate"
  | "transports_list_empty"
  | "transports_list_duplicate"
  | "algorithms_list_empty"
  | "algorithms_list_duplicate"
  | "max_credential_count_in_list_positive"
  | "max_credential_id_length_positive"
  | "max_msg_size_minimum"
  | "preferred_platform_uv_attempts_minimum"
  | "ctap23_hmac_secret"
  | "ctap23_rk_uv_state"
  | "ctap23_rk_cred_mgmt"
  | "ctap23_cred_protect"
  | "ctap23_pin_uv_auth_token"
  | "ctap23_pin_protocol_two"
  | "credblob_requires_credprotect"
  | "credblob_requires_limit"
  | "credblob_limit_invalid"
  | "credblob_limit_without_extension"
  | "largeblob_mode_conflict"
  | "largeblob_key_incomplete"
  | "largeblobs_requires_limit"
  | "largeblobs_limit_invalid"
  | "largeblobs_limit_without_command"
  | "min_pin_extension_without_option"
  | "set_min_pin_without_uv"
  | "set_min_pin_command_missing"
  | "max_rpids_invalid"
  | "max_rpids_without_set_min_pin"
  | "min_pin_length_invalid"
  | "min_pin_without_client_pin"
  | "min_pin_missing"
  | "max_pin_length_invalid"
  | "max_pin_without_client_pin"
  | "pin_complexity_extension_without_set_min_pin"
  | "pin_complexity_without_client_pin"
  | "no_mc_ga_without_client_pin"
  | "uv_bio_enroll_without_bio_enroll"
  | "uv_acfg_without_authnr_cfg"
  | "always_uv_conflict"
  | "enterprise_attestation_command_missing"
  | "vendor_prototype_command_missing"
  | "long_touch_command_missing";

export type CtapCommonValueId =
  | "empty_list"
  | "extension_reported_command_missing"
  | "mutually_exclusive_support_reported"
  | "not_listed"
  | "not_reported";

export type CtapFindingValue =
  | { kind: "common"; id: CtapCommonValueId }
  | { kind: "literal"; value: string }
  | { kind: "input"; input: unknown }
  | { kind: "list"; items: unknown[] };

export type CtapConformanceFinding = {
  id: CtapConformanceFindingId;
  source: string;
  value: CtapFindingValue;
  args?: Record<string, unknown>;
};

type NonEmptyUniqueListRule = {
  key: "pinUvAuthProtocols" | "transports" | "algorithms";
  emptyId: CtapConformanceFindingId;
  duplicateId: CtapConformanceFindingId;
  itemKey?: (input: unknown) => string;
};

const warningValue = {
  emptyList: (): CtapFindingValue => ({ kind: "common", id: "empty_list" }),
  extensionReportedCommandMissing: (): CtapFindingValue => ({ kind: "common", id: "extension_reported_command_missing" }),
  formatted: (input: unknown): CtapFindingValue => ({ kind: "input", input }),
  list: (items: unknown[]): CtapFindingValue => ({ kind: "list", items }),
  mutuallyExclusiveSupportReported: (): CtapFindingValue => ({ kind: "common", id: "mutually_exclusive_support_reported" }),
  notListed: (): CtapFindingValue => ({ kind: "common", id: "not_listed" }),
  notReported: (): CtapFindingValue => ({ kind: "common", id: "not_reported" }),
  literal: (value: string): CtapFindingValue => ({ kind: "literal", value }),
};

export function buildCtap23ConformanceFindings(context: OverviewContext = {}): CtapConformanceFinding[] {
  const info = objectValue(context.info);
  if (!Object.keys(info).length) return [];

  const options = objectValue(info.options);
  const versions = arrayValue(info.versions);
  const extensions = arrayValue(info.extensions);
  const pinUvAuthProtocols = arrayValue(info.pinUvAuthProtocols);
  const configCommands = arrayValue(info.authenticatorConfigCommands);

  const versionsKnown = Array.isArray(info.versions);
  const extensionsKnown = Array.isArray(info.extensions);
  const pinUvAuthProtocolsKnown = Array.isArray(info.pinUvAuthProtocols);
  const configCommandsKnown = Array.isArray(info.authenticatorConfigCommands);
  const isCtap23 = versionsKnown && versions.includes(CTAP_2_3_VERSION);

  const hasConfigCommand = (id: number) => configCommands.some((command) => unsignedIntegerValue(command) === id);
  const optionPresent = (id: string) => hasOwn(options, id);
  const findings: CtapConformanceFinding[] = [];
  const add = (id: CtapConformanceFindingId, source: string, value: CtapFindingValue, args?: Record<string, unknown>) => {
    findings.push(args ? { id, source, value, args } : { id, source, value });
  };

  if (!versionsKnown || !versions.length) {
    add("versions_required", "versions", warningValue.notReported(), { field: "versions" });
  }

  if (!hasOwn(info, "aaguid") || byteLength(info.aaguid) !== 16) {
    add("aaguid_required", "aaguid", hasOwn(info, "aaguid") ? warningValue.formatted(info.aaguid) : warningValue.notReported(), { field: "aaguid" });
  }

  if (versions.some((version) => FORBIDDEN_VERSION_IDS.has(String(version)))) {
    add("fido22_forbidden", "versions", warningValue.literal("FIDO_2_2"), { field: "versions", version: "FIDO_2_2" });
  }

  validateNonEmptyUniqueList(findings, info, {
    key: "pinUvAuthProtocols",
    emptyId: "pin_uv_auth_protocols_list_empty",
    duplicateId: "pin_uv_auth_protocols_list_duplicate",
    itemKey: unsignedIntegerListItemKey,
  });
  validateNonEmptyUniqueList(findings, info, {
    key: "transports",
    emptyId: "transports_list_empty",
    duplicateId: "transports_list_duplicate",
  });
  validateNonEmptyUniqueList(findings, info, {
    key: "algorithms",
    emptyId: "algorithms_list_empty",
    duplicateId: "algorithms_list_duplicate",
    itemKey: algorithmListItemKey,
  });

  validatePositiveInteger(findings, info, "maxCredentialCountInList", "max_credential_count_in_list_positive");
  validatePositiveInteger(findings, info, "maxCredentialIdLength", "max_credential_id_length_positive");
  validateMinimumInteger(findings, info, "maxMsgSize", 1024, "max_msg_size_minimum");
  validateMinimumInteger(findings, info, "preferredPlatformUvAttempts", 1, "preferred_platform_uv_attempts_minimum");

  const clientPinSupported = optionPresent("clientPin");
  const uvSupported = optionPresent("uv");
  const someUvSupported = clientPinSupported || uvSupported;
  const largeBlobsCommand = boolOption(options, "largeBlobs") === true;
  const credBlobListed = extensions.includes("credBlob");
  const setMinPinLength = boolOption(options, "setMinPINLength") === true;

  if (isCtap23 && (!extensionsKnown || !extensions.includes("hmac-secret"))) {
    add("ctap23_hmac_secret", "extensions.hmac-secret", warningValue.notListed(), { extension: "hmac-secret" });
  }

  if (isCtap23 && boolOption(options, "rk") === true) {
    if (!clientPinSupported && !uvSupported) {
      add("ctap23_rk_uv_state", "options.rk + options.clientPin/options.uv", warningValue.literal("options.rk"), { option: "rk" });
    }
    if (boolOption(options, "credMgmt") !== true) {
      add("ctap23_rk_cred_mgmt", "options.rk + options.credMgmt", warningValue.literal("options.credMgmt"), { option: "credMgmt" });
    }
  }

  if (isCtap23 && someUvSupported && extensionsKnown && !extensions.includes("credProtect")) {
    add("ctap23_cred_protect", "extensions.credProtect", warningValue.notListed(), { extension: "credProtect" });
  }

  if (isCtap23 && (boolOption(options, "clientPin") === true || boolOption(options, "uv") === true) && boolOption(options, "pinUvAuthToken") !== true) {
    add("ctap23_pin_uv_auth_token", "options.pinUvAuthToken", warningValue.literal("options.pinUvAuthToken"), { option: "pinUvAuthToken" });
  }

  if (isCtap23 && pinUvAuthProtocolsKnown && pinUvAuthProtocols.length > 0 && !pinUvAuthProtocols.includes(2)) {
    add("ctap23_pin_protocol_two", "pinUvAuthProtocols", warningValue.list(pinUvAuthProtocols), { field: "pinUvAuthProtocols", protocol: 2 });
  }

  if (credBlobListed && !extensions.includes("credProtect")) {
    add("credblob_requires_credprotect", "extensions.credBlob + extensions.credProtect", warningValue.literal("credProtect"), { extension: "credProtect" });
  }

  if (credBlobListed && !hasOwn(info, "maxCredBlobLength")) {
    add("credblob_requires_limit", "maxCredBlobLength", warningValue.notReported(), { field: "maxCredBlobLength" });
  }

  if (hasOwn(info, "maxCredBlobLength")) {
    const maxCredBlobLength = unsignedIntegerValue(info.maxCredBlobLength);
    if (maxCredBlobLength === undefined || maxCredBlobLength < 32) {
      add("credblob_limit_invalid", "maxCredBlobLength", warningValue.formatted(info.maxCredBlobLength), { field: "maxCredBlobLength", minimum: 32 });
    }
    if (extensionsKnown && !credBlobListed) {
      add("credblob_limit_without_extension", "maxCredBlobLength + extensions.credBlob", warningValue.formatted(info.maxCredBlobLength), { field: "maxCredBlobLength", extension: "credBlob" });
    }
  }

  if (extensions.includes("largeBlob") && largeBlobsCommand) {
    add("largeblob_mode_conflict", "extensions.largeBlob + options.largeBlobs", warningValue.mutuallyExclusiveSupportReported(), { extension: "largeBlob", option: "largeBlobs" });
  }

  if (extensions.includes("largeBlobKey") && !largeBlobsCommand) {
    add("largeblob_key_incomplete", "extensions.largeBlobKey + options.largeBlobs", warningValue.extensionReportedCommandMissing(), { extension: "largeBlobKey", option: "largeBlobs" });
  }

  if (largeBlobsCommand && !hasOwn(info, "maxSerializedLargeBlobArray")) {
    add("largeblobs_requires_limit", "maxSerializedLargeBlobArray", warningValue.notReported(), { field: "maxSerializedLargeBlobArray" });
  }

  if (hasOwn(info, "maxSerializedLargeBlobArray")) {
    const capacity = unsignedIntegerValue(info.maxSerializedLargeBlobArray);
    if (capacity === undefined || capacity < 1024) {
      add("largeblobs_limit_invalid", "maxSerializedLargeBlobArray", warningValue.formatted(info.maxSerializedLargeBlobArray), { field: "maxSerializedLargeBlobArray", minimum: 1024 });
    }
    if (!largeBlobsCommand) {
      add("largeblobs_limit_without_command", "maxSerializedLargeBlobArray + options.largeBlobs", warningValue.formatted(info.maxSerializedLargeBlobArray), { field: "maxSerializedLargeBlobArray", option: "largeBlobs" });
    }
  }

  if (extensions.includes("minPinLength") && boolOption(options, "setMinPINLength") !== true) {
    add("min_pin_extension_without_option", "extensions.minPinLength + options.setMinPINLength", warningValue.literal("setMinPINLength"), { extension: "minPinLength", option: "setMinPINLength" });
  }

  if (setMinPinLength) {
    if (!clientPinSupported && !uvSupported) {
      add("set_min_pin_without_uv", "options.setMinPINLength + options.clientPin/options.uv", warningValue.literal("setMinPINLength"), { option: "setMinPINLength" });
    }
    if (configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.setMinPINLength)) {
      add("set_min_pin_command_missing", "authenticatorConfigCommands", warningValue.literal("0x03"), { command: "setMinPINLength" });
    }
  }

  if (hasOwn(info, "maxRPIDsForSetMinPINLength")) {
    const amount = unsignedIntegerValue(info.maxRPIDsForSetMinPINLength);
    if (amount === undefined) {
      add("max_rpids_invalid", "maxRPIDsForSetMinPINLength", warningValue.formatted(info.maxRPIDsForSetMinPINLength), { field: "maxRPIDsForSetMinPINLength" });
    }
    if (!setMinPinLength) {
      add("max_rpids_without_set_min_pin", "maxRPIDsForSetMinPINLength + options.setMinPINLength", warningValue.formatted(info.maxRPIDsForSetMinPINLength), { field: "maxRPIDsForSetMinPINLength", option: "setMinPINLength" });
    }
  }

  if (hasOwn(info, "minPINLength")) {
    const minPinLength = unsignedIntegerValue(info.minPINLength);
    if (minPinLength === undefined || minPinLength < 4) {
      add("min_pin_length_invalid", "minPINLength", warningValue.formatted(info.minPINLength), { field: "minPINLength", minimum: 4 });
    }
    if (!clientPinSupported) {
      add("min_pin_without_client_pin", "minPINLength + options.clientPin", warningValue.formatted(info.minPINLength), { field: "minPINLength", option: "clientPin" });
    }
  } else if (clientPinSupported) {
    add("min_pin_missing", "minPINLength + options.clientPin", warningValue.notReported(), { field: "minPINLength", option: "clientPin" });
  }

  if (hasOwn(info, "maxPINLength")) {
    const maxPinLength = unsignedIntegerValue(info.maxPINLength);
    if (maxPinLength === undefined || maxPinLength < 8) {
      add("max_pin_length_invalid", "maxPINLength", warningValue.formatted(info.maxPINLength), { field: "maxPINLength", minimum: 8 });
    }
    if (!clientPinSupported) {
      add("max_pin_without_client_pin", "maxPINLength + options.clientPin", warningValue.formatted(info.maxPINLength), { field: "maxPINLength", option: "clientPin" });
    }
  }

  if (extensions.includes("pinComplexityPolicy") && !setMinPinLength) {
    add("pin_complexity_extension_without_set_min_pin", "extensions.pinComplexityPolicy + options.setMinPINLength", warningValue.literal("pinComplexityPolicy"), { extension: "pinComplexityPolicy", option: "setMinPINLength" });
  }

  if (hasOwn(info, "pinComplexityPolicy") && !clientPinSupported) {
    add("pin_complexity_without_client_pin", "pinComplexityPolicy + options.clientPin", warningValue.formatted(info.pinComplexityPolicy), { field: "pinComplexityPolicy", option: "clientPin" });
  }

  if (hasOwn(options, "noMcGaPermissionsWithClientPin") && !hasOwn(options, "clientPin")) {
    add("no_mc_ga_without_client_pin", "options.noMcGaPermissionsWithClientPin + options.clientPin", warningValue.literal("noMcGaPermissionsWithClientPin"), { option: "clientPin" });
  }

  if (hasOwn(options, "uvBioEnroll") && !hasOwn(options, "bioEnroll")) {
    add("uv_bio_enroll_without_bio_enroll", "options.uvBioEnroll + options.bioEnroll", warningValue.literal("uvBioEnroll"), { option: "bioEnroll" });
  }

  if (hasOwn(options, "uvAcfg") && !hasOwn(options, "authnrCfg")) {
    add("uv_acfg_without_authnr_cfg", "options.uvAcfg + options.authnrCfg", warningValue.literal("uvAcfg"), { option: "authnrCfg" });
  }

  if (boolOption(options, "alwaysUv") === true && boolOption(options, "makeCredUvNotRqd") === true) {
    add("always_uv_conflict", "options.alwaysUv + options.makeCredUvNotRqd", warningValue.literal("alwaysUv + makeCredUvNotRqd"), { option: "alwaysUv" });
  }

  if (isCtap23 && hasOwn(options, "ep") && configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.enableEnterpriseAttestation)) {
    add("enterprise_attestation_command_missing", "options.ep + authenticatorConfigCommands", warningValue.literal("0x01"), { command: "enableEnterpriseAttestation" });
  }

  if (hasOwn(info, "vendorPrototypeConfigCommands") && configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.vendorPrototype)) {
    add("vendor_prototype_command_missing", "authenticatorConfigCommands + vendorPrototypeConfigCommands", warningValue.literal("0xFF"), { command: "vendorPrototype" });
  }

  if (hasOwn(info, "longTouchForReset") && configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.enableLongTouchForReset)) {
    add("long_touch_command_missing", "authenticatorConfigCommands + longTouchForReset", warningValue.literal("0x04"), { command: "enableLongTouchForReset" });
  }

  return findings;
}

export function formatConfigCommand(input: unknown) {
  const id = unsignedIntegerValue(input);
  if (id === undefined) return String(input);
  const command = CONFIG_COMMANDS.find((entry) => entry.id === id);
  return command ? `${command.name} (${formatIntegerHex(id)})` : formatIntegerHex(id);
}

export function certificationLevelRange(id: string): readonly [number, number] | null {
  return CERTIFICATION_LEVEL_RANGES[id as keyof typeof CERTIFICATION_LEVEL_RANGES] ?? null;
}

export function certificationLevelValid(id: string, input: unknown) {
  const range = certificationLevelRange(id);
  const level = unsignedIntegerValue(input);
  return Boolean(range && level !== undefined && level >= range[0] && level <= range[1]);
}

function validateNonEmptyUniqueList(findings: CtapConformanceFinding[], info: Record<string, unknown>, rule: NonEmptyUniqueListRule) {
  if (!hasOwn(info, rule.key)) return;

  const list = arrayValue(info[rule.key]);
  const add = (id: CtapConformanceFindingId, value: CtapFindingValue) => {
    findings.push({ id, source: rule.key, value, args: { field: rule.key } });
  };

  if (!Array.isArray(info[rule.key]) || list.length === 0) {
    add(rule.emptyId, warningValue.emptyList());
    return;
  }

  if (hasDuplicateListItems(list, rule.itemKey)) {
    add(rule.duplicateId, warningValue.list(list));
  }
}

function validatePositiveInteger(findings: CtapConformanceFinding[], info: Record<string, unknown>, key: string, id: CtapConformanceFindingId) {
  if (!hasOwn(info, key)) return;
  const amount = unsignedIntegerValue(info[key]);
  if (amount !== undefined && amount > 0) return;
  findings.push({
    id,
    source: key,
    value: warningValue.formatted(info[key]),
    args: { field: key, minimum: 1 },
  });
}

function validateMinimumInteger(findings: CtapConformanceFinding[], info: Record<string, unknown>, key: string, minimum: number, id: CtapConformanceFindingId) {
  if (!hasOwn(info, key)) return;
  const amount = unsignedIntegerValue(info[key]);
  if (amount !== undefined && amount >= minimum) return;
  findings.push({
    id,
    source: key,
    value: warningValue.formatted(info[key]),
    args: { field: key, minimum },
  });
}
