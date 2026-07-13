import { Option, Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { InspectInfo } from "../../bindings/github.com/go-ctap/kit/model";
import {
  Capability,
  Interface,
  Vendor,
  type DeviceReport,
  type InterfaceReport,
} from "../../bindings/github.com/go-ctap/kit/model/report";

import type { InspectAlgorithms, InspectBooleanField, InspectCertifications, InspectNumberField, InspectOptions } from "./overview-dto-types.js";
import { m, value } from "./overview-i18n.js";
import { EXTENSION_ROWS, formatCertificationValue } from "./overview-matrix-rules.js";
import { compactSecretValue, inlineList } from "./overview-raw-format.js";
import { row } from "./overview-shared.js";
import type { MessageText, OverviewContext, OverviewRow, OverviewRowStatus } from "./overview-types.js";
import {
  formatAlgorithm,
  formatIntegerHex,
  formatNumberWithUnit,
  textValue,
} from "./overview-utils.js";

type OverviewOptionKey = Option;

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

const configCommandNames = new Map<number, string>([
  [0x01, "enableEnterpriseAttestation"],
  [0x02, "toggleAlwaysUv"],
  [0x03, "setMinPINLength"],
  [0x04, "enableLongTouchForReset"],
  [0xff, "vendorPrototype"],
]);

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

  const extensionsKnown = info.extensions !== undefined;
  const attestationFormatsKnown = info.attestationFormats !== undefined;
  const pinUvAuthProtocolsKnown = info.pinUvAuthProtocols !== undefined;
  const certificationsKnown = info.certifications !== undefined;
  const largeBlobsCommand = optionValue(options, optionKey.largeBlobs) === true;

  return [
    row("Identity", m.matrix_name_aaguid, m.matrix_desc_aaguid_model, "informational", info.aaguid, "aaguid"),
    row("Identity", m.matrix_name_device_id, m.matrix_desc_device_id, valueStatus(device?.deviceId), textValue(device?.deviceId, value.notReported()), "device.deviceId"),
    ...vendorIdentityRows(device),
    transportRow(info, device, transports),
    optionRow("Identity", m.matrix_name_platform_attachment, m.matrix_desc_platform_attachment, optionValue(options, optionKey.plat), "enabled", "disabled", "options.plat", value.defaultFalse()),
    row("Identity", m.matrix_name_encrypted_device_identifier, m.matrix_desc_encrypted_device_identifier, valueStatus(info.encIdentifier), compactSecretValue(info.encIdentifier), "encIdentifier"),

    ...vendorInterfaceRows(device),

    versionsRow(versions),
    versionRow("U2F", m.matrix_desc_u2f, versions, Version.U2F_V2),
    versionRow("FIDO 2.0", m.matrix_desc_fido20, versions, Version.FIDO_2_0),
    versionRow("FIDO 2.1 Preview", m.matrix_desc_fido21_preview, versions, Version.FIDO_2_1_PRE),
    versionRow("FIDO 2.1", m.matrix_desc_fido21, versions, Version.FIDO_2_1),
    versionRow("FIDO 2.3", m.matrix_desc_fido23, versions, Version.FIDO_2_3),
    algorithmListRow(info, algorithms),

    upRow(options),
    optionRow("Verification", m.matrix_name_discoverable_credentials, m.matrix_desc_rk, optionValue(options, optionKey.rk), "supported", "unsupported", "options.rk", value.defaultFalse()),
    clientPinRow(options),
    uvRow(options),
    optionRow("Verification", m.matrix_name_pin_uv_auth_token_permissions, m.matrix_desc_pin_uv_auth_token, optionValue(options, optionKey.pinUvAuthToken), "supported", "unsupported", "options.pinUvAuthToken", value.defaultFalse()),
    noMcGaPermissionsRow(options),
    row("Verification", m.matrix_name_pin_uv_auth_protocols, m.matrix_desc_pin_uv_protocols, pinUvAuthProtocolsKnown ? "informational" : "unknown", inlineList(pinUvAuthProtocols, value.notReported()), "pinUvAuthProtocols"),
    triStateOptionRow("Verification", m.matrix_name_biometric_enrollment, m.matrix_desc_bio_enroll, optionValue(options, optionKey.bioEnroll), "configured", "not configured", "unsupported", "options.bioEnroll"),
    triStateOptionRow("Verification", m.matrix_name_biometric_enrollment_preview, m.matrix_desc_bio_enroll_preview, optionValue(options, optionKey.userVerificationMgmtPreview), "configured", "not configured", "unsupported", "options.userVerificationMgmtPreview"),
    optionRow("Verification", m.matrix_name_uv_biometric_enrollment_permission, m.matrix_desc_uv_bio_enroll, optionValue(options, optionKey.uvBioEnroll), "supported", "unsupported", "options.uvBioEnroll", value.defaultFalse()),
    row("Verification", m.matrix_name_biometric_modality, m.matrix_desc_bio_modality, valueStatus(bioSensor?.modality), textValue(bioSensor?.modality, value.notReported()), "bioSensor.modality"),
    uintRow("Verification", m.matrix_name_uv_modality_bit_flags, m.matrix_desc_uv_modality, info, "uvModality"),
    uintRow("Verification", m.matrix_name_preferred_platform_uv_attempts, m.matrix_desc_preferred_platform_uv_attempts, info, "preferredPlatformUvAttempts"),
    uintRow("Verification", m.matrix_name_uv_count_since_last_pin_entry, m.matrix_desc_uv_count_since_last_pin_entry, info, "uvCountSinceLastPinEntry"),

    largeBlobsCommandRow(largeBlobsCommand, info.maxSerializedLargeBlobArray ?? undefined),
    largeBlobKeyRow(extensionsKnown, extensions),
    uintRow("Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity, info, "maxSerializedLargeBlobArray", "bytes"),
    uintRow("Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length, info, "maxCredBlobLength", "bytes"),
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
    uintRow("Policy", m.matrix_name_rp_ids_for_minimum_pin_length, m.matrix_desc_max_rpids_for_set_min_pin_length, info, "maxRPIDsForSetMinPINLength"),

    ...EXTENSION_ROWS.map((entry) => extensionSupportRow("Extensions", entry.name, entry.description, entry.id, extensionsKnown, extensions, `extensions.${entry.id}`)),

    maxMsgSizeRow(info),
    uintRow("Limits", m.matrix_name_max_credential_list_count, m.matrix_desc_max_credential_list_count, info, "maxCredentialCountInList"),
    uintRow("Limits", m.matrix_name_max_credential_id_length, m.matrix_desc_max_credential_id_length, info, "maxCredentialIdLength", "bytes"),
    uintRow("Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length, info, "minPINLength", "codePoints"),
    maxPinLengthRow(options, info),
    uintRow("Limits", m.matrix_name_remaining_discoverable_credentials, m.matrix_desc_remaining_discoverable_credentials, info, "remainingDiscoverableCredentials"),

    attestationFormatsRow(attestationFormatsKnown, attestationFormats),
    certificationsRow(certificationsKnown, certifications),
    uintRow("Attestation", m.matrix_name_firmware_version, m.matrix_desc_firmware_version, info, "firmwareVersion"),
  ].filter((item): item is OverviewRow => Boolean(item));
}

function vendorIdentityRows(device: DeviceReport | null) {
  const metadata = device?.metadata;
  const model = metadata?.model || device?.product;
  const serial = metadata?.serial || device?.serial;

  return [
    row("Identity", m.matrix_name_device_vendor, m.matrix_desc_device_vendor, valueStatus(device?.vendor), textValue(device?.vendor, value.notReported()), "device.vendor"),
    row("Identity", m.matrix_name_device_model, m.matrix_desc_device_model, valueStatus(model), textValue(model, value.notReported()), metadata?.model ? "device.metadata.model" : "device.product"),
    row("Identity", m.matrix_name_device_serial, m.matrix_desc_device_serial, valueStatus(serial), textValue(serial, value.notReported()), metadata?.serial ? "device.metadata.serial" : "device.serial"),
    row("Identity", m.matrix_name_device_firmware, m.matrix_desc_device_firmware, valueStatus(metadata?.firmware), textValue(metadata?.firmware, value.notReported()), "device.metadata.firmware"),
  ];
}

function vendorInterfaceRows(device: DeviceReport | null) {
  return (device?.metadata?.interfaces ?? []).flatMap((interfaceReport) => {
    const rows = [interfacePresenceRow(interfaceReport)];
    if (device?.vendor !== Vendor.VendorToken2 || interfaceReport.supported.length > 0) {
      rows.push(interfaceApplicationsRow(interfaceReport, "supported"));
    }
    if (device?.vendor === Vendor.VendorYubico) {
      rows.push(interfaceApplicationsRow(interfaceReport, "enabled"));
    }
    return rows;
  });
}

function interfacePresenceRow(interfaceReport: InterfaceReport) {
  const interfaceName = interfaceLabel(interfaceReport.interface);
  return row(
    "Interfaces",
    m.matrix_name_vendor_interface({ interface: interfaceName }),
    m.matrix_desc_vendor_interface,
    "informational",
    value.available(),
    `device.metadata.interfaces.${interfaceReport.interface}.interface`,
  );
}

function interfaceApplicationsRow(
  interfaceReport: InterfaceReport,
  field: "supported" | "enabled",
) {
  const interfaceName = interfaceLabel(interfaceReport.interface);
  const applications = interfaceReport[field].map(capabilityLabel);
  const enabled = field === "enabled";

  return row(
    "Interfaces",
    enabled
      ? m.matrix_name_enabled_applications({ interface: interfaceName })
      : m.matrix_name_supported_applications({ interface: interfaceName }),
    enabled
      ? m.matrix_desc_enabled_applications({ interface: interfaceName })
      : m.matrix_desc_supported_applications({ interface: interfaceName }),
    "informational",
    inlineList(applications, value.emptyList()),
    `device.metadata.interfaces.${interfaceReport.interface}.${field}`,
  );
}

function interfaceLabel(input: Interface) {
  const labels: Record<Interface, string> = {
    [Interface.$zero]: input,
    [Interface.InterfaceUSB]: "USB",
    [Interface.InterfaceNFC]: "NFC",
  };
  return labels[input] || input;
}

function capabilityLabel(input: Capability) {
  const labels: Record<Capability, string> = {
    [Capability.$zero]: input,
    [Capability.CapabilityOTP]: "OTP",
    [Capability.CapabilityU2F]: "U2F",
    [Capability.CapabilityCCID]: "CCID",
    [Capability.CapabilityOpenPGP]: "OpenPGP",
    [Capability.CapabilityPIV]: "PIV",
    [Capability.CapabilityOATH]: "OATH",
    [Capability.CapabilityCTAP2]: "CTAP2",
  };
  return labels[input] || input;
}

function transportRow(info: InspectInfo, device: DeviceReport | null, transports: string[]) {
  if (info.transports !== undefined) {
    return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_getinfo, "informational", inlineList(transports, value.emptyList()), "transports");
  }
  return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_fallback, valueStatus(device?.transport), textValue(device?.transport, value.notReported()), "transports");
}

function versionsRow(versions: readonly Version[]) {
  return row("Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions, "informational", inlineList(versions, value.emptyList()), "versions");
}

function versionRow(name: string, description: MessageText, versions: readonly Version[], version: Version) {
  return row("Protocol", name, description, versions.includes(version) ? "supported" : "unsupported", formatProtocolVersion(version), `versions.${version}`);
}

function algorithmListRow(info: InspectInfo, algorithms: InspectAlgorithms) {
  const known = info.algorithms !== undefined;
  if (!known) return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "unknown", value.notReported(), "algorithms");
  return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, "informational", inlineList(algorithms.map(formatAlgorithm), value.emptyList()), "algorithms");
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

function upRow(options: InspectOptions | undefined) {
  const up = optionValue(options, optionKey.up);
  if (up === false) return row("Verification", m.matrix_name_user_presence_touch, m.matrix_desc_up_false, "unsupported", "false", "options.up");
  return row("Verification", m.matrix_name_user_presence_touch, m.matrix_desc_up_true, "supported", up === true ? "true" : value.defaultTrue(), "options.up");
}

function clientPinRow(options: InspectOptions | undefined) {
  const clientPin = optionValue(options, optionKey.clientPin);
  if (clientPin === true) return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_set, "configured", value.pinSet(), "options.clientPin");
  if (clientPin === false) return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_not_set, "not configured", value.pinNotSet(), "options.clientPin");
  return row("Verification", m.matrix_name_client_pin, m.matrix_desc_client_pin_absent, "unsupported", value.absent(), "options.clientPin");
}

