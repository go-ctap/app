export type OverviewRowStatus =
  | "supported"
  | "unsupported"
  | "configured"
  | "not configured"
  | "enabled"
  | "disabled"
  | "warning"
  | "unknown"
  | "informational";

export type OverviewRow = {
  group: string;
  name: string;
  description: string;
  status: OverviewRowStatus;
  value?: string;
  source?: string;
};

export type OverviewGroup = {
  name: string;
  rows: OverviewRow[];
};

type OverviewContext = {
  info?: Record<string, unknown> | null;
  device?: Record<string, unknown> | null;
  bioSensor?: Record<string, unknown> | null;
};

const EXTENSION_ROWS = [
  ["credProtect", "Credential protection", "Credential protection policy requested by relying parties."],
  ["credBlob", "Credential blob", "Small opaque data stored with a credential."],
  ["largeBlobKey", "Large Blob Key", "Per-credential key used by platforms to read and write large-blob array entries."],
  ["largeBlob", "Large Blob", "Alternative legacy extension path for authenticator-managed large blob data."],
  ["minPinLength", "Minimum PIN length", "Relying-party visibility into minimum PIN length policy."],
  ["pinComplexityPolicy", "PIN complexity policy", "PIN policy metadata exposed through extension processing."],
  ["hmac-secret", "HMAC secret", "Credential-scoped symmetric secret extension."],
  ["hmac-secret-mc", "HMAC secret at creation", "Secret derivation during makeCredential."],
  ["thirdPartyPayment", "Third-party payment", "Payment authentication marker extension."],
] as const;

type CoseAlgorithmRule = {
  alg: number;
  name: string;
  description: string;
};

const COSE_ALGORITHM_ROWS: CoseAlgorithmRule[] = [
  { alg: -8, name: "EdDSA", description: "EdDSA. WebAuthn keys must use crv 6 (Ed25519); COSE uses compressed form for this key type." },
  { alg: -7, name: "ES256", description: "ECDSA with SHA-256. WebAuthn keys must use crv 1 (P-256) and uncompressed EC points." },
  { alg: -257, name: "RS256", description: "RSASSA-PKCS1-v1_5 with SHA-256. Recommended by WebAuthn for broad authenticator compatibility." },
];

const GROUP_ORDER = ["Identity", "Protocol", "Verification", "Storage", "Management", "Policy", "Extensions", "Limits", "Attestation"];

