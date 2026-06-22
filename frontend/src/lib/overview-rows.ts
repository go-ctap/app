import { m, value } from "./overview-i18n.js";
import { Option } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { MessageText, OverviewBioSensorReport, OverviewContext, OverviewInspectInfo, OverviewRow, OverviewRowStatus } from "./overview-types.js";
import { CTAP_2_3_VERSION, FORBIDDEN_VERSION_IDS, certificationLevelValid, formatConfigCommand } from "./overview-ctap23.js";
import { CERTIFICATION_ROWS, EXTENSION_ROWS, certificationRangeLabel, formatCertificationValue } from "./overview-matrix-rules.js";
import { row } from "./overview-shared.js";
import {
  algorithmListItemKey,
  byteLength,
  compactSecretValue,
  formatAaguid,
  formatAlgorithm,
  formatIntegerHex,
  formatListItem,
  formatNumberWithUnit,
  hasDuplicateListItems,
  inlineList,
  textValue,
  unsignedIntegerListItemKey,
  unsignedIntegerValue,
} from "./overview-utils.js";

type OverviewOptions = NonNullable<OverviewInspectInfo["options"]>;
type OverviewOptionKey = Option;
type NumberInfoKey = {
  [K in keyof OverviewInspectInfo]-?: Exclude<OverviewInspectInfo[K], null | undefined> extends number ? K : never;
}[keyof OverviewInspectInfo];
type BooleanInfoKey = {
  [K in keyof OverviewInspectInfo]-?: Exclude<OverviewInspectInfo[K], null | undefined> extends boolean ? K : never;
}[keyof OverviewInspectInfo];
type Certifications = NonNullable<OverviewInspectInfo["certifications"]>;

const optionKey = {
  alwaysUv: Option.OptionAlwaysUv,
  authnrCfg: Option.OptionAuthenticatorConfig,
  bioEnroll: Option.OptionBioEnroll,
  clientPin: Option.OptionClientPIN,
  credMgmt: Option.OptionCredentialManagement,
  credentialMgmtPreview: Option.OptionCredentialManagementPreview,
  ep: Option.OptionEnterpriseAttestation,
  largeBlobs: Option.OptionLargeBlobs,
  makeCredUvNotRqd: Option.OptionMakeCredentialUvNotRequired,
  noMcGaPermissionsWithClientPin: Option.OptionNoMcGaPermissionsWithClientPin,
  perCredMgmtRO: Option.OptionCredentialManagementReadOnly,
  pinUvAuthToken: Option.OptionPinUvAuthToken,
  plat: Option.OptionPlatformDevice,
  rk: Option.OptionResidentKeys,
  setMinPINLength: Option.OptionSetMinPINLength,
  up: Option.OptionUserPresence,
  userVerificationMgmtPreview: Option.OptionUserVerificationMgmtPreview,
  uv: Option.OptionUserVerification,
  uvAcfg: Option.OptionUvAcfg,
  uvBioEnroll: Option.OptionUvBioEnroll,
} as const satisfies Record<string, OverviewOptionKey>;