function uvRow(options: InspectOptions | undefined) {
  const uv = optionValue(options, optionKey.uv);
  if (uv === true) return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_configured, "configured", value.configured(), "options.uv");
  if (uv === false) return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_not_configured, "not configured", value.notConfigured(), "options.uv");
  return row("Verification", m.matrix_name_built_in_user_verification, m.matrix_desc_uv_absent, "unsupported", value.absent(), "options.uv");
}

function noMcGaPermissionsRow(options: InspectOptions | undefined) {
  const noMcGa = optionValue(options, optionKey.noMcGaPermissionsWithClientPin);
  if (noMcGa === true) {
    return row("Verification", m.matrix_name_client_pin_token_mc_ga_permissions, m.matrix_desc_no_mc_ga_permissions_true, "informational", value.notAvailableThroughClientPinToken(), "options.noMcGaPermissionsWithClientPin");
  }
  return row("Verification", m.matrix_name_client_pin_token_mc_ga_permissions, m.matrix_desc_no_mc_ga_permissions_false, "informational", noMcGa === false ? value.available() : value.availableByDefault(), "options.noMcGaPermissionsWithClientPin");
}

function makeCredUvRow(options: InspectOptions | undefined) {
  const makeCredUvNotRqd = optionValue(options, optionKey.makeCredUvNotRqd);
  if (makeCredUvNotRqd === true) {
    return row("Policy", m.matrix_name_non_discoverable_credential_uv_requirement, m.matrix_desc_make_cred_uv_skipped, "informational", value.uvMayBeSkipped(), "options.makeCredUvNotRqd");
  }
  return row("Policy", m.matrix_name_non_discoverable_credential_uv_requirement, m.matrix_desc_make_cred_uv_required, "informational", makeCredUvNotRqd === false ? value.uvRequired() : value.uvRequiredByDefault(), "options.makeCredUvNotRqd");
}

