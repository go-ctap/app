import {
  FactID,
  FactOrigin,
  FactState,
  FactValueKind,
  type Fact,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
import {
  Capability,
  IdentityResolutionState,
  Interface,
  Vendor,
  YubicoFormFactor,
  type DeviceReport,
  type InterfaceReport,
} from "../../bindings/github.com/go-ctap/kit/model/report";

import {
  buildOverviewFactLookup,
  factBoolean,
  factInteger,
  factList,
  factText,
  factUnit,
  factUsesSpecDefault,
  overviewFact,
  overviewFactStatus,
  type OverviewFactLookup,
} from "./overview-facts.js";
import { m, value } from "./overview-i18n.js";
import { EXTENSION_ROWS, formatCertificationValue } from "./overview-matrix-rules.js";
import { compactSecretValue, inlineList } from "./overview-raw-format.js";
import { row } from "./overview-shared.js";
import type { MessageText, OverviewContext, OverviewRow, OverviewRowStatus } from "./overview-types.js";
import { algorithmLabel, formatNumberWithUnit, textValue } from "./overview-utils.js";

const configCommandNames = new Map<string, string>([
  ["1", "enableEnterpriseAttestation"],
  ["2", "toggleAlwaysUv"],
  ["3", "setMinPINLength"],
  ["4", "enableLongTouchForReset"],
  ["255", "vendorPrototype"],
]);

const extensionFactIDs = {
  credProtect: FactID.FactIDExtensionCredProtect,
  credBlob: FactID.FactIDExtensionCredBlob,
  largeBlobKey: FactID.FactIDExtensionLargeBlobKey,
  largeBlob: FactID.FactIDExtensionLargeBlob,
  minPinLength: FactID.FactIDExtensionMinPINLength,
  pinComplexityPolicy: FactID.FactIDExtensionPINComplexityPolicy,
  "hmac-secret": FactID.FactIDExtensionHMACSecret,
  "hmac-secret-mc": FactID.FactIDExtensionHMACSecretMC,
  thirdPartyPayment: FactID.FactIDExtensionThirdPartyPayment,
} as const;

export function buildOverviewRows(
  context: OverviewContext = {},
  factLookup?: OverviewFactLookup,
): OverviewRow[] {
  const info = context.info;
  if (!info) return [];

  const device = context.device ?? null;
  const bioSensor = context.bioSensor ?? null;
  const facts = factLookup ?? buildOverviewFactLookup(info.assessment);

  return [
    localizedFactRow(facts, FactID.FactIDAAGUID, "Identity", m.matrix_name_aaguid, m.matrix_desc_aaguid_model),
    row("Identity", m.matrix_name_attachment_id, m.matrix_desc_attachment_id, valueStatus(device?.attachment.id), textValue(device?.attachment.id, value.notReported()), "device.attachment.id"),
    identityResolutionRow(device),
    ...vendorIdentityRows(device),
    transportRow(facts, device),
    ...connectionRows(device),
    localizedFactRow(facts, FactID.FactIDPlatformAttachment, "Identity", m.matrix_name_platform_attachment, m.matrix_desc_platform_attachment),
    secretFactRow(facts, FactID.FactIDEncryptedDeviceIdentifier, "Identity", m.matrix_name_encrypted_device_identifier, m.matrix_desc_encrypted_device_identifier),

    ...vendorInterfaceRows(device),
    ...vendorDetailRows(device),

    localizedFactRow(facts, FactID.FactIDVersions, "Protocol", m.matrix_name_reported_versions, m.matrix_desc_versions),
    versionRow(facts, FactID.FactIDVersionU2FV2, "U2F", m.matrix_desc_u2f, "U2F_V2"),
    versionRow(facts, FactID.FactIDVersionFIDO20, "FIDO 2.0", m.matrix_desc_fido20, "FIDO_2_0"),
    versionRow(facts, FactID.FactIDVersionFIDO21Preview, "FIDO 2.1 Preview", m.matrix_desc_fido21_preview, "FIDO_2_1_PRE"),
    versionRow(facts, FactID.FactIDVersionFIDO21, "FIDO 2.1", m.matrix_desc_fido21, "FIDO_2_1"),
    versionRow(facts, FactID.FactIDVersionFIDO23, "FIDO 2.3", m.matrix_desc_fido23, "FIDO_2_3"),
    algorithmsRow(facts),

    userPresenceRow(facts),
    localizedFactRow(facts, FactID.FactIDResidentCredentials, "Verification", m.matrix_name_discoverable_credentials, m.matrix_desc_rk),
    clientPINRow(facts),
    userVerificationRow(facts),
    localizedFactRow(facts, FactID.FactIDPinUvAuthToken, "Verification", m.matrix_name_pin_uv_auth_token_permissions, m.matrix_desc_pin_uv_auth_token),
    clientPINMCGAPermissionsRow(facts),
    localizedFactRow(facts, FactID.FactIDPinUvAuthProtocols, "Verification", m.matrix_name_pin_uv_auth_protocols, m.matrix_desc_pin_uv_protocols),
    localizedFactRow(facts, FactID.FactIDBioEnrollment, "Verification", m.matrix_name_biometric_enrollment, m.matrix_desc_bio_enroll),
    localizedFactRow(facts, FactID.FactIDBioEnrollmentPreview, "Verification", m.matrix_name_biometric_enrollment_preview, m.matrix_desc_bio_enroll_preview),
    localizedFactRow(facts, FactID.FactIDUvBioEnroll, "Verification", m.matrix_name_uv_biometric_enrollment_permission, m.matrix_desc_uv_bio_enroll),
    row("Verification", m.matrix_name_biometric_modality, m.matrix_desc_bio_modality, valueStatus(bioSensor?.modality), textValue(bioSensor?.modality, value.notReported()), "bioSensor.modality"),
    localizedFactRow(facts, FactID.FactIDUvModality, "Verification", m.matrix_name_uv_modality_bit_flags, m.matrix_desc_uv_modality),
    localizedFactRow(facts, FactID.FactIDPreferredPlatformUVAttempts, "Verification", m.matrix_name_preferred_platform_uv_attempts, m.matrix_desc_preferred_platform_uv_attempts),
    localizedFactRow(facts, FactID.FactIDUVCountSinceLastPINEntry, "Verification", m.matrix_name_uv_count_since_last_pin_entry, m.matrix_desc_uv_count_since_last_pin_entry),

    largeBlobsRow(facts),
    largeBlobKeyRow(facts),
    localizedFactRow(facts, FactID.FactIDMaxSerializedLargeBlobArray, "Storage", m.matrix_name_serialized_large_blob_array_limit, m.matrix_desc_large_blob_capacity),
    localizedFactRow(facts, FactID.FactIDMaxCredBlobLength, "Storage", m.matrix_name_max_credblob_length, m.matrix_desc_max_credblob_length),
    secretFactRow(facts, FactID.FactIDEncryptedCredentialStoreState, "Storage", m.matrix_name_encrypted_credential_store_state, m.matrix_desc_encrypted_credential_store_state),

    localizedFactRow(facts, FactID.FactIDCredentialManagement, "Management", m.matrix_name_credential_management, m.matrix_desc_cred_mgmt),
    localizedFactRow(facts, FactID.FactIDCredentialManagementPreview, "Management", m.matrix_name_credential_management_preview, m.matrix_desc_cred_mgmt_preview),
    localizedFactRow(facts, FactID.FactIDCredentialManagementReadOnly, "Management", m.matrix_name_credential_management_read_only, m.matrix_desc_cred_mgmt_ro),
    localizedFactRow(facts, FactID.FactIDAuthenticatorConfig, "Management", m.matrix_name_authenticator_config, m.matrix_desc_authnr_cfg),
    localizedFactRow(facts, FactID.FactIDUvAuthenticatorConfig, "Management", m.matrix_name_uv_authenticator_config_permission, m.matrix_desc_uv_acfg),
    configCommandsRow(facts),
    vendorConfigCommandsRow(facts),
    localizedFactRow(facts, FactID.FactIDLongTouchForReset, "Management", m.matrix_name_long_touch_for_reset, m.matrix_desc_long_touch_for_reset),
    localizedFactRow(facts, FactID.FactIDTransportsForReset, "Management", m.matrix_name_reset_transports, m.matrix_desc_reset_transports),

    localizedFactRow(facts, FactID.FactIDEnterpriseAttestation, "Policy", m.matrix_name_enterprise_attestation, m.matrix_desc_ep),
    localizedFactRow(facts, FactID.FactIDAlwaysUV, "Policy", m.matrix_name_always_require_uv, m.matrix_desc_always_uv),
    localizedFactRow(facts, FactID.FactIDSetMinPINLength, "Policy", m.matrix_name_set_minimum_pin_length, m.matrix_desc_set_min_pin_length),
    makeCredentialUVRow(facts),
    forcePINChangeRow(facts),
    localizedFactRow(facts, FactID.FactIDPINComplexityPolicy, "Policy", m.matrix_name_pin_complexity_policy, m.matrix_desc_pin_complexity_policy),
    localizedFactRow(facts, FactID.FactIDPINComplexityPolicyURL, "Policy", m.matrix_name_pin_complexity_policy_url, m.matrix_desc_pin_complexity_policy_url),
    localizedFactRow(facts, FactID.FactIDMaxRPIDsForSetMinPINLength, "Policy", m.matrix_name_rp_ids_for_minimum_pin_length, m.matrix_desc_max_rpids_for_set_min_pin_length),

    ...EXTENSION_ROWS.map((entry) => extensionRow(facts, extensionFactIDs[entry.id], entry.name, entry.description, entry.id)),

    localizedFactRow(facts, FactID.FactIDEffectiveMaxMessageSize, "Limits", m.matrix_name_max_message_size, m.matrix_desc_max_msg_size),
    localizedFactRow(facts, FactID.FactIDMaxCredentialCountInList, "Limits", m.matrix_name_max_credential_list_count, m.matrix_desc_max_credential_list_count),
    localizedFactRow(facts, FactID.FactIDMaxCredentialIDLength, "Limits", m.matrix_name_max_credential_id_length, m.matrix_desc_max_credential_id_length),
    localizedFactRow(facts, FactID.FactIDEffectiveMinPINLength, "Limits", m.matrix_name_minimum_pin_length, m.matrix_desc_min_pin_length),
    localizedFactRow(facts, FactID.FactIDEffectiveMaxPINLength, "Limits", m.matrix_name_maximum_pin_length, m.matrix_desc_max_pin),
    localizedFactRow(facts, FactID.FactIDRemainingDiscoverableCredentials, "Limits", m.matrix_name_remaining_discoverable_credentials, m.matrix_desc_remaining_discoverable_credentials),

    attestationFormatsRow(facts),
    certificationsRow(facts),
    localizedFactRow(facts, FactID.FactIDFirmwareVersion, "Attestation", m.matrix_name_firmware_version, m.matrix_desc_firmware_version),
  ];
}

function localizedFactRow(
  facts: OverviewFactLookup,
  id: FactID,
  group: string,
  name: MessageText,
  description: MessageText,
) {
  const fact = overviewFact(facts, id);
  return row(group, name, description, overviewFactStatus(fact), formatFactValue(fact), fact.source);
}

function secretFactRow(
  facts: OverviewFactLookup,
  id: FactID,
  group: string,
  name: MessageText,
  description: MessageText,
) {
  const fact = overviewFact(facts, id);
  const factValue = fact.state === FactState.FactStateUnknown
    ? value.notReported()
    : compactSecretValue(factText(fact));
  return row(group, name, description, overviewFactStatus(fact), factValue, fact.source);
}

function formatFactValue(fact: Fact): string {
  if (fact.state === FactState.FactStateUnknown) return value.notReported();

  switch (fact.value.kind) {
    case FactValueKind.FactValueBoolean: {
      const input = factBoolean(fact);
      if (input === undefined) return value.notReported();
      if (factUsesSpecDefault(fact)) return input ? value.defaultTrue() : value.defaultFalse();
      return String(input);
    }
    case FactValueKind.FactValueInteger: {
      const input = factInteger(fact);
      if (input === undefined) return value.notReported();
      const unit = factUnit(fact);
      if (factUsesSpecDefault(fact)) {
        if (unit === "bytes") return value.defaultBytes(input);
        if (unit === "codePoints") return value.defaultCodePoints(input);
      }
      return formatNumberWithUnit(input, unit);
    }
    case FactValueKind.FactValueText:
      return textValue(factText(fact), value.notReported());
    case FactValueKind.FactValueList:
      return inlineList(factList(fact) ?? [], value.emptyList());
    default:
      throw new Error(`Unexpected value kind for Overview fact ${fact.id}: ${fact.value.kind}`);
  }
}

function transportRow(facts: OverviewFactLookup, device: DeviceReport | null) {
  const fact = overviewFact(facts, FactID.FactIDTransports);
  if (fact.state !== FactState.FactStateUnknown) {
    return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_getinfo, overviewFactStatus(fact), formatFactValue(fact), fact.source);
  }
  const transport = device?.attachment.transport;
  return row("Identity", m.matrix_name_transport, m.matrix_desc_transport_fallback, valueStatus(transport), textValue(transport, value.notReported()), fact.source);
}