export function buildOverviewRows(context: OverviewContext = {}): OverviewRow[] {
  const info = context.info;
  if (!info) return [];

  const device = context.device ?? null;
  const bioSensor = context.bioSensor ?? null;
  const options = info.options;
  const versions = info.versions;
  const extensions = info.extensions ?? [];
  const transports = info.transports ?? [];
  const algorithms = info.algorithms ?? [];
  const attestationFormats = info.attestationFormats ?? [];
  const pinUvAuthProtocols = info.pinUvAuthProtocols ?? [];
  const certifications = info.certifications ?? {};

  const getInfoReported = true;
  const versionsKnown = true;
  const extensionsKnown = info.extensions !== undefined;
  const attestationFormatsKnown = info.attestationFormats !== undefined;
  const pinUvAuthProtocolsKnown = info.pinUvAuthProtocols !== undefined;
  const certificationsKnown = info.certifications !== undefined;
  const largeBlobsCommand = optionValue(options, optionKey.largeBlobs) === true;

  return [
    aaguidRow(info, getInfoReported),
    row("Identity", m.matrix_name_device_id, m.matrix_desc_device_id, valueStatus(device?.deviceId), textValue(device?.deviceId, value.notReported()), "device.deviceId"),
    transportRow(info, device, transports),
    optionRow("Identity", m.matrix_name_platform_attachment, m.matrix_desc_platform_attachment, optionValue(options, optionKey.plat), "enabled", "disabled", "options.plat", value.defaultFalse()),
    row("Identity", m.matrix_name_encrypted_device_identifier, m.matrix_desc_encrypted_device_identifier, valueStatus(info.encIdentifier), compactSecretValue(info.encIdentifier), "encIdentifier"),

    versionsRow(getInfoReported, versionsKnown, versions),
    versionRow("U2F", m.matrix_desc_u2f, versionsKnown, versions, "U2F_V2"),
    versionRow("FIDO 2.0", m.matrix_desc_fido20, versionsKnown, versions, "FIDO_2_0"),
    versionRow("FIDO 2.1 Preview", m.matrix_desc_fido21_preview, versionsKnown, versions, "FIDO_2_1_PRE"),
    versionRow("FIDO 2.1", m.matrix_desc_fido21, versionsKnown, versions, "FIDO_2_1"),
    versionRow("FIDO 2.3", m.matrix_desc_fido23, versionsKnown, versions, CTAP_2_3_VERSION),
    algorithmListRow(info, algorithms),

    upRow(options),
    optionRow("Verification", m.matrix_name_discoverable_credentials, m.matrix_desc_rk, optionValue(options, optionKey.rk), "supported", "unsupported", "options.rk", value.defaultFalse()),
    clientPinRow(options),
    uvRow(options),
    optionRow("Verification", m.matrix_name_pin_uv_auth_token_permissions, m.matrix_desc_pin_uv_auth_token, optionValue(options, optionKey.pinUvAuthToken), "supported", "unsupported", "options.pinUvAuthToken", value.defaultFalse()),
    noMcGaPermissionsRow(options),
    row("Verification", m.matrix_name_pin_uv_auth_protocols, m.matrix_desc_pin_uv_protocols, listStatus(pinUvAuthProtocolsKnown, pinUvAuthProtocols, unsignedIntegerListItemKey), inlineList(pinUvAuthProtocols, value.notReported()), "pinUvAuthProtocols"),
    triStateOptionRow("Verification", m.matrix_name_biometric_enrollment, m.matrix_desc_bio_enroll, optionValue(options, optionKey.bioEnroll), "configured", "not configured", "unsupported", "options.bioEnroll"),
    triStateOptionRow("Verification", m.matrix_name_biometric_enrollment_preview, m.matrix_desc_bio_enroll_preview, optionValue(options, optionKey.userVerificationMgmtPreview), "configured", "not configured", "unsupported", "options.userVerificationMgmtPreview"),
    optionRow("Verification", m.matrix_name_uv_biometric_enrollment_permission, m.matrix_desc_uv_bio_enroll, optionValue(options, optionKey.uvBioEnroll), "supported", "unsupported", "options.uvBioEnroll", value.defaultFalse()),
    row("Verification", m.matrix_name_biometric_modality, m.matrix_desc_bio_modality, valueStatus(bioSensor?.modality), textValue(bioSensor?.modality, value.notReported()), "bioSensor.modality"),
    uintRow("Verification", m.matrix_name_uv_modality_bit_flags, m.matrix_desc_uv_modality, info, "uvModality"),
    uintRow("Verification", m.matrix_name_preferred_platform_uv_attempts, m.matrix_desc_preferred_platform_uv_attempts, info, "preferredPlatformUvAttempts", "", 1),
    uintRow("Verification", m.matrix_name_uv_count_since_last_pin_entry, m.matrix_desc_uv_count_since_last_pin_entry, info, "uvCountSinceLastPinEntry"),

    largeBlobsCommandRow(largeBlobsCommand, unsignedIntegerValue(info.maxSerializedLargeBlobArray)),
    largeBlobKeyRow(extensionsKnown, extensions, largeBlobsCommand),
    largeBlobCapacityRow(info, largeBlobsCommand),
    maxCredBlobLengthRow(info, extensionsKnown, extensions),
    row("Storage", m.matrix_name_encrypted_credential_store_state, m.matrix_desc_encrypted_credential_store_state, valueStatus(info.encCredStoreState), compactSecretValue(info.encCredStoreState), "encCredStoreState"),

    optionRow("Management", m.matrix_name_credential_management, m.matrix_desc_cred_mgmt, optionValue(options, optionKey.credMgmt), "supported", "unsupported", "options.credMgmt", value.defaultFalse()),
    optionRow("Management", m.matrix_name_credential_management_preview, m.matrix_desc_cred_mgmt_preview, optionValue(options, optionKey.credentialMgmtPreview), "supported", "unsupported", "options.credentialMgmtPreview", value.defaultFalse()),
    optionRow("Management", m.matrix_name_credential_management_read_only, m.matrix_desc_cred_mgmt_ro, optionValue(options, optionKey.perCredMgmtRO), "supported", "unsupported", "options.perCredMgmtRO", value.defaultFalse()),
    optionRow("Management", m.matrix_name_authenticator_config, m.matrix_desc_authnr_cfg, optionValue(options, optionKey.authnrCfg), "supported", "unsupported", "options.authnrCfg", value.defaultFalse()),
    optionRow("Management", m.matrix_name_uv_authenticator_config_permission, m.matrix_desc_uv_acfg, optionValue(options, optionKey.uvAcfg), "supported", "unsupported", "options.uvAcfg", value.defaultFalse()),
    configCommandListRow(info),
    vendorConfigCommandListRow(info),
    booleanFeatureRow("Management", m.matrix_name_long_touch_for_reset, m.matrix_desc_long_touch_for_reset, info, "longTouchForReset", "enabled", "disabled", "unsupported"),
    resetTransportsRow(info),

    triStateOptionRow("Policy", m.matrix_name_enterprise_attestation, m.matrix_desc_ep, optionValue(options, optionKey.ep), "enabled", "disabled", "unsupported", "options.ep"),
    triStateOptionRow("Policy", m.matrix_name_always_require_uv, m.matrix_desc_always_uv, optionValue(options, optionKey.alwaysUv), "enabled", "disabled", "unsupported", "options.alwaysUv"),
    optionRow("Policy", m.matrix_name_set_minimum_pin_length, m.matrix_desc_set_min_pin_length, optionValue(options, optionKey.setMinPINLength), "supported", "unsupported", "options.setMinPINLength", value.defaultFalse()),
    makeCredUvRow(options),
    forcePinChangeRow(info),
    booleanFeatureRow("Policy", m.matrix_name_pin_complexity_policy, m.matrix_desc_pin_complexity_policy, info, "pinComplexityPolicy", "enabled", "disabled", "unsupported"),
    row("Policy", m.matrix_name_pin_complexity_policy_url, m.matrix_desc_pin_complexity_policy_url, valueStatus(info.pinComplexityPolicyURL), textValue(info.pinComplexityPolicyURL, value.notReported()), "pinComplexityPolicyURL"),
    maxRpidsForSetMinPinLengthRow(info, options),

    ...EXTENSION_ROWS.map((entry) => extensionSupportRow("Extensions", entry.name, entry.description, entry.id, extensionsKnown, extensions, `extensions.${entry.id}`)),

    maxMsgSizeRow(info),
    uintRow("Limits", m.matrix_name_max_credential_list_count, m.matrix_desc_max_credential_list_count, info, "maxCredentialCountInList", "", 1),
    uintRow("Limits", m.matrix_name_max_credential_id_length, m.matrix_desc_max_credential_id_length, info, "maxCredentialIdLength", "bytes", 1),
    minPinLengthRow(options, info),
    maxPinLengthRow(options, info),
    uintRow("Limits", m.matrix_name_remaining_discoverable_credentials, m.matrix_desc_remaining_discoverable_credentials, info, "remainingDiscoverableCredentials"),

    attestationFormatsRow(attestationFormatsKnown, attestationFormats),
    certificationsRow(certificationsKnown, certifications),
    uintRow("Attestation", m.matrix_name_firmware_version, m.matrix_desc_firmware_version, info, "firmwareVersion"),
  ].filter((item): item is OverviewRow => Boolean(item));
}