function forcePinChangeRow(info: InspectInfo) {
  if (info.forcePINChange === true) return row("Policy", m.matrix_name_force_pin_change, m.matrix_desc_force_pin_required, "warning", value.pinChangeRequired(), "forcePINChange");
  return row("Policy", m.matrix_name_force_pin_change, m.matrix_desc_force_pin_not_required, "informational", reported(info, "forcePINChange") ? value.notRequired() : value.notRequiredByDefault(), "forcePINChange");
}

function largeBlobsCommandRow(supported: boolean, capacity: number | undefined) {
  return row("Storage", m.matrix_name_large_blobs_command, m.matrix_desc_large_blobs_command, supported ? "supported" : "unsupported", supported ? (capacity === undefined ? value.capacityNotReported() : value.bytes(capacity)) : value.falseOrAbsent(), "options.largeBlobs");
}

function largeBlobKeyRow(extensionsKnown: boolean, extensions: string[]) {
  const hasLargeBlobKey = extensions.includes("largeBlobKey");
  if (hasLargeBlobKey) return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key, "supported", "largeBlobKey", "extensions.largeBlobKey");
  return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key, extensionsKnown ? "unsupported" : "unknown", extensionsKnown ? value.notListed() : value.extensionsNotReported(), "extensions.largeBlobKey");
}