export function buildOverviewRows({ info = {}, device = {}, bioSensor = {} }: OverviewContext): OverviewRow[] {
  const options = objectValue(info.options);
  const versions = arrayValue(info.versions);
  const extensions = arrayValue(info.extensions);
  const transports = arrayValue(info.transports);
  const algorithms = arrayValue(info.algorithms);
  const attestationFormats = arrayValue(info.attestationFormats);
  const pinUvAuthProtocols = arrayValue(info.pinUvAuthProtocols);
  const certifications = objectValue(info.certifications);

  const versionsKnown = Array.isArray(info.versions);
  const extensionsKnown = Array.isArray(info.extensions);
  const attestationFormatsKnown = Array.isArray(info.attestationFormats);
  const pinUvAuthProtocolsKnown = Array.isArray(info.pinUvAuthProtocols);

  const hasLargeBlobKey = extensions.includes("largeBlobKey");
  const hasLargeBlobExtension = extensions.includes("largeBlob");
  const largeBlobsCommand = option(options, "largeBlobs") === true;
  const largeBlobCapacity = numberValue(info.maxSerializedLargeBlobArray);
  const maxCredentialLength = numberValue(info.maxCredentialIdLength) ?? numberValue(info.maxCredentialLength);
  const maxCredentialLengthSource = hasOwn(info, "maxCredentialIdLength") ? "maxCredentialIdLength" : "maxCredentialLength";

  return [
    row("Identity", "AAGUID", "Authenticator model identifier from authenticatorGetInfo.", valueStatus(info.aaguid), textValue(info.aaguid, "not reported"), "aaguid"),
    row("Identity", "Device ID", "Workbench selector or transport identity for the selected authenticator.", valueStatus(device.deviceId), textValue(device.deviceId, "not reported"), "device.deviceId"),
    row("Identity", "Transport", "Transport reported by getInfo, falling back to discovery metadata.", valueStatus(transports.length ? transports : device.transport), transports.length ? inlineList(transports) : textValue(device.transport, "not reported"), "transports"),
    optionRow("Identity", "Platform attachment", "CTAP option plat marks authenticators attached to the client platform.", option(options, "plat"), "enabled", "disabled", "options.plat"),
    row("Identity", "Encrypted device identifier", "Encrypted per-call device identifier available after persistent PIN/UV auth token establishment.", valueStatus(info.encIdentifier), compactSecretValue(info.encIdentifier), "encIdentifier"),

    row("Protocol", "Reported versions", "CTAP/U2F protocol versions returned by authenticatorGetInfo.", knownListStatus(versionsKnown, versions), inlineList(versions, "not reported"), "versions"),
    versionRow("U2F", "Legacy CTAP1/U2F compatibility.", versionsKnown, versions, "U2F_V2"),
    versionRow("FIDO 2.0", "CTAP 2.0 support.", versionsKnown, versions, "FIDO_2_0"),
    versionRow("FIDO 2.1 Preview", "Prototype CTAP 2.1 feature set.", versionsKnown, versions, "FIDO_2_1_PRE"),
    versionRow("FIDO 2.1", "CTAP 2.1 support.", versionsKnown, versions, "FIDO_2_1"),
    versionRow("FIDO 2.3", "CTAP 2.3 support.", versionsKnown, versions, "FIDO_2_3"),
    row("Protocol", "Reported COSE algorithms", "Public-key credential algorithms reported by authenticatorGetInfo.", knownListStatus(Array.isArray(info.algorithms), algorithms), algorithms.length ? inlineList(algorithms.map(formatAlgorithm)) : "not reported", "algorithms"),
    ...coseAlgorithmRows(Array.isArray(info.algorithms), algorithms),

    upRow(options),
    optionRow("Verification", "Discoverable credentials", "CTAP option rk controls resident/discoverable credential creation.", option(options, "rk"), "supported", "unsupported", "options.rk"),
    clientPinRow(options),
    uvRow(options),
    optionRow("Verification", "PIN/UV auth token permissions", "Support for getPinUvAuthTokenUsingPinWithPermissions or getPinUvAuthTokenUsingUvWithPermissions.", option(options, "pinUvAuthToken"), "supported", "unsupported", "options.pinUvAuthToken"),
    noMcGaPermissionsRow(options),
    row("Verification", "PIN/UV auth protocols", "Supported PIN/UV auth protocol versions for token permissions.", knownListStatus(pinUvAuthProtocolsKnown, pinUvAuthProtocols), inlineList(pinUvAuthProtocols, "not reported"), "pinUvAuthProtocols"),
    triStateOptionRow("Verification", "Biometric enrollment", "AuthenticatorBioEnrollment support and current enrollment state.", option(options, "bioEnroll"), "configured", "not configured", "unsupported", "options.bioEnroll"),
    triStateOptionRow("Verification", "Bio enrollment preview", "FIDO_2_1_PRE prototype bio-enrollment command support and enrollment state.", option(options, "userVerificationMgmtPreview"), "configured", "not configured", "unsupported", "options.userVerificationMgmtPreview"),
    optionRow("Verification", "UV bio enrollment permission", "Whether UV tokens can request the bio-enrollment permission.", option(options, "uvBioEnroll"), "supported", "unsupported", "options.uvBioEnroll"),
    row("Verification", "Biometric modality", "Bio sensor modality reported by the optional sensor query.", valueStatus(bioSensor.modality), textValue(bioSensor.modality, "not reported"), "bioSensor.modality"),
    limitRow("Verification", "UV modality bit flags", "Built-in UV modality hint from authenticatorGetInfo.", info.uvModality, "uvModality"),
    limitRow("Verification", "Preferred platform UV attempts", "Preferred built-in UV attempts before platform fallback to PIN.", info.preferredPlatformUvAttempts, "preferredPlatformUvAttempts"),
    limitRow("Verification", "UV count since last PIN entry", "Internal UV operations since the last successful PIN entry.", info.uvCountSinceLastPinEntry, "uvCountSinceLastPinEntry"),

    largeBlobsCommandRow(largeBlobsCommand, largeBlobCapacity),
    largeBlobKeyRow(hasLargeBlobKey, largeBlobsCommand, extensionsKnown),
    extensionSupportRow("Storage", "Large Blob extension", "Alternative extension path for authenticators that handle blob data in getAssertion.", "largeBlob", extensionsKnown, extensions, "extensions.largeBlob"),
    largeBlobCapacityRow(largeBlobCapacity, largeBlobsCommand),
    largeBlobConflictRow(hasLargeBlobExtension, hasLargeBlobKey, largeBlobsCommand),
    extensionSupportRow("Storage", "Credential blob extension", "Small opaque per-credential data stored directly with a credential.", "credBlob", extensionsKnown, extensions, "extensions.credBlob"),
    row("Storage", "Encrypted credential store state", "Encrypted credential store state value available after persistent PIN/UV auth token establishment.", valueStatus(info.encCredStoreState), compactSecretValue(info.encCredStoreState), "encCredStoreState"),

    optionRow("Management", "Credential management", "authenticatorCredentialManagement command support.", option(options, "credMgmt"), "supported", "unsupported", "options.credMgmt"),
    optionRow("Management", "Credential management preview", "FIDO_2_1_PRE prototype credential management command support.", option(options, "credentialMgmtPreview"), "supported", "unsupported", "options.credentialMgmtPreview"),
    optionRow("Management", "Credential management read-only", "PIN/UV token permission support for read-only credential enumeration.", option(options, "perCredMgmtRO"), "supported", "unsupported", "options.perCredMgmtRO"),
    optionRow("Management", "Authenticator config", "authenticatorConfig command support.", option(options, "authnrCfg"), "supported", "unsupported", "options.authnrCfg"),
    optionRow("Management", "UV authenticator config permission", "Whether UV tokens can request the authenticatorConfig permission.", option(options, "uvAcfg"), "supported", "unsupported", "options.uvAcfg"),
    row("Management", "Authenticator config commands", "Supported authenticatorConfig subcommand identifiers.", knownListStatus(Array.isArray(info.authenticatorConfigCommands), arrayValue(info.authenticatorConfigCommands)), inlineList(arrayValue(info.authenticatorConfigCommands), "not reported"), "authenticatorConfigCommands"),
    row("Management", "Vendor prototype config commands", "Vendor prototype authenticatorConfig command identifiers.", knownListStatus(Array.isArray(info.vendorPrototypeConfigCommands), arrayValue(info.vendorPrototypeConfigCommands)), inlineList(arrayValue(info.vendorPrototypeConfigCommands), "not reported"), "vendorPrototypeConfigCommands"),
    booleanFeatureRow("Management", "Long touch for reset", "Whether reset requires a touch of at least five seconds.", info, "longTouchForReset", "enabled", "disabled", "unsupported"),
    row("Management", "Reset transports", "Transports over which the authenticatorReset command is supported.", knownListStatus(Array.isArray(info.transportsForReset), arrayValue(info.transportsForReset)), inlineList(arrayValue(info.transportsForReset), "not reported"), "transportsForReset"),

    triStateOptionRow("Policy", "Enterprise attestation", "Enterprise attestation capability and enabled state.", option(options, "ep"), "enabled", "disabled", "unsupported", "options.ep"),
    triStateOptionRow("Policy", "Always require UV", "Always Require User Verification support and current setting.", option(options, "alwaysUv"), "enabled", "disabled", "unsupported", "options.alwaysUv"),
    optionRow("Policy", "Set minimum PIN length", "Set Minimum PIN Length subcommand support.", option(options, "setMinPINLength"), "supported", "unsupported", "options.setMinPINLength"),
    makeCredUvRow(options),
    forcePinChangeRow(info),
    booleanFeatureRow("Policy", "PIN complexity policy", "Additional current PIN complexity policy beyond minimum length.", info, "pinComplexityPolicy", "enabled", "disabled", "unsupported"),
    row("Policy", "PIN complexity policy URL", "User-facing policy information URL reported by the authenticator.", valueStatus(info.pinComplexityPolicyURL), textValue(info.pinComplexityPolicyURL, "not reported"), "pinComplexityPolicyURL"),
    limitRow("Policy", "RP IDs for minimum PIN length", "Maximum RP IDs accepted by setMinPINLength for minPinLength extension visibility.", info.maxRPIDsForSetMinPINLength, "maxRPIDsForSetMinPINLength"),

    ...EXTENSION_ROWS.map(([id, name, description]) => extensionSupportRow("Extensions", name, description, id, extensionsKnown, extensions, `extensions.${id}`)),

    limitRow("Limits", "Max message size", "Maximum CTAP message size.", info.maxMsgSize, "maxMsgSize", "bytes"),
    limitRow("Limits", "Max credential list count", "Maximum credential IDs accepted in a request list.", info.maxCredentialCountInList, "maxCredentialCountInList"),
    limitRow("Limits", "Max credential ID length", "Maximum credential ID length.", maxCredentialLength, maxCredentialLengthSource, "bytes"),
    limitRow("Limits", "Max credBlob length", "Maximum credBlob payload size.", info.maxCredBlobLength, "maxCredBlobLength", "bytes"),
    limitRow("Limits", "Minimum PIN length", "Current minimum PIN length enforced by the authenticator.", info.minPINLength, "minPINLength", "code points"),
    maxPinLengthRow(options, info.maxPINLength),
    limitRow("Limits", "Remaining discoverable credentials", "Remaining discoverable credential capacity, when reported.", info.remainingDiscoverableCredentials, "remainingDiscoverableCredentials"),

    row("Attestation", "Attestation formats", "Reported attestation statement formats. The none format is implied even when omitted.", attestationFormatsKnown ? "informational" : "unknown", attestationFormats.length ? inlineList(attestationFormats) : attestationFormatsKnown ? "none implied; no formats reported" : "not reported", "attestationFormats"),
    row("Attestation", "Certifications", "Authenticator certification identifiers and levels, when reported.", Object.keys(certifications).length ? "informational" : "unknown", Object.keys(certifications).length ? formatMap(certifications) : "not reported", "certifications"),
    row("Attestation", "Firmware version", "Firmware version reported by authenticatorGetInfo.", valueStatus(info.firmwareVersion), textValue(info.firmwareVersion, "not reported"), "firmwareVersion"),
  ].filter(Boolean) as OverviewRow[];
}