function aaguidRow(info: OverviewInspectInfo, getInfoReported: boolean) {
  if (!info.aaguid) {
    return row("Identity", m.matrix_name_aaguid, m.matrix_desc_aaguid_required, getInfoReported ? "warning" : "unknown", value.notReported(), "aaguid");
  }

  const length = byteLength(info.aaguid);
  if (length !== undefined && length !== 16) {
    return row("Identity", m.matrix_name_aaguid, m.matrix_desc_aaguid_required, "warning", `${formatAaguid(info.aaguid)} (${value.bytes(length)})`, "aaguid");
  }

  return row("Identity", m.matrix_name_aaguid, m.matrix_desc_aaguid_model, "informational", formatAaguid(info.aaguid), "aaguid");
}

function transportRow(info: OverviewInspectInfo, device: DeviceReport | null, transports: string[]) {
  if (info.transports !== undefined) {
    return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_getinfo, listStatus(true, transports), inlineList(transports, value.emptyList()), "transports");
  }
  return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_fallback, valueStatus(device?.transport), textValue(device?.transport, value.notReported()), "transports");
}

function versionsRow(getInfoReported: boolean, known: boolean, versions: readonly string[]) {
  if (!known) return row("Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions, getInfoReported ? "warning" : "unknown", value.notReported(), "versions");
  if (!versions.length) return row("Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions, "warning", value.emptyList(), "versions");
  if (versions.some((version) => FORBIDDEN_VERSION_IDS.has(String(version)))) return row("Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions, "warning", inlineList(versions), "versions");
  return row("Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions, "informational", inlineList(versions), "versions");
}

function versionRow(name: string, description: MessageText, known: boolean, versions: readonly string[], version: string) {
  return row("Protocol", name, description, known ? versions.includes(version) ? "supported" : "unsupported" : "unknown", formatProtocolVersion(version), `versions.${version}`);
}

function algorithmListRow(info: OverviewInspectInfo, algorithms: NonNullable<OverviewInspectInfo["algorithms"]>) {
  const known = info.algorithms !== undefined;
  if (!known) return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "unknown", value.notReported(), "algorithms");
  if (!algorithms.length) return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "warning", value.emptyList(), "algorithms");
  if (hasDuplicateListItems(algorithms, algorithmListItemKey)) return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "warning", inlineList(algorithms.map(formatAlgorithm)), "algorithms");
  return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "informational", inlineList(algorithms.map(formatAlgorithm)), "algorithms");
}