function versionRow(facts: OverviewFactLookup, id: FactID, name: string, description: MessageText, version: string) {
  const fact = overviewFact(facts, id);
  return row("Protocol", name, description, overviewFactStatus(fact), formatProtocolVersion(version), fact.source);
}

function algorithmsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDAlgorithms);
  const formatted = fact.state === FactState.FactStateUnknown
    ? value.notReported()
    : inlineList((factList(fact) ?? []).map(formatCanonicalAlgorithm), value.emptyList());
  return row("Protocol", m.matrix_name_reported_cose_algorithms, m.matrix_desc_algorithms, overviewFactStatus(fact), formatted, fact.source);
}

function formatCanonicalAlgorithm(input: string) {
  const separator = input.lastIndexOf(":");
  if (separator < 0) return input;
  const type = input.slice(0, separator);
  const algorithm = Number(input.slice(separator + 1));
  return Number.isSafeInteger(algorithm) ? `${algorithmLabel(algorithm)} / ${type}` : input;
}

function userPresenceRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDUserPresence);
  const present = fact.state === FactState.FactStateUnknown ? undefined : factBoolean(fact);
  return row(
    "Verification",
    m.matrix_name_user_presence_touch,
    present === false ? m.matrix_desc_up_false : m.matrix_desc_up_true,
    overviewFactStatus(fact),
    formatFactValue(fact),
    fact.source,
  );
}

function clientPINRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDClientPIN);
  const description = fact.state === FactState.FactStateConfigured
    ? m.matrix_desc_client_pin_set
    : fact.state === FactState.FactStateNotConfigured
      ? m.matrix_desc_client_pin_not_set
      : m.matrix_desc_client_pin_absent;
  const factValue = fact.state === FactState.FactStateConfigured
    ? value.pinSet()
    : fact.state === FactState.FactStateNotConfigured
      ? value.pinNotSet()
      : formatFactValue(fact);
  return row("Verification", m.matrix_name_client_pin, description, overviewFactStatus(fact), factValue, fact.source);
}

function userVerificationRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDUserVerification);
  const description = fact.state === FactState.FactStateConfigured
    ? m.matrix_desc_uv_configured
    : fact.state === FactState.FactStateNotConfigured
      ? m.matrix_desc_uv_not_configured
      : m.matrix_desc_uv_absent;
  const factValue = fact.state === FactState.FactStateConfigured
    ? value.configured()
    : fact.state === FactState.FactStateNotConfigured
      ? value.notConfigured()
      : formatFactValue(fact);
  return row("Verification", m.matrix_name_built_in_user_verification, description, overviewFactStatus(fact), factValue, fact.source);
}

function clientPINMCGAPermissionsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDClientPINMCGAPermissions);
  const available = fact.state === FactState.FactStateUnknown ? undefined : factBoolean(fact);
  const description = available === false
    ? m.matrix_desc_no_mc_ga_permissions_true
    : m.matrix_desc_no_mc_ga_permissions_false;
  const factValue = available === false
    ? value.notAvailableThroughClientPinToken()
    : fact.state === FactState.FactStateUnknown
      ? value.notReported()
      : factUsesSpecDefault(fact)
        ? value.availableByDefault()
        : value.available();
  return row("Verification", m.matrix_name_client_pin_token_mc_ga_permissions, description, overviewFactStatus(fact), factValue, fact.source);
}

function largeBlobsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDLargeBlobs);
  const capacity = overviewFact(facts, FactID.FactIDMaxSerializedLargeBlobArray);
  let factValue = formatFactValue(fact);
  if (fact.state === FactState.FactStateSupported) {
    factValue = capacity.state === FactState.FactStateUnknown
      ? value.capacityNotReported()
      : formatFactValue(capacity);
  } else if (fact.state === FactState.FactStateUnsupported) {
    factValue = value.falseOrAbsent();
  }
  return row("Storage", m.matrix_name_large_blobs_command, m.matrix_desc_large_blobs_command, overviewFactStatus(fact), factValue, fact.source);
}

function largeBlobKeyRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDLargeBlobKey);
  const factValue = fact.state === FactState.FactStateSupported
    ? "largeBlobKey"
    : fact.state === FactState.FactStateUnsupported
      ? value.notListed()
      : value.extensionsNotReported();
  return row("Storage", m.matrix_name_large_blob_key_extension, m.matrix_desc_large_blob_key, overviewFactStatus(fact), factValue, fact.source);
}

function configCommandsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDAuthenticatorConfigCommands);
  const commands = fact.state === FactState.FactStateUnknown
    ? []
    : (factList(fact) ?? []).map((command) => {
        const name = configCommandNames.get(command);
        const formatted = formatUnsignedDecimalHex(command);
        return name ? `${name} (${formatted})` : formatted;
      });
  const factValue = fact.state === FactState.FactStateUnknown
    ? value.notReported()
    : inlineList(commands, value.emptyList());
  return row("Management", m.matrix_name_authenticator_config_commands, m.matrix_desc_config_commands, overviewFactStatus(fact), factValue, fact.source);
}

function vendorConfigCommandsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDVendorPrototypeConfigCommands);
  const commands = fact.state === FactState.FactStateUnknown
    ? []
    : (factList(fact) ?? []).map(formatUnsignedDecimalHex);
  const factValue = fact.state === FactState.FactStateUnknown
    ? value.notReported()
    : inlineList(commands, value.emptyList());
  return row("Management", m.matrix_name_vendor_prototype_config_commands, m.matrix_desc_vendor_config_commands, overviewFactStatus(fact), factValue, fact.source);
}

function formatUnsignedDecimalHex(input: string) {
  try {
    const amount = BigInt(input);
    if (amount < 0n) return input;
    const hex = amount.toString(16).toUpperCase();
    const width = amount <= 0xffn ? 2 : amount <= 0xffffn ? 4 : 0;
    return `0x${hex.padStart(width, "0")}`;
  } catch {
    return input;
  }
}

function makeCredentialUVRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDMakeCredentialUVRequirement);
  const required = fact.state === FactState.FactStateUnknown ? undefined : factBoolean(fact);
  const description = required === false
    ? m.matrix_desc_make_cred_uv_skipped
    : m.matrix_desc_make_cred_uv_required;
  const factValue = required === false
    ? value.uvMayBeSkipped()
    : fact.state === FactState.FactStateUnknown
      ? value.notReported()
      : factUsesSpecDefault(fact)
        ? value.uvRequiredByDefault()
        : value.uvRequired();
  return row("Policy", m.matrix_name_non_discoverable_credential_uv_requirement, description, overviewFactStatus(fact), factValue, fact.source);
}

function forcePINChangeRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDForcePINChange);
  const required = fact.state === FactState.FactStateWarning;
  return row(
    "Policy",
    m.matrix_name_force_pin_change,
    required ? m.matrix_desc_force_pin_required : m.matrix_desc_force_pin_not_required,
    overviewFactStatus(fact),
    required
      ? value.pinChangeRequired()
      : fact.origin === FactOrigin.FactOriginSpecDefault
        ? value.notRequiredByDefault()
        : value.notRequired(),
    fact.source,
  );
}

function extensionRow(facts: OverviewFactLookup, id: FactID, name: MessageText, description: MessageText, extension: string) {
  const fact = overviewFact(facts, id);
  const factValue = fact.state === FactState.FactStateSupported
    ? extension
    : fact.state === FactState.FactStateUnsupported
      ? value.notListed()
      : value.extensionsNotReported();
  return row("Extensions", name, description, overviewFactStatus(fact), factValue, fact.source);
}

function attestationFormatsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDAttestationFormats);
  const factValue = fact.state === FactState.FactStateUnknown
    ? value.notReported()
    : fact.origin === FactOrigin.FactOriginSpecDefault
      ? value.noneImpliedNoFormatsReported()
      : inlineList(factList(fact) ?? [], value.emptyList());
  return row("Attestation", m.matrix_name_attestation_formats, m.matrix_desc_attestation_formats, overviewFactStatus(fact), factValue, fact.source);
}

function certificationsRow(facts: OverviewFactLookup) {
  const fact = overviewFact(facts, FactID.FactIDCertifications);
  let factValue: string = value.certificationsNotReported();
  if (fact.state === FactState.FactStateUnsupported) {
    factValue = value.notListed();
  } else if (fact.state !== FactState.FactStateUnknown) {
    factValue = (factList(fact) ?? []).map(formatCertification).join(", ");
  }
  return row("Attestation", m.mds_certification, m.matrix_desc_fido_certification, overviewFactStatus(fact), factValue, fact.source);
}

function formatCertification(input: string) {
  const separator = input.lastIndexOf("=");
  if (separator < 0) return input;
  const id = input.slice(0, separator);
  const level = Number(input.slice(separator + 1));
  return `${id}: ${formatCertificationValue(id, Number.isSafeInteger(level) ? level : undefined)}`;
}

function vendorIdentityRows(device: DeviceReport | null) {
  const identity = device?.identity;

  return [
    row("Identity", m.matrix_name_device_vendor, m.matrix_desc_device_vendor, valueStatus(identity?.vendor), textValue(identity?.vendor, value.notReported()), "device.identity.vendor"),
    row("Identity", m.matrix_name_device_model, m.matrix_desc_device_model, valueStatus(identity?.model), textValue(identity?.model, value.notReported()), "device.identity.model"),
    row("Identity", m.matrix_name_device_serial, m.matrix_desc_device_serial, valueStatus(identity?.serial), textValue(identity?.serial, value.notReported()), "device.identity.serial"),
    row("Identity", m.matrix_name_device_firmware, m.matrix_desc_device_firmware, valueStatus(identity?.firmware), textValue(identity?.firmware, value.notReported()), "device.identity.firmware"),
  ];
}

function vendorInterfaceRows(device: DeviceReport | null) {
  return (device?.identity?.interfaces ?? []).flatMap((interfaceReport) => {
    const rows = [interfacePresenceRow(interfaceReport)];
    if (device?.identity?.vendor !== Vendor.VendorToken2 || (interfaceReport.supported?.length ?? 0) > 0) {
      rows.push(interfaceApplicationsRow(interfaceReport, "supported"));
    }
    if (device?.identity?.vendor === Vendor.VendorYubico) {
      rows.push(interfaceApplicationsRow(interfaceReport, "enabled"));
    }
    return rows;
  });
}