export function groupOverviewRows(rows: OverviewRow[]): OverviewGroup[] {
  return GROUP_ORDER.map((name) => ({ name, rows: rows.filter((row) => row.group === name) })).filter((group) => group.rows.length > 0);
}

export function overviewStatusLabel(status: OverviewRowStatus) {
  if (status === "not configured") return "not configured";
  if (status === "informational") return "info";
  return status;
}

export function overviewRowSupported(row: OverviewRow) {
  return row.status === "supported" || row.status === "configured" || row.status === "enabled";
}

export function overviewRowKnown(row: OverviewRow) {
  return row.status !== "unknown" && row.status !== "informational";
}

export function groupSummary(rows: OverviewRow[]) {
  const known = rows.filter(overviewRowKnown);
  const supported = known.filter(overviewRowSupported);
  return known.length ? `${supported.length}/${known.length} active` : "reported values";
}

export function inlineList(value: unknown[], fallback = "unknown") {
  return value.length ? value.map((item) => String(formatListItem(item))).join(", ") : fallback;
}

export function formatAlgorithm(value: unknown) {
  if (typeof value === "number") return algorithmLabel(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? algorithmLabel(parsed) : value;
  }
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    const alg = algorithmIdentifier(item);
    const type = textValue(item.type, "public-key");
    return alg !== undefined ? `${algorithmLabel(alg)} / ${type}` : JSON.stringify(item);
  }
  return value ?? "unknown";
}