function optionRow(group: string, name: MessageText, description: MessageText, option: boolean | undefined, trueStatus: OverviewRowStatus, falseStatus: OverviewRowStatus, source: string, absentValue = value.absent()) {
  if (option === true) return row(group, name, description, trueStatus, "true", source);
  if (option === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, falseStatus, absentValue, source);
}

function triStateOptionRow(group: string, name: MessageText, description: MessageText, option: boolean | undefined, trueStatus: OverviewRowStatus, falseStatus: OverviewRowStatus, absentStatus: OverviewRowStatus, source: string) {
  if (option === true) return row(group, name, description, trueStatus, "true", source);
  if (option === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, absentStatus, value.absent(), source);
}

function upRow(options: OverviewOptions | undefined) {
  const up = optionValue(options, optionKey.up);
  if (up === false) return row("Verification", m.matrix_name_user_presence_touch, m.matrix_desc_up_false, "unsupported", "false", "options.up");
  return row("Verification", m.matrix_name_user_presence_touch, m.matrix_desc_up_true, "supported", up === true ? "true" : value.defaultTrue(), "options.up");
}

function clientPinRow(options: OverviewOptions | undefined) {
  const clientPin = optionValue(options, optionKey.clientPin);
  if (clientPin === true) return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_set, "configured", value.pinSet(), "options.clientPin");
  if (clientPin === false) return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_not_set, "not configured", value.pinNotSet(), "options.clientPin");
  return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_absent, "unsupported", value.absent(), "options.clientPin");
}