function vendorDetailRows(device: DeviceReport | null) {
  return [
    ...yubicoDetailRows(device),
  ];
}

function yubicoDetailRows(device: DeviceReport | null) {
  const details = device?.identity?.details?.yubico;
  if (!details) return [];

  const rows: OverviewRow[] = [];
  if (details.partNumber) {
    rows.push(row("Vendor", m.matrix_name_yubico_part_number, m.matrix_desc_yubico_part_number, "informational", details.partNumber, "device.identity.details.yubico.partNumber"));
  }
  rows.push(
    row("Vendor", m.matrix_name_yubico_form_factor, m.matrix_desc_yubico_form_factor, "informational", yubicoFormFactorLabel(details.formFactor), "device.identity.details.yubico.formFactor"),
    yubicoBooleanRow(m.matrix_name_yubico_fips, m.matrix_desc_yubico_fips, details.isFIPS, "device.identity.details.yubico.isFIPS"),
    yubicoBooleanRow(m.matrix_name_yubico_security_key, m.matrix_desc_yubico_security_key, details.isSecurityKey, "device.identity.details.yubico.isSecurityKey"),
  );
  if (details.effectiveFirmware) {
    rows.push(row("Vendor", m.matrix_name_yubico_effective_firmware, m.matrix_desc_yubico_effective_firmware, "informational", details.effectiveFirmware, "device.identity.details.yubico.effectiveFirmware"));
  }
  if (details.versionQualifier) {
    rows.push(row(
      "Vendor",
      m.matrix_name_yubico_version_qualifier,
      m.matrix_desc_yubico_version_qualifier,
      "informational",
      `${details.versionQualifier.version} ${details.versionQualifier.releaseType} ${details.versionQualifier.iteration}`,
      "device.identity.details.yubico.versionQualifier",
    ));
  }
  rows.push(
    row("Vendor", m.matrix_name_yubico_auto_eject_timeout, m.matrix_desc_yubico_auto_eject_timeout, "informational", String(details.autoEjectTimeout), "device.identity.details.yubico.autoEjectTimeout"),
    row("Vendor", m.matrix_name_yubico_challenge_response_timeout, m.matrix_desc_yubico_challenge_response_timeout, "informational", String(details.challengeResponseTimeout), "device.identity.details.yubico.challengeResponseTimeout"),
    yubicoBooleanRow(m.matrix_name_yubico_locked, m.matrix_desc_yubico_locked, details.locked, "device.identity.details.yubico.locked"),
    yubicoCapabilitiesRow(m.matrix_name_yubico_fips_capable, m.matrix_desc_yubico_fips_capable, details.fipsCapable ?? [], "device.identity.details.yubico.fipsCapable"),
    yubicoCapabilitiesRow(m.matrix_name_yubico_fips_approved, m.matrix_desc_yubico_fips_approved, details.fipsApproved ?? [], "device.identity.details.yubico.fipsApproved"),
    yubicoBooleanRow(m.matrix_name_yubico_pin_complexity, m.matrix_desc_yubico_pin_complexity, details.pinComplexity, "device.identity.details.yubico.pinComplexity"),
    yubicoBooleanRow(m.matrix_name_yubico_nfc_restricted, m.matrix_desc_yubico_nfc_restricted, details.nfcRestricted, "device.identity.details.yubico.nfcRestricted"),
    yubicoCapabilitiesRow(m.matrix_name_yubico_reset_blocked, m.matrix_desc_yubico_reset_blocked, details.resetBlocked ?? [], "device.identity.details.yubico.resetBlocked"),
  );
  if (details.fpsVersion) {
    rows.push(row("Vendor", m.matrix_name_yubico_fps_version, m.matrix_desc_yubico_fps_version, "informational", details.fpsVersion, "device.identity.details.yubico.fpsVersion"));
  }
  if (details.stmVersion) {
    rows.push(row("Vendor", m.matrix_name_yubico_stm_version, m.matrix_desc_yubico_stm_version, "informational", details.stmVersion, "device.identity.details.yubico.stmVersion"));
  }

  return rows;
}