function row(group: string, name: string, description: string, status: OverviewRowStatus, value?: string, source?: string): OverviewRow {
  return { group, name, description, status, value, source };
}

function versionRow(name: string, description: string, versionsKnown: boolean, versions: unknown[], version: string) {
  return row("Protocol", name, description, versionsKnown ? versions.includes(version) ? "supported" : "unsupported" : "unknown", version, `versions.${version}`);
}

function optionRow(
  group: string,
  name: string,
  description: string,
  value: boolean | undefined,
  trueStatus: OverviewRowStatus,
  falseStatus: OverviewRowStatus,
  source: string,
  absentValue?: string,
) {
  if (value === true) return row(group, name, description, trueStatus, "true", source);
  if (value === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, falseStatus, absentValue || "absent", source);
}

function upRow(options: Record<string, unknown>) {
  const value = option(options, "up");
  if (value === false) return row("Verification", "User presence / touch", "CTAP option up defaults to true when absent.", "unsupported", "false", "options.up");
  return row("Verification", "User presence / touch", "CTAP option up defaults to true when absent.", "supported", value === true ? "true" : "default true", "options.up");
}

function triStateOptionRow(
  group: string,
  name: string,
  description: string,
  value: boolean | undefined,
  trueStatus: OverviewRowStatus,
  falseStatus: OverviewRowStatus,
  absentStatus: OverviewRowStatus,
  source: string,
) {
  if (value === true) return row(group, name, description, trueStatus, "true", source);
  if (value === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, absentStatus, "absent", source);
}