function uvRow(options: OverviewOptions | undefined) {
  const uv = optionValue(options, optionKey.uv);
  if (uv === true) return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_configured, "configured", value.configured(), "options.uv");
  if (uv === false) return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_not_configured, "not configured", value.notConfigured(), "options.uv");
  return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_absent, "unsupported", value.absent(), "options.uv");
}

function noMcGaPermissionsRow(options: OverviewOptions | undefined) {
  const noMcGa = optionValue(options, optionKey.noMcGaPermissionsWithClientPin);
  if (noMcGa === true) {
    return row("Verification", m.matrix_name_client_pin_token_mc_ga_permissions, m.matrix_desc_no_mc_ga_permissions_true, "warning", value.notAvailableThroughClientPinToken(), "options.noMcGaPermissionsWithClientPin");
  }
  return row("Verification", m.matrix_name_client_pin_token_mc_ga_permissions, m.matrix_desc_no_mc_ga_permissions_false, "informational", noMcGa === false ? value.available() : value.availableByDefault(), "options.noMcGaPermissionsWithClientPin");
}

function makeCredUvRow(options: OverviewOptions | undefined) {
  const makeCredUvNotRqd = optionValue(options, optionKey.makeCredUvNotRqd);
  if (makeCredUvNotRqd === true) {
    return row("Policy", m.matrix_name_non_discoverable_credential_uv_requirement, m.matrix_desc_make_cred_uv_skipped, "informational", value.uvMayBeSkipped(), "options.makeCredUvNotRqd");
  }
  return row("Policy", m.matrix_name_non_discoverable_credential_uv_requirement, m.matrix_desc_make_cred_uv_required, "informational", makeCredUvNotRqd === false ? value.uvRequired() : value.uvRequiredByDefault(), "options.makeCredUvNotRqd");
}

function forcePinChangeRow(info: OverviewInspectInfo) {
  if (info.forcePINChange === true) return row("Policy", m.matrix_name_force_pin_change, m.matrix_desc_force_pin_required, "warning", value.pinChangeRequired(), "forcePINChange");
  if (reported(info, "forcePINChange") && info.forcePINChange !== false) return row("Policy", m.matrix_name_force_pin_change, m.matrix_desc_force_pin_invalid, "warning", value.invalid(String(formatListItem(info.forcePINChange))), "forcePINChange");
  return row("Policy", m.matrix_name_force_pin_change, m.matrix_desc_force_pin_not_required, "informational", reported(info, "forcePINChange") ? value.notRequired() : value.notRequiredByDefault(), "forcePINChange");
}

function largeBlobsCommandRow(supported: boolean, capacity: number | undefined) {
  return row("Storage", m.matrix_name_large_blobs_command, m.matrix_desc_large_blobs_command, supported ? "supported" : "unsupported", supported ? (capacity === undefined ? value.capacityNotReported() : value.bytes(capacity)) : value.falseOrAbsent(), "options.largeBlobs");
}