function booleanFeatureRow(group: string, name: MessageText, description: MessageText, info: InspectInfo, source: InspectBooleanField, trueStatus: OverviewRowStatus, falseStatus: OverviewRowStatus, absentStatus: OverviewRowStatus) {
  if (info[source] === null || info[source] === undefined) return row(group, name, description, absentStatus, value.absent(), source);
  const input = info[source];
  return row(group, name, description, input ? trueStatus : falseStatus, String(input), source);
}

function configCommandListRow(info: InspectInfo) {
  const known = info.authenticatorConfigCommands !== undefined;
  const commands = info.authenticatorConfigCommands ?? [];
  if (!known) return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, "unknown", value.notReported(), "authenticatorConfigCommands");
  return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, "informational", inlineList(commands.map((command) => {
    const name = configCommandNames.get(command);
    return name ? `${name} (${formatIntegerHex(command)})` : formatIntegerHex(command);
  }), value.emptyList()), "authenticatorConfigCommands");
}

function vendorConfigCommandListRow(info: InspectInfo) {
  const known = info.vendorPrototypeConfigCommands !== undefined;
  const commands = info.vendorPrototypeConfigCommands ?? [];
  if (!known) return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, "unknown", value.notReported(), "vendorPrototypeConfigCommands");
  return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, "informational", inlineList(commands.map(formatIntegerHex), value.emptyList()), "vendorPrototypeConfigCommands");
}