function clientPinRow(options: Record<string, unknown>) {
  const value = option(options, "clientPin");
  if (value === true) return row("Verification", "Client PIN", "ClientPIN is supported and a PIN is currently set.", "configured", "PIN set", "options.clientPin");
  if (value === false) return row("Verification", "Client PIN", "ClientPIN is supported but a PIN is not set yet.", "not configured", "PIN not set", "options.clientPin");
  return row("Verification", "Client PIN", "ClientPIN support is absent from getInfo options.", "unsupported", "absent", "options.clientPin");
}

function uvRow(options: Record<string, unknown>) {
  const value = option(options, "uv");
  if (value === true) return row("Verification", "Built-in user verification", "Built-in UV is supported and configured.", "configured", "configured", "options.uv");
  if (value === false) return row("Verification", "Built-in user verification", "Built-in UV is supported but not configured.", "not configured", "not configured", "options.uv");
  return row("Verification", "Built-in user verification", "No built-in UV capability was reported.", "unsupported", "absent", "options.uv");
}

function makeCredUvRow(options: Record<string, unknown>) {
  const value = option(options, "makeCredUvNotRqd");
  if (value === true) {
    return row("Policy", "Non-discoverable credential UV requirement", "Authenticator allows non-discoverable credential creation without UV when requested.", "informational", "UV may be skipped", "options.makeCredUvNotRqd");
  }
  return row("Policy", "Non-discoverable credential UV requirement", "Authenticator requires some form of UV for non-discoverable credential creation.", "informational", value === false ? "UV required" : "UV required by default", "options.makeCredUvNotRqd");
}

function coseAlgorithmRows(known: boolean, algorithms: unknown[]) {
  const reported = algorithms.map(algorithmIdentifier).filter((alg): alg is number => alg !== undefined);
  const knownIds = COSE_ALGORITHM_ROWS.map(({ alg }) => alg);
  const extra = reported.filter((alg) => !knownIds.includes(alg));

  return [
    ...COSE_ALGORITHM_ROWS.map((entry) => coseAlgorithmRow(entry, known, algorithms)),
    extra.length
      ? row("Protocol", "Other reported COSE algorithms", "Additional COSEAlgorithmIdentifier values not in the Overview dictionary.", "informational", inlineList([...new Set(extra)].map(algorithmLabel)), "algorithms")
      : null,
  ];
}