function largeBlobKeyRow(extensionsKnown: boolean, extensions: string[], largeBlobsCommand: boolean) {
  const hasLargeBlobKey = extensions.includes("largeBlobKey");
  if (hasLargeBlobKey && largeBlobsCommand) return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key, "supported", value.extensionPlusCommandSupport(), "extensions.largeBlobKey + options.largeBlobs");
  if (hasLargeBlobKey) return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key_missing_command, "warning", value.extensionReportedCommandMissing(), "extensions.largeBlobKey + options.largeBlobs");
  return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key, extensionsKnown ? "unsupported" : "unknown", extensionsKnown ? value.notListed() : value.extensionsNotReported(), "extensions.largeBlobKey");
}

function largeBlobCapacityRow(info: OverviewInspectInfo, largeBlobsCommand: boolean) {
  const source = "maxSerializedLargeBlobArray";
  if (!reported(info, source)) {
    return row("Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity, largeBlobsCommand ? "warning" : "unknown", largeBlobsCommand ? value.missingLargeBlobs() : value.notReported(), source);
  }
  const input = info.maxSerializedLargeBlobArray;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity, "warning", value.invalid(String(formatListItem(input))), source);
  if (amount < 1024) return row("Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity, "warning", `${value.bytes(amount)} < ${value.bytes(1024)}`, source);
  return row("Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity, largeBlobsCommand ? "informational" : "warning", largeBlobsCommand ? value.bytes(amount) : `${value.bytes(amount)}; ${value.falseOrAbsent()}`, source);
}

function maxCredBlobLengthRow(info: OverviewInspectInfo, extensionsKnown: boolean, extensions: string[]) {
  const source = "maxCredBlobLength";
  const credBlobSupported = extensions.includes("credBlob");
  if (!reported(info, source)) {
    return row("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, credBlobSupported ? "warning" : "unknown", credBlobSupported ? value.missingCredBlob() : value.notReported(), source);
  }
  const input = info.maxCredBlobLength;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, "warning", value.invalid(String(formatListItem(input))), source);
  if (amount < 32) return row("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, "warning", `${value.bytes(amount)} < ${value.bytes(32)}`, source);
  if (extensionsKnown && !credBlobSupported) return row("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, "warning", `${value.bytes(amount)}; ${value.notListed()}`, source);
  return row("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, "informational", value.bytes(amount), source);
}

function booleanFeatureRow(group: string, name: MessageText, description: MessageText, info: OverviewInspectInfo, source: BooleanInfoKey, trueStatus: OverviewRowStatus, falseStatus: OverviewRowStatus, absentStatus: OverviewRowStatus) {
  if (!reported(info, source)) return row(group, name, description, absentStatus, value.absent(), source);
  const input = info[source];
  if (input === true) return row(group, name, description, trueStatus, "true", source);
  if (input === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, "warning", value.invalid(String(formatListItem(input))), source);
}

function configCommandListRow(info: OverviewInspectInfo) {
  const known = info.authenticatorConfigCommands !== undefined;
  const commands = info.authenticatorConfigCommands ?? [];
  if (!known) return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, "unknown", value.notReported(), "authenticatorConfigCommands");
  if (commands.some((command) => unsignedIntegerValue(command) === undefined) || hasDuplicateListItems(commands, unsignedIntegerListItemKey)) {
    return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, "warning", inlineList(commands.map(formatConfigCommand)), "authenticatorConfigCommands");
  }
  return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, "informational", inlineList(commands.map(formatConfigCommand), value.emptyList()), "authenticatorConfigCommands");
}

function vendorConfigCommandListRow(info: OverviewInspectInfo) {
  const known = info.vendorPrototypeConfigCommands !== undefined;
  const commands = info.vendorPrototypeConfigCommands ?? [];
  if (!known) return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, "unknown", value.notReported(), "vendorPrototypeConfigCommands");
  if (commands.some((command) => unsignedIntegerValue(command) === undefined) || hasDuplicateListItems(commands, unsignedIntegerListItemKey)) {
    return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, "warning", inlineList(commands.map(formatIntegerHex)), "vendorPrototypeConfigCommands");
  }
  return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, "informational", inlineList(commands.map(formatIntegerHex), value.emptyList()), "vendorPrototypeConfigCommands");
}