function resetTransportsRow(info: InspectInfo) {
  const known = info.transportsForReset !== undefined;
  const transports = info.transportsForReset ?? [];
  if (!known) return row("Management", m.matrix_name_reset_transports, m.matrix_desc_reset_transports, "unknown", value.notReported(), "transportsForReset");
  return row("Management", m.matrix_name_reset_transports, m.matrix_desc_reset_transports, "informational", inlineList(transports, value.emptyList()), "transportsForReset");
}

function extensionSupportRow(group: string, name: MessageText, description: MessageText, id: string, known: boolean, extensions: string[], source: string) {
  if (!known) return row(group, name, description, "unknown", value.extensionsNotReported(), source);
  return row(group, name, description, extensions.includes(id) ? "supported" : "unsupported", extensions.includes(id) ? id : value.notListed(), source);
}

function maxMsgSizeRow(info: InspectInfo) {
  const source = "maxMsgSize";
  if (info.maxMsgSize === null || info.maxMsgSize === undefined) return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "informational", value.defaultBytes(1024), source);
  return row("Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size, "informational", value.bytes(info.maxMsgSize), source);
}

function maxPinLengthRow(options: InspectOptions | undefined, info: InspectInfo) {
  const source = "maxPINLength";
  const clientPinSupported = reported(options, optionKey.clientPin);
  if (info.maxPINLength === null || info.maxPINLength === undefined) return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin_default, clientPinSupported ? "informational" : "unknown", clientPinSupported ? value.defaultCodePoints(63) : value.notReported(), source);
  return row("Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin, "informational", value.codePoints(info.maxPINLength), source);
}

function uintRow(group: string, name: MessageText, description: MessageText, info: InspectInfo, source: InspectNumberField, unit: "bytes" | "codePoints" | "" = "") {
  const amount = info[source];
  if (amount === null || amount === undefined) return row(group, name, description, "unknown", value.notReported(), source);
  return row(group, name, description, "informational", formatNumberWithUnit(amount, unit), source);
}

function attestationFormatsRow(known: boolean, attestationFormats: string[]) {
  if (!known) return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "informational", value.noneImpliedNoFormatsReported(), "attestationFormats");
  return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, "informational", inlineList(attestationFormats, value.emptyList()), "attestationFormats");
}

function certificationsRow(known: boolean, certifications: InspectCertifications) {
  if (!known) return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, "unknown", value.certificationsNotReported(), "certifications");
  const entries = Object.entries(certifications);
  if (!entries.length) return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, "unsupported", value.notListed(), "certifications");

  return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, "informational", entries.map(([id, item]) => `${id}: ${formatCertificationValue(id, item)}`).join(", "), "certifications");
}

function reported<T extends object, K extends keyof T>(source: T | null | undefined, key: K) {
  return Boolean(source && Object.prototype.hasOwnProperty.call(source, key));
}

function optionValue(options: InspectOptions | undefined, key: OverviewOptionKey): boolean | undefined {
  return options?.[key];
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