function coseAlgorithmRow(entry: CoseAlgorithmRule, known: boolean, algorithms: unknown[]) {
  if (!known) {
    return row("Protocol", `${entry.name} (${entry.alg})`, entry.description, "unknown", "algorithms not reported", `algorithms.${entry.alg}`);
  }

  const matches = algorithms.filter((item) => algorithmIdentifier(item) === entry.alg);
  if (!matches.length) {
    return row("Protocol", `${entry.name} (${entry.alg})`, entry.description, "unsupported", "not listed", `algorithms.${entry.alg}`);
  }

  const types = [...new Set(matches.map(algorithmType).filter(Boolean))];
  return row("Protocol", `${entry.name} (${entry.alg})`, entry.description, "supported", types.length ? `${entry.alg}; ${inlineList(types)}` : String(entry.alg), `algorithms.${entry.alg}`);
}

function noMcGaPermissionsRow(options: Record<string, unknown>) {
  const value = option(options, "noMcGaPermissionsWithClientPin");
  if (value === true) {
    return row("Verification", "Client PIN token MC/GA permissions", "ClientPIN token cannot be used for makeCredential/getAssertion permissions.", "warning", "not available through ClientPIN token", "options.noMcGaPermissionsWithClientPin");
  }
  return row("Verification", "Client PIN token MC/GA permissions", "ClientPIN token can be used for makeCredential/getAssertion permissions.", "informational", value === false ? "available" : "available by default", "options.noMcGaPermissionsWithClientPin");
}

function forcePinChangeRow(info: Record<string, unknown>) {
  if (info.forcePINChange === true) {
    return row("Policy", "Force PIN change", "PIN-token subcommands return errors until a successful PIN change.", "warning", "PIN change required", "forcePINChange");
  }
  return row("Policy", "Force PIN change", "PIN-token subcommands are not blocked by a required PIN change.", "informational", hasOwn(info, "forcePINChange") ? "not required" : "not required by default", "forcePINChange");
}

function maxPinLengthRow(options: Record<string, unknown>, value: unknown) {
  const amount = numberValue(value);
  if (amount !== undefined) {
    return row("Limits", "Maximum PIN length", "Maximum ClientPIN length enforced by the authenticator.", "informational", `${amount} code points`, "maxPINLength");
  }
  if (option(options, "clientPin") !== undefined) {
    return row("Limits", "Maximum PIN length", "Maximum ClientPIN length enforced by the authenticator.", "informational", "default 63 code points", "maxPINLength");
  }
  return row("Limits", "Maximum PIN length", "Maximum ClientPIN length enforced by the authenticator.", "unknown", "not reported", "maxPINLength");
}

function booleanFeatureRow(
  group: string,
  name: string,
  description: string,
  sourceObject: Record<string, unknown>,
  source: string,
  trueStatus: OverviewRowStatus,
  falseStatus: OverviewRowStatus,
  absentStatus: OverviewRowStatus,
) {
  if (!hasOwn(sourceObject, source)) return row(group, name, description, absentStatus, "absent", source);
  if (sourceObject[source] === true) return row(group, name, description, trueStatus, "true", source);
  if (sourceObject[source] === false) return row(group, name, description, falseStatus, "false", source);
  return row(group, name, description, "unknown", textValue(sourceObject[source], "not reported"), source);
}

function largeBlobsCommandRow(supported: boolean, capacity: number | undefined) {
  return row(
    "Storage",
    "Large Blobs command",
    "Support for the authenticatorLargeBlobs command via options.largeBlobs.",
    supported ? "supported" : "unsupported",
    supported ? capacityLabel(capacity) : "false or absent",
    "options.largeBlobs",
  );
}