function resetTransportsRow(info: OverviewInspectInfo) {
  const known = info.transportsForReset !== undefined;
  const transports = info.transportsForReset ?? [];
  if (!known) return row("Management", m.matrix_name_reset_transports, m.matrix_desc_reset_transports, "unknown", value.notReported(), "transportsForReset");
  return row("Management", m.matrix_name_reset_transports, m.matrix_desc_reset_transports, listStatus(true, transports), inlineList(transports, value.emptyList()), "transportsForReset");
}

function maxRpidsForSetMinPinLengthRow(info: OverviewInspectInfo, options: OverviewOptions | undefined) {
  const source = "maxRPIDsForSetMinPINLength";
  const setMinPinLength = optionValue(options, optionKey.setMinPINLength) === true;
  if (!reported(info, source)) return row("Policy", m.matrix_name_rp_ids_for_minimum_pin_length, m.matrix_desc_max_rpids_for_set_min_pin_length, setMinPinLength ? "warning" : "unknown", setMinPinLength ? value.missingSetMinPinLength() : value.notReported(), source);
  const input = info.maxRPIDsForSetMinPINLength;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Policy", m.matrix_name_rp_ids_for_minimum_pin_length, m.matrix_desc_max_rpids_for_set_min_pin_length, "warning", value.invalid(String(formatListItem(input))), source);
  return row("Policy", m.matrix_name_rp_ids_for_minimum_pin_length, m.matrix_desc_max_rpids_for_set_min_pin_length, setMinPinLength ? "informational" : "warning", setMinPinLength ? String(amount) : value.unsupportedSetMinPinLength(String(amount)), source);
}

function extensionSupportRow(group: string, name: MessageText, description: MessageText, id: string, known: boolean, extensions: string[], source: string) {
  if (!known) return row(group, name, description, "unknown", value.extensionsNotReported(), source);
  return row(group, name, description, extensions.includes(id) ? "supported" : "unsupported", extensions.includes(id) ? id : value.notListed(), source);
}

function maxMsgSizeRow(info: OverviewInspectInfo) {
  const source = "maxMsgSize";
  if (!reported(info, source)) return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "informational", value.defaultBytes(1024), source);
  const input = info.maxMsgSize;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "warning", value.invalid(String(formatListItem(input))), source);
  if (amount < 1024) return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "warning", `${value.bytes(amount)} < ${value.bytes(1024)}`, source);
  return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "informational", value.bytes(amount), source);
}

function minPinLengthRow(options: OverviewOptions | undefined, info: OverviewInspectInfo) {
  const source = "minPINLength";
  const clientPinSupported = reported(options, optionKey.clientPin);
  if (!reported(info, source)) return row("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, clientPinSupported ? "warning" : "unknown", clientPinSupported ? value.missingClientPin() : value.notReported(), source);
  const input = info.minPINLength;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, "warning", value.invalid(String(formatListItem(input))), source);
  if (!clientPinSupported) return row("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, "warning", `${value.codePoints(amount)}; ${value.pinNotSet()}`, source);
  if (amount < 4) return row("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, "warning", `${value.codePoints(amount)} < ${value.codePoints(4)}`, source);
  return row("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, "informational", value.codePoints(amount), source);
}

function maxPinLengthRow(options: OverviewOptions | undefined, info: OverviewInspectInfo) {
  const source = "maxPINLength";
  const clientPinSupported = reported(options, optionKey.clientPin);
  if (!reported(info, source)) return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin_default, clientPinSupported ? "informational" : "unknown", clientPinSupported ? value.defaultCodePoints(63) : value.notReported(), source);
  const input = info.maxPINLength;
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin, "warning", value.invalid(String(formatListItem(input))), source);
  if (!clientPinSupported) return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin_absent_without_clientpin, "warning", `${value.codePoints(amount)}; ${value.absent()}`, source);
  if (amount < 8) return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin_minimum, "warning", `${value.codePoints(amount)} < ${value.codePoints(8)}`, source);
  return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin, "informational", value.codePoints(amount), source);
}