function yubicoBooleanRow(name: MessageText, description: MessageText, enabled: boolean, source: string) {
  return row("Vendor", name, description, "informational", enabled ? m.status_enabled() : m.status_disabled(), source);
}

function yubicoCapabilitiesRow(name: MessageText, description: MessageText, capabilities: Capability[], source: string) {
  return row("Vendor", name, description, "informational", inlineList(capabilities.map(capabilityLabel), value.emptyList()), source);
}

function yubicoFormFactorLabel(input: YubicoFormFactor) {
  const labels: Record<YubicoFormFactor, string> = {
    [YubicoFormFactor.$zero]: value.notReported(),
    [YubicoFormFactor.YubicoFormFactorUnknown]: value.notReported(),
    [YubicoFormFactor.YubicoFormFactorUSBAKeychain]: "USB-A keychain",
    [YubicoFormFactor.YubicoFormFactorUSBANano]: "USB-A Nano",
    [YubicoFormFactor.YubicoFormFactorUSBCKeychain]: "USB-C keychain",
    [YubicoFormFactor.YubicoFormFactorUSBCNano]: "USB-C Nano",
    [YubicoFormFactor.YubicoFormFactorUSBCLightning]: "USB-C + Lightning",
    [YubicoFormFactor.YubicoFormFactorUSBABiometricKeychain]: "USB-A biometric keychain",
    [YubicoFormFactor.YubicoFormFactorUSBCBiometricKeychain]: "USB-C biometric keychain",
  };
  return labels[input];
}

function interfacePresenceRow(interfaceReport: InterfaceReport) {
  const interfaceName = interfaceLabel(interfaceReport.interface);
  return row(
    "Interfaces",
    m.matrix_name_vendor_interface({ interface: interfaceName }),
    m.matrix_desc_vendor_interface,
    "informational",
    value.available(),
    `device.identity.interfaces.${interfaceReport.interface}.interface`,
  );
}

function interfaceApplicationsRow(interfaceReport: InterfaceReport, field: "supported" | "enabled") {
  const interfaceName = interfaceLabel(interfaceReport.interface);
  const applications = (interfaceReport[field] ?? []).map(capabilityLabel);
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
    `device.identity.interfaces.${interfaceReport.interface}.${field}`,
  );
}

function identityResolutionRow(device: DeviceReport | null) {
  const state = device?.identityResolution.state;
  const labels: Record<IdentityResolutionState, string> = {
    [IdentityResolutionState.$zero]: "",
    [IdentityResolutionState.IdentityResolving]: m.identity_resolving(),
    [IdentityResolutionState.IdentityResolved]: m.identity_resolved(),
    [IdentityResolutionState.IdentityUnavailable]: m.identity_unavailable(),
    [IdentityResolutionState.IdentityFailed]: m.identity_failed(),
  };
  return row(
    "Identity",
    m.matrix_name_identity_resolution,
    m.matrix_desc_identity_resolution,
    state ? "informational" : "unknown",
    state ? labels[state] : value.notReported(),
    "device.identityResolution.state",
  );
}

function connectionRows(device: DeviceReport | null) {
  const smartCard = device?.attachment.smartCard;
  if (!smartCard) return [];
  return [
    row("Identity", m.matrix_name_smart_card_reader, m.matrix_desc_smart_card_reader, valueStatus(smartCard.reader), textValue(smartCard.reader, value.notReported()), "device.attachment.smartCard.reader"),
    row("Identity", m.matrix_name_smart_card_atr, m.matrix_desc_smart_card_atr, valueStatus(smartCard.atr), textValue(smartCard.atr, value.notReported()), "device.attachment.smartCard.atr"),
  ];
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
    [Capability.CapabilityHSMAuth]: "HSM Auth",
    [Capability.CapabilityCTAP2]: "CTAP2",
  };
  return labels[input] || input;
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