function largeBlobKeyRow(hasLargeBlobKey: boolean, largeBlobsCommand: boolean, extensionsKnown: boolean) {
  if (hasLargeBlobKey && largeBlobsCommand) {
    return row("Storage", "Large Blob Key extension", "Per-credential key support for entries in the large-blob array.", "supported", "extension plus command support", "extensions.largeBlobKey + options.largeBlobs");
  }
  if (hasLargeBlobKey) {
    return row("Storage", "Large Blob Key extension", "CTAP requires both the largeBlobKey extension and options.largeBlobs=true.", "warning", "extension reported; command support missing", "extensions.largeBlobKey + options.largeBlobs");
  }
  return row("Storage", "Large Blob Key extension", "Per-credential key support for entries in the large-blob array.", extensionsKnown ? "unsupported" : "unknown", extensionsKnown ? "not listed" : "extensions not reported", "extensions.largeBlobKey");
}

function largeBlobCapacityRow(capacity: number | undefined, largeBlobsCommand: boolean) {
  if (!capacity) return row("Storage", "Serialized large-blob array limit", "Maximum serialized large-blob array size.", "unknown", "not reported", "maxSerializedLargeBlobArray");
  return row("Storage", "Serialized large-blob array limit", "Maximum serialized large-blob array size.", largeBlobsCommand ? "informational" : "warning", `${capacity} bytes`, "maxSerializedLargeBlobArray");
}

function largeBlobConflictRow(hasLargeBlobExtension: boolean, hasLargeBlobKey: boolean, largeBlobsCommand: boolean) {
  if (hasLargeBlobExtension && (hasLargeBlobKey || largeBlobsCommand)) {
    return row("Storage", "Large blob mode conflict", "CTAP says the largeBlob extension is mutually exclusive with the largeBlobKey/largeBlobs command path.", "warning", "mutually exclusive support reported", "extensions.largeBlob");
  }
  return null;
}

function extensionSupportRow(group: string, name: string, description: string, id: string, known: boolean, extensions: unknown[], source: string) {
  if (!known) return row(group, name, description, "unknown", "extensions not reported", source);
  return row(group, name, description, extensions.includes(id) ? "supported" : "unsupported", extensions.includes(id) ? id : "not listed", source);
}

function limitRow(group: string, name: string, description: string, value: unknown, source: string, unit = "") {
  const amount = numberValue(value);
  return row(group, name, description, amount !== undefined ? "informational" : "unknown", amount !== undefined ? `${amount}${unit ? ` ${unit}` : ""}` : "not reported", source);
}

function knownListStatus(known: boolean, value: unknown[]): OverviewRowStatus {
  if (!known) return "unknown";
  return value.length ? "informational" : "unknown";
}

function valueStatus(value: unknown): OverviewRowStatus {
  if (value === null || value === undefined || value === "") return "unknown";
  if (Array.isArray(value) && value.length === 0) return "unknown";
  return "informational";
}

function textValue(value: unknown, fallback: string) {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function compactSecretValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "not reported";
  const text = String(value);
  return `reported (${text.length} chars)`;
}

function capacityLabel(value: number | undefined) {
  return value ? `${value} bytes` : "capacity not reported";
}

function option(options: Record<string, unknown>, name: string): boolean | undefined {
  if (!Object.prototype.hasOwnProperty.call(options, name)) return undefined;
  return options[name] === true ? true : options[name] === false ? false : undefined;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function algorithmIdentifier(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return numberValue(item.alg) ?? numberValue(item.algorithm);
  }
  return undefined;
}

function algorithmType(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>;
    return typeof item.type === "string" && item.type ? item.type : "public-key";
  }
  return "";
}

function algorithmLabel(alg: number) {
  const entry = COSE_ALGORITHM_ROWS.find((item) => item.alg === alg);
  return entry ? `${entry.name} (${entry.alg})` : String(alg);
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function formatMap(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, entry]) => `${key}: ${entry}`)
    .join(", ");
}

function formatListItem(value: unknown) {
  if (typeof value === "number" || typeof value === "string") return value;
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? "unknown";
}