function uintRow(group: string, name: MessageText, description: MessageText, info: OverviewInspectInfo, source: NumberInfoKey, unit: "bytes" | "codePoints" | "" = "", minimum = 0) {
  if (!reported(info, source)) return row(group, name, description, "unknown", value.notReported(), source);
  const input = info[source];
  const amount = unsignedIntegerValue(input);
  if (amount === undefined) return row(group, name, description, "warning", value.invalid(String(formatListItem(input))), source);
  if (amount < minimum) return row(group, name, description, "warning", `${formatNumberWithUnit(amount, unit)} < ${formatNumberWithUnit(minimum, unit)}`, source);
  return row(group, name, description, "informational", formatNumberWithUnit(amount, unit), source);
}

function attestationFormatsRow(known: boolean, attestationFormats: string[]) {
  if (!known) return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "informational", value.noneImpliedNoFormatsReported(), "attestationFormats");
  if (!attestationFormats.length) return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "warning", value.emptyList(), "attestationFormats");
  if (attestationFormats.includes("none") || hasDuplicateListItems(attestationFormats)) return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "warning", inlineList(attestationFormats), "attestationFormats");
  return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "informational", inlineList(attestationFormats), "attestationFormats");
}

function certificationsRow(known: boolean, certifications: Certifications) {
  if (!known) return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, "unknown", value.certificationsNotReported(), "certifications");
  const entries = Object.entries(certifications);
  if (!entries.length) return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, "unsupported", value.notListed(), "certifications");

  const invalid = entries.some(([id, item]) => CERTIFICATION_ROWS.some((entry) => entry.id === id) && !certificationLevelValid(id, item));
  const display = entries.map(([id, item]) => `${id}: ${formatCertificationValue(id, item)}${invalidCertificationSuffix(id, item)}`).join(", ");
  return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, invalid ? "warning" : "informational", display, "certifications");
}

function reported<T extends object, K extends keyof T>(source: T | null | undefined, key: K) {
  return Boolean(source && Object.prototype.hasOwnProperty.call(source, key));
}

function optionValue(options: OverviewOptions | undefined, key: OverviewOptionKey): boolean | undefined {
  if (!options || !reported(options, key)) return undefined;
  const item = options[key];
  if (item === true) return true;
  if (item === false) return false;
  return undefined;
}

function invalidCertificationSuffix(id: string, item: unknown) {
  const known = CERTIFICATION_ROWS.some((entry) => entry.id === id);
  return known && !certificationLevelValid(id, item) ? `; ${certificationRangeLabel(id)}` : "";
}

function listStatus(known: boolean, list: unknown[], keyFn = (item: unknown) => String(formatListItem(item))): OverviewRowStatus {
  if (!known) return "unknown";
  if (!list.length) return "warning";
  if (hasDuplicateListItems(list, keyFn)) return "warning";
  return "informational";
}

function valueStatus(input: unknown): OverviewRowStatus {
  if (input === null || input === undefined || input === "") return "unknown";
  if (Array.isArray(input) && input.length === 0) return "unknown";
  return "informational";
}

function formatProtocolVersion(version: string) {
  const withPrefix = version.startsWith("FIDO_") ? `FIDO ${version.slice(5)}` : version;
  return withPrefix.replaceAll("_", ".");
}
