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

export type OverviewConformanceWarning = {
  name: string;
  description: string;
  value: string;
  source: string;
};

export type OverviewSummaryFact = {
  label: string;
  value: string;
  status: OverviewRowStatus;
  help?: string;
};

export type OverviewSummaryCard = {
  title: string;
  description: string;
  status: OverviewRowStatus;
  statusLabel: string;
  facts: OverviewSummaryFact[];
};

type OverviewContext = {
  info?: Record<string, unknown> | null;
  device?: Record<string, unknown> | null;
  bioSensor?: Record<string, unknown> | null;
};

type CoseAlgorithmRule = {
  alg: number;
  name: string;
  description: string;
};

type CertificationRule = {
  id: string;
  name: string;
  description: string;
};

type ConfigCommandRule = {
  id: number;
  name: string;
};

const CTAP_2_3_VERSION = "FIDO_2_3";
const CTAP_VERSION_ORDER = [CTAP_2_3_VERSION, "FIDO_2_1", "FIDO_2_1_PRE", "FIDO_2_0"] as const;
const FORBIDDEN_VERSION_IDS = ["FIDO_2_2"];

const EXTENSION_ROWS = [
  ["credProtect", "Credential protection", "Lets an RP request a credential protection policy during credential creation."],
  ["credBlob", "Credential blob", "Small RP-provided opaque data stored directly with a credential."],
  ["largeBlobKey", "Large Blob Key", "Returns a per-credential key used by platforms with the serialized large-blob array."],
  ["largeBlob", "Large Blob", "Authenticator-managed per-credential large blob extension for makeCredential/getAssertion."],
  ["minPinLength", "Minimum PIN length", "Reports the current minimum ClientPIN length to authorized RPs during credential creation."],
  ["pinComplexityPolicy", "PIN complexity policy", "Reports whether an authorized RP is subject to the current PIN complexity policy."],
  ["hmac-secret", "HMAC secret", "Lets a platform derive credential-scoped symmetric secrets during assertion."],
  ["hmac-secret-mc", "HMAC secret at creation", "Applies hmac-secret behavior during credential creation; requires hmac-secret support."],
  ["thirdPartyPayment", "Third-party payment", "Marks credentials that may be used for third-party payment authentication."],
] as const;

const COSE_ALGORITHM_ROWS: CoseAlgorithmRule[] = [
  { alg: -8, name: "EdDSA", description: "EdDSA. WebAuthn/CTAP keys use OKP with crv 6 (Ed25519)." },
  { alg: -7, name: "ES256", description: "ECDSA with SHA-256. WebAuthn/CTAP keys use EC2 with crv 1 (P-256) and x/y coordinates." },
  { alg: -257, name: "RS256", description: "RSASSA-PKCS1-v1_5 with SHA-256. Widely supported by WebAuthn authenticators." },
];

const CERTIFICATION_ROWS: CertificationRule[] = [
  { id: "FIPS-CMVP-2", name: "FIPS 140-2 overall", description: "FIPS 140-2 CMVP overall certification level hint, reported as integer level 1 through 4." },
  { id: "FIPS-CMVP-3", name: "FIPS 140-3 overall", description: "FIPS 140-3 / ISO 19790 overall certification level hint, reported as integer level 1 through 4." },
  { id: "FIPS-CMVP-2-PHY", name: "FIPS 140-2 physical", description: "FIPS 140-2 CMVP physical certification level hint, reported as integer level 1 through 4." },
  { id: "FIPS-CMVP-3-PHY", name: "FIPS 140-3 physical", description: "FIPS 140-3 / ISO 19790 physical certification level hint, reported as integer level 1 through 4." },
  { id: "CC-EAL", name: "Common Criteria EAL", description: "Common Criteria Evaluation Assurance Level hint, reported as integer level 1 through 7 without intermediate plus levels." },
  { id: "FIDO", name: "FIDO certification", description: "FIDO Authenticator certification level hint, reported as integer level 1 through 6; plus levels are encoded as even numbers." },
  { id: "CCN-CPSTIC", name: "CCN CPSTIC listing", description: "Spanish CCN CPSTIC catalog listing hint, reported as integer level 1 when listed." },
];

const CONFIG_COMMANDS: ConfigCommandRule[] = [
  { id: 0x01, name: "enableEnterpriseAttestation" },
  { id: 0x02, name: "toggleAlwaysUv" },
  { id: 0x03, name: "setMinPINLength" },
  { id: 0x04, name: "enableLongTouchForReset" },
  { id: 0xff, name: "vendorPrototype" },
];

const CONFIG_COMMAND_ID = {
  enableEnterpriseAttestation: 0x01,
  toggleAlwaysUv: 0x02,
  setMinPINLength: 0x03,
  enableLongTouchForReset: 0x04,
  vendorPrototype: 0xff,
} as const;

const GROUP_ORDER = ["Identity", "Protocol", "Verification", "Storage", "Management", "Policy", "Extensions", "Limits", "Attestation"];

export function buildOverviewSummaryCards(context: OverviewContext = {}): OverviewSummaryCard[] {
  const info = objectValue(context.info);
  const options = objectValue(info.options);
  const versions = arrayValue(info.versions);
  const extensions = arrayValue(info.extensions);
  const certifications = objectValue(info.certifications);

  const versionsKnown = Array.isArray(info.versions);
  const extensionsKnown = Array.isArray(info.extensions);
  const certificationsKnown = hasOwn(info, "certifications");
  const ctapVersion = highestCtapVersion(versions);
  const u2fSupported = versionsKnown ? versions.includes("U2F_V2") : undefined;
  const hasLargeBlobKey = extensions.includes("largeBlobKey");
  const hasLargeBlobExtension = extensions.includes("largeBlob");
  const largeBlobsCommand = option(options, "largeBlobs") === true;
  const largeBlobCapacity = unsignedIntegerValue(info.maxSerializedLargeBlobArray);
  const remainingDiscoverableCredentials = unsignedIntegerValue(info.remainingDiscoverableCredentials);

  return [
    {
      title: "Protocol",
      description: "CTAP generation and key algorithm breadth.",
      status: ctapVersion ? "supported" : versionsKnown ? "unsupported" : "unknown",
      statusLabel: ctapVersion ? formatProtocolVersion(ctapVersion) : versionsKnown ? "CTAP absent" : "unknown",
      facts: [
        fact("CTAP", ctapVersion ? formatProtocolVersion(ctapVersion) : "not reported", ctapVersion ? "supported" : versionsKnown ? "unsupported" : "unknown"),
        fact("FIDO cert", fidoCertificationSummary(certificationsKnown, certifications), fidoCertificationStatus(certificationsKnown, certifications)),
        fact("U2F", supportValue(u2fSupported), booleanSupportStatus(u2fSupported)),
      ],
    },
    {
      title: "Verification",
      description: "PIN, built-in UV, and scoped token permissions.",
      status: verificationSummaryStatus(options),
      statusLabel: verificationSummaryLabel(options),
      facts: [
        fact("Client PIN", clientPinSummary(options), clientPinSummaryStatus(options)),
        fact("Built-in UV", uvSummary(options), uvSummaryStatus(options)),
        fact("Token permissions", optionSupportValue(option(options, "pinUvAuthToken")), optionSupportStatus(option(options, "pinUvAuthToken"))),
      ],
    },
    {
      title: "Passkeys",
      description: "Discoverable credentials and inventory support.",
      status: passkeySummaryStatus(options),
      statusLabel: passkeySummaryLabel(options),
      facts: [
        fact("Discoverable", optionSupportValue(option(options, "rk")), optionSupportStatus(option(options, "rk"))),
        fact("Credential Management", optionSupportValue(option(options, "credMgmt")), optionSupportStatus(option(options, "credMgmt"))),
        fact("Remaining", remainingDiscoverableCredentials !== undefined ? `${remainingDiscoverableCredentials} slots` : "not reported", remainingDiscoverableCredentials !== undefined ? "informational" : "unknown"),
      ],
    },
    {
      title: "Storage",
      description: "Large-blob and credential-blob storage paths.",
      status: storageSummaryStatus(extensionsKnown, extensions, largeBlobsCommand),
      statusLabel: storageSummaryLabel(extensionsKnown, extensions, largeBlobsCommand),
      facts: [
        fact("Large Blob", largeBlobSummary(hasLargeBlobKey, hasLargeBlobExtension, largeBlobsCommand, extensionsKnown), storageSummaryStatus(extensionsKnown, extensions, largeBlobsCommand), largeBlobSummaryHelp()),
        fact("credBlob", extensionsKnown ? supportValue(extensions.includes("credBlob")) : "not reported", extensionsKnown ? booleanSupportStatus(extensions.includes("credBlob")) : "unknown"),
        fact("Array limit", largeBlobCapacity !== undefined ? `${largeBlobCapacity} bytes` : "not reported", largeBlobCapacity !== undefined ? "informational" : "unknown"),
      ],
    },
    {
      title: "Administration",
      description: "Authenticator policy and maintenance controls.",
      status: administrationSummaryStatus(options),
      statusLabel: administrationSummaryLabel(options),
      facts: [
        fact("Auth config", optionSupportValue(option(options, "authnrCfg")), optionSupportStatus(option(options, "authnrCfg"))),
        fact("Always UV", featureStateValue(option(options, "alwaysUv")), featureStateStatus(option(options, "alwaysUv"))),
        fact("EA", enabledValue(option(options, "ep")), featureStateStatus(option(options, "ep"))),
      ],
    },
  ];
}

export function buildOverviewRows(context: OverviewContext = {}): OverviewRow[] {
  const info = objectValue(context.info);
  const device = objectValue(context.device);
  const bioSensor = objectValue(context.bioSensor);
  const options = objectValue(info.options);
  const versions = arrayValue(info.versions);
  const extensions = arrayValue(info.extensions);
  const transports = arrayValue(info.transports);
  const algorithms = arrayValue(info.algorithms);
  const attestationFormats = arrayValue(info.attestationFormats);
  const pinUvAuthProtocols = arrayValue(info.pinUvAuthProtocols);
  const certifications = objectValue(info.certifications);

  const getInfoReported = hasReportedGetInfo(info);
  const versionsKnown = Array.isArray(info.versions);
  const extensionsKnown = Array.isArray(info.extensions);
  const attestationFormatsKnown = Array.isArray(info.attestationFormats);
  const pinUvAuthProtocolsKnown = Array.isArray(info.pinUvAuthProtocols);
  const certificationsKnown = hasOwn(info, "certifications");

  const hasLargeBlobKey = extensions.includes("largeBlobKey");
  const hasLargeBlobExtension = extensions.includes("largeBlob");
  const largeBlobsCommand = option(options, "largeBlobs") === true;
  const largeBlobCapacity = unsignedIntegerValue(info.maxSerializedLargeBlobArray);

  return [
    aaguidRow(info, getInfoReported),
    row("Identity", "Device ID", "Workbench selector or transport identity for the selected authenticator.", valueStatus(device.deviceId), textValue(device.deviceId, "not reported"), "device.deviceId"),
    transportRow(info, device, transports),
    optionRow("Identity", "Platform attachment", "plat=true means the authenticator is attached to this client platform; absent defaults to false.", option(options, "plat"), "enabled", "disabled", "options.plat", "default false"),
    row("Identity", "Encrypted device identifier", "Encrypted 128-bit device identifier returned only when a persistent PIN/UV auth token is available.", valueStatus(info.encIdentifier), compactSecretValue(info.encIdentifier), "encIdentifier"),

    versionsRow(getInfoReported, versionsKnown, versions),
    versionRow("U2F", "Legacy CTAP1/U2F compatibility.", versionsKnown, versions, "U2F_V2"),
    versionRow("FIDO 2.0", "CTAP 2.0 support.", versionsKnown, versions, "FIDO_2_0"),
    versionRow("FIDO 2.1 Preview", "Prototype CTAP 2.1 feature set.", versionsKnown, versions, "FIDO_2_1_PRE"),
    versionRow("FIDO 2.1", "CTAP 2.1 support.", versionsKnown, versions, "FIDO_2_1"),
    versionRow("FIDO 2.3", "CTAP 2.3 support.", versionsKnown, versions, CTAP_2_3_VERSION),
    algorithmListRow(info, algorithms),
    ...coseAlgorithmRows(Array.isArray(info.algorithms), algorithms),

    upRow(options),
    optionRow("Verification", "Discoverable credentials", "rk=true means the authenticator can create discoverable credentials and answer without an allowList.", option(options, "rk"), "supported", "unsupported", "options.rk", "default false"),
    clientPinRow(options),
    uvRow(options),
    optionRow("Verification", "PIN/UV auth token permissions", "Supports permission-scoped PIN/UV auth tokens; PIN-derived tokens require clientPin=true, UV-derived tokens require uv=true.", option(options, "pinUvAuthToken"), "supported", "unsupported", "options.pinUvAuthToken", "default false"),
    noMcGaPermissionsRow(options),
    row("Verification", "PIN/UV auth protocols", "Supported PIN/UV auth protocol versions in decreasing authenticator preference; if present, the list must be non-empty and unique.", strictNonEmptyUniqueListStatus(pinUvAuthProtocolsKnown, pinUvAuthProtocols, protocolListItemKey), inlineList(pinUvAuthProtocols, "not reported"), "pinUvAuthProtocols"),
    triStateOptionRow("Verification", "Biometric enrollment", "bioEnroll reports authenticatorBioEnrollment support and whether at least one enrollment exists.", option(options, "bioEnroll"), "configured", "not configured", "unsupported", "options.bioEnroll"),
    triStateOptionRow("Verification", "Biometric enrollment Preview", "FIDO_2_1_PRE prototype bio-enrollment command support and current enrollment state.", option(options, "userVerificationMgmtPreview"), "configured", "not configured", "unsupported", "options.userVerificationMgmtPreview"),
    optionRow("Verification", "UV biometric enrollment permission", "uvBioEnroll=true means UV-derived tokens can request the bio-enrollment permission; the option may only appear with bioEnroll.", option(options, "uvBioEnroll"), "supported", "unsupported", "options.uvBioEnroll", "default false"),
    row("Verification", "Biometric modality", "Bio sensor modality reported by the optional sensor query.", valueStatus(bioSensor.modality), textValue(bioSensor.modality, "not reported"), "bioSensor.modality"),
    uintLimitRow("Verification", "UV modality bit flags", "Built-in UV modality hint used by platforms for user prompts; ClientPIN must not be included.", info, "uvModality"),
    uintLimitRow("Verification", "Preferred platform UV attempts", "Preferred number of built-in UV token attempts before falling back to PIN or showing an error; must be greater than zero when present.", info, "preferredPlatformUvAttempts", "", 1),
    uintLimitRow("Verification", "UV count since last PIN entry", "Internal UV attempts since the last successful PIN entry, including failed attempts.", info, "uvCountSinceLastPinEntry"),

    largeBlobsCommandRow(largeBlobsCommand, largeBlobCapacity),
    largeBlobKeyRow(hasLargeBlobKey, largeBlobsCommand, extensionsKnown),
    extensionSupportRow("Storage", "Large Blob extension", "Authenticator-managed largeBlob extension; mutually exclusive with the largeBlobKey/options.largeBlobs command path.", "largeBlob", extensionsKnown, extensions, "extensions.largeBlob"),
    largeBlobCapacityRow(info, largeBlobsCommand),
    largeBlobConflictRow(hasLargeBlobExtension, hasLargeBlobKey, largeBlobsCommand),
    extensionSupportRow("Storage", "Credential blob extension", "Small opaque per-credential data stored directly with a credential; maxCredBlobLength must accompany support.", "credBlob", extensionsKnown, extensions, "extensions.credBlob"),
    row("Storage", "Encrypted credential store state", "Encrypted 128-bit credential-store state returned only when a persistent PIN/UV auth token is available.", valueStatus(info.encCredStoreState), compactSecretValue(info.encCredStoreState), "encCredStoreState"),

    optionRow("Management", "Credential management", "authenticatorCredentialManagement command support.", option(options, "credMgmt"), "supported", "unsupported", "options.credMgmt", "default false"),
    optionRow("Management", "Credential management preview", "FIDO_2_1_PRE prototype credential management command support.", option(options, "credentialMgmtPreview"), "supported", "unsupported", "options.credentialMgmtPreview", "default false"),
    optionRow("Management", "Credential management read-only", "perCredMgmtRO=true means PIN/UV tokens can request the read-only credential-management permission.", option(options, "perCredMgmtRO"), "supported", "unsupported", "options.perCredMgmtRO", "default false"),
    optionRow("Management", "Authenticator config", "authenticatorConfig command support.", option(options, "authnrCfg"), "supported", "unsupported", "options.authnrCfg", "default false"),
    optionRow("Management", "UV authenticator config permission", "uvAcfg=true means UV-derived tokens can request the authenticatorConfig permission; the option may only appear with authnrCfg.", option(options, "uvAcfg"), "supported", "unsupported", "options.uvAcfg", "default false"),
    configCommandListRow(info),
    vendorConfigCommandListRow(info),
    booleanFeatureRow("Management", "Long touch for reset", "Reports support and state for requiring a reset touch of at least five seconds.", info, "longTouchForReset", "enabled", "disabled", "unsupported"),
    resetTransportsRow(info),

    triStateOptionRow("Policy", "Enterprise attestation", "ep reports enterprise attestation capability and whether it is currently enabled.", option(options, "ep"), "enabled", "disabled", "unsupported", "options.ep"),
    triStateOptionRow("Policy", "Always require UV", "alwaysUv reports Always Require User Verification support and whether it is currently enabled.", option(options, "alwaysUv"), "enabled", "disabled", "unsupported", "options.alwaysUv"),
    optionRow("Policy", "Set minimum PIN length", "Supports the setMinPINLength subcommand; this option may only appear with ClientPIN or authenticator PIN entry via built-in UV.", option(options, "setMinPINLength"), "supported", "unsupported", "options.setMinPINLength", "default false"),
    makeCredUvRow(options),
    forcePinChangeRow(info),
    booleanFeatureRow("Policy", "PIN complexity policy", "Reports support and state for an additional current PIN complexity policy beyond minPINLength.", info, "pinComplexityPolicy", "enabled", "disabled", "unsupported"),
    row("Policy", "PIN complexity policy URL", "URL the platform may show for more information about the enforced PIN policy.", valueStatus(info.pinComplexityPolicyURL), textValue(info.pinComplexityPolicyURL, "not reported"), "pinComplexityPolicyURL"),
    maxRpidsForSetMinPinLengthRow(info, options),

    ...EXTENSION_ROWS.map(([id, name, description]) => extensionSupportRow("Extensions", name, description, id, extensionsKnown, extensions, `extensions.${id}`)),

    maxMsgSizeRow(info),
    uintLimitRow("Limits", "Max credential list count", "Maximum number of credential IDs accepted in one request list; must be greater than zero when present.", info, "maxCredentialCountInList", "", 1),
    maxCredentialIdLengthRow(info),
    maxCredBlobLengthRow(info, extensionsKnown, extensions),
    minPinLengthRow(options, info),
    maxPinLengthRow(options, info),
    uintLimitRow("Limits", "Remaining discoverable credentials", "Estimated remaining discoverable credential capacity using maximally sized future credentials.", info, "remainingDiscoverableCredentials"),

    attestationFormatsRow(attestationFormatsKnown, attestationFormats),
    ...certificationRows(certificationsKnown, certifications),
    uintLimitRow("Attestation", "Firmware version", "Firmware version for the authenticator model identified by AAGUID; authenticators must increase it on firmware changes.", info, "firmwareVersion"),
  ].filter(Boolean) as OverviewRow[];
}

export function buildOverviewConformanceWarnings(context: OverviewContext = {}): OverviewConformanceWarning[] {
  const info = objectValue(context.info);
  const options = objectValue(info.options);
  const versions = arrayValue(info.versions);
  const extensions = arrayValue(info.extensions);
  const pinUvAuthProtocols = arrayValue(info.pinUvAuthProtocols);

  return conformanceWarnings(
    info,
    options,
    Array.isArray(info.versions),
    versions,
    Array.isArray(info.extensions),
    extensions,
    Array.isArray(info.pinUvAuthProtocols),
    pinUvAuthProtocols,
  );
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
  const warnings = rows.filter((row) => row.status === "warning").length;
  if (warnings) return `${warnings} warning${warnings === 1 ? "" : "s"}`;
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

function fact(label: string, value: string, status: OverviewRowStatus, help?: string): OverviewSummaryFact {
  return { label, value, status, help };
}

function row(group: string, name: string, description: string, status: OverviewRowStatus, value?: string, source?: string): OverviewRow {
  return { group, name, description, status, value, source };
}

function highestCtapVersion(versions: unknown[]) {
  return CTAP_VERSION_ORDER.find((version) => versions.includes(version)) || "";
}

function formatProtocolVersion(version: string) {
  return version.replace(/^FIDO_/, "FIDO ").replaceAll("_", ".");
}

function fidoCertificationSummary(known: boolean, certifications: Record<string, unknown>) {
  if (!known) return "not reported";
  if (!hasOwn(certifications, "FIDO")) return "not listed";
  return formatCertificationValue("FIDO", certifications.FIDO);
}

function fidoCertificationStatus(known: boolean, certifications: Record<string, unknown>): OverviewRowStatus {
  if (!known) return "unknown";
  if (!hasOwn(certifications, "FIDO")) return "unsupported";
  const level = unsignedIntegerValue(certifications.FIDO);
  return level !== undefined && level >= 1 && level <= 6 ? "informational" : "warning";
}

function supportValue(value: boolean | undefined) {
  if (value === true) return "supported";
  if (value === false) return "unsupported";
  return "not reported";
}

function optionSupportValue(value: boolean | undefined) {
  if (value === true) return "supported";
  if (value === false) return "unsupported";
  return "unsupported (default)";
}

function optionSupportStatus(value: boolean | undefined): OverviewRowStatus {
  return value === true ? "supported" : "unsupported";
}

function featureStateValue(value: boolean | undefined) {
  if (value === true) return "enabled";
  if (value === false) return "disabled";
  return "unsupported";
}

function featureStateStatus(value: boolean | undefined): OverviewRowStatus {
  if (value === true) return "enabled";
  if (value === false) return "disabled";
  return "unsupported";
}

function enabledValue(value: boolean | undefined) {
  if (value === true) return "enabled";
  if (value === false) return "disabled";
  return "not reported";
}

function booleanSupportStatus(value: boolean | undefined): OverviewRowStatus {
  if (value === true) return "supported";
  if (value === false) return "unsupported";
  return "unknown";
}

function clientPinSummary(options: Record<string, unknown>) {
  const value = option(options, "clientPin");
  if (value === true) return "PIN set";
  if (value === false) return "PIN not set";
  return "not reported";
}

function clientPinSummaryStatus(options: Record<string, unknown>): OverviewRowStatus {
  const value = option(options, "clientPin");
  if (value === true) return "configured";
  if (value === false) return "not configured";
  return "unknown";
}

function uvSummary(options: Record<string, unknown>) {
  const value = option(options, "uv");
  if (value === true) return "configured";
  if (value === false) return "not configured";
  return "not reported";
}

function uvSummaryStatus(options: Record<string, unknown>): OverviewRowStatus {
  const value = option(options, "uv");
  if (value === true) return "configured";
  if (value === false) return "not configured";
  return "unknown";
}

function verificationSummaryStatus(options: Record<string, unknown>): OverviewRowStatus {
  if (option(options, "clientPin") === true || option(options, "uv") === true) return "configured";
  if (option(options, "clientPin") === false || option(options, "uv") === false || option(options, "pinUvAuthToken") === true) return "supported";
  return "unknown";
}

function verificationSummaryLabel(options: Record<string, unknown>) {
  const status = verificationSummaryStatus(options);
  if (status === "configured") return "configured";
  if (status === "supported") return "available";
  return "unknown";
}

function passkeySummaryStatus(options: Record<string, unknown>): OverviewRowStatus {
  if (option(options, "rk") === true || option(options, "credMgmt") === true) return "supported";
  if (option(options, "rk") === false || option(options, "credMgmt") === false || hasOwn(options, "rk") || hasOwn(options, "credMgmt")) return "unsupported";
  return "unknown";
}

function passkeySummaryLabel(options: Record<string, unknown>) {
  const status = passkeySummaryStatus(options);
  if (status === "supported") return "available";
  if (status === "unsupported") return "limited";
  return "unknown";
}

function storageSummaryStatus(extensionsKnown: boolean, extensions: unknown[], largeBlobsCommand: boolean): OverviewRowStatus {
  if (largeBlobsCommand || extensions.includes("largeBlobKey") || extensions.includes("largeBlob") || extensions.includes("credBlob")) return "supported";
  return extensionsKnown ? "unsupported" : "unknown";
}

function storageSummaryLabel(extensionsKnown: boolean, extensions: unknown[], largeBlobsCommand: boolean) {
  const status = storageSummaryStatus(extensionsKnown, extensions, largeBlobsCommand);
  if (status === "supported") return "available";
  if (status === "unsupported") return "none listed";
  return "unknown";
}

function largeBlobSummary(hasLargeBlobKey: boolean, hasLargeBlobExtension: boolean, largeBlobsCommand: boolean, extensionsKnown: boolean) {
  if (largeBlobsCommand || hasLargeBlobKey) return "command";
  if (hasLargeBlobExtension) return "extension";
  return extensionsKnown ? "not listed" : "not reported";
}

function largeBlobSummaryHelp() {
  return "Command means the CTAP authenticatorLargeBlobs command path: the platform manages a serialized large-blob array and uses largeBlobKey per credential. Extension means the legacy largeBlob extension path used during makeCredential/getAssertion. CTAP treats the command path and extension path as separate, mutually exclusive storage models.";
}

function administrationSummaryStatus(options: Record<string, unknown>): OverviewRowStatus {
  if (option(options, "authnrCfg") === true || option(options, "alwaysUv") === true || option(options, "ep") === true) return "supported";
  if (option(options, "authnrCfg") === false || option(options, "alwaysUv") === false || option(options, "ep") === false) return "disabled";
  return "unknown";
}

function administrationSummaryLabel(options: Record<string, unknown>) {
  const status = administrationSummaryStatus(options);
  if (status === "supported") return "available";
  if (status === "disabled") return "limited";
  return "unknown";
}

function aaguidRow(info: Record<string, unknown>, getInfoReported: boolean) {
  const value = info.aaguid;
  if (value === null || value === undefined || value === "") {
    return row("Identity", "AAGUID", "Authenticator model identifier; required in authenticatorGetInfo and exactly 16 bytes when present.", getInfoReported ? "warning" : "unknown", "not reported", "aaguid");
  }
  const length = byteLength(value);
  if (length !== undefined && length !== 16) {
    return row("Identity", "AAGUID", "Authenticator model identifier; required in authenticatorGetInfo and exactly 16 bytes when present.", "warning", `${formatAaguid(value)} (${length} bytes; expected 16)`, "aaguid");
  }
  return row("Identity", "AAGUID", "Authenticator model identifier; identical values identify the same authenticator model.", "informational", formatAaguid(value), "aaguid");
}

function transportRow(info: Record<string, unknown>, device: Record<string, unknown>, transports: unknown[]) {
  if (Array.isArray(info.transports)) {
    return row("Identity", "Transport", "AuthenticatorTransport values reported by getInfo; if present, the list must be non-empty and unique.", strictNonEmptyUniqueListStatus(true, transports), inlineList(transports, "empty list"), "transports");
  }
  return row("Identity", "Transport", "AuthenticatorTransport values reported by getInfo, falling back to discovery metadata.", valueStatus(device.transport), textValue(device.transport, "not reported"), "transports");
}

function versionsRow(getInfoReported: boolean, versionsKnown: boolean, versions: unknown[]) {
  const description = "Protocol version strings from getInfo; CTAP 2.3 defines FIDO_2_3 and explicitly does not define FIDO_2_2.";
  if (!versionsKnown) return row("Protocol", "Reported versions", description, getInfoReported ? "warning" : "unknown", "not reported", "versions");
  if (!versions.length) return row("Protocol", "Reported versions", description, "warning", "empty list", "versions");
  if (versions.some((version) => FORBIDDEN_VERSION_IDS.includes(String(version)))) return row("Protocol", "Reported versions", description, "warning", inlineList(versions), "versions");
  return row("Protocol", "Reported versions", description, "informational", inlineList(versions), "versions");
}

function versionRow(name: string, description: string, versionsKnown: boolean, versions: unknown[], version: string) {
  return row("Protocol", name, description, versionsKnown ? versions.includes(version) ? "supported" : "unsupported" : "unknown", formatProtocolVersion(version), `versions.${version}`);
}

function algorithmListRow(info: Record<string, unknown>, algorithms: unknown[]) {
  const known = Array.isArray(info.algorithms);
  const description = "Credential-generation algorithms, ordered from most preferred to least preferred when reported; if present, the list must be non-empty and contain no duplicate entries.";
  if (!known) return row("Protocol", "Reported COSE algorithms", description, "unknown", "not reported", "algorithms");
  if (!algorithms.length) return row("Protocol", "Reported COSE algorithms", description, "warning", "empty list", "algorithms");
  if (hasDuplicateListItems(algorithms, algorithmListItemKey)) return row("Protocol", "Reported COSE algorithms", description, "warning", inlineList(algorithms.map(formatAlgorithm)), "algorithms");
  return row("Protocol", "Reported COSE algorithms", description, "informational", inlineList(algorithms.map(formatAlgorithm)), "algorithms");
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
  if (value === false) return row("Verification", "User presence / touch", "up=false means the authenticator cannot test user presence; absent defaults to true.", "unsupported", "false", "options.up");
  return row("Verification", "User presence / touch", "up=true or absent means the authenticator can test user presence.", "supported", value === true ? "true" : "default true", "options.up");
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
  if (value === true) return row("Verification", "Client PIN", "The authenticator accepts a client-provided PIN and a PIN is currently set.", "configured", "PIN set", "options.clientPin");
  if (value === false) return row("Verification", "Client PIN", "The authenticator accepts a client-provided PIN, but no PIN is set yet.", "not configured", "PIN not set", "options.clientPin");
  return row("Verification", "Client PIN", "No ClientPIN capability was reported; ClientPIN is not built-in user verification.", "unsupported", "absent", "options.clientPin");
}

function uvRow(options: Record<string, unknown>) {
  const value = option(options, "uv");
  if (value === true) return row("Verification", "Built-in user verification", "Built-in user verification is supported and presently configured.", "configured", "configured", "options.uv");
  if (value === false) return row("Verification", "Built-in user verification", "Built-in user verification is supported but not presently configured.", "not configured", "not configured", "options.uv");
  return row("Verification", "Built-in user verification", "No built-in user verification capability was reported. A device that only supports ClientPIN must not report uv.", "unsupported", "absent", "options.uv");
}

function makeCredUvRow(options: Record<string, unknown>) {
  const value = option(options, "makeCredUvNotRqd");
  if (value === true) {
    return row("Policy", "Non-discoverable credential UV requirement", "Allows non-discoverable credential creation without user verification when the platform requests it.", "informational", "UV may be skipped", "options.makeCredUvNotRqd");
  }
  return row("Policy", "Non-discoverable credential UV requirement", "Requires some form of user verification for non-discoverable credential creation.", "informational", value === false ? "UV required" : "UV required by default", "options.makeCredUvNotRqd");
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

function certificationRows(known: boolean, certifications: Record<string, unknown>) {
  const knownIds = CERTIFICATION_ROWS.map(({ id }) => id);
  const extra = Object.keys(certifications).filter((id) => !knownIds.includes(id));

  return [
    ...CERTIFICATION_ROWS.map((entry) => certificationRow(entry, known, certifications)),
    extra.length
      ? row("Attestation", "Other certification hints", "Certification hints not defined in the CTAP 2.3 certification table.", "informational", formatMap(Object.fromEntries(extra.map((id) => [id, certifications[id]]))), "certifications")
      : null,
  ];
}

function certificationRow(entry: CertificationRule, known: boolean, certifications: Record<string, unknown>) {
  if (!known) {
    return row("Attestation", entry.name, entry.description, "unknown", "certifications not reported", `certifications.${entry.id}`);
  }
  if (!hasOwn(certifications, entry.id)) {
    return row("Attestation", entry.name, entry.description, "unsupported", "not listed", `certifications.${entry.id}`);
  }

  const value = certifications[entry.id];
  const level = unsignedIntegerValue(value);
  const range = certificationRange(entry.id);
  if (level === undefined || !range || level < range[0] || level > range[1]) {
    return row("Attestation", entry.name, entry.description, "warning", `${formatCertificationValue(entry.id, value)}; expected ${certificationRangeLabel(entry.id)}`, `certifications.${entry.id}`);
  }
  return row("Attestation", entry.name, entry.description, "informational", formatCertificationValue(entry.id, level), `certifications.${entry.id}`);
}

function formatCertificationValue(id: string, value: unknown) {
  const level = unsignedIntegerValue(value);
  if (id === "FIDO" && level !== undefined && level >= 1 && level <= 6) {
    const baseLevel = Math.ceil(level / 2);
    return `FIDO L${baseLevel}${level % 2 === 0 ? "+" : ""}`;
  }
  return `level ${formatListItem(value)}`;
}

function certificationRange(id: string): [number, number] | null {
  if (id === "FIPS-CMVP-2" || id === "FIPS-CMVP-3" || id === "FIPS-CMVP-2-PHY" || id === "FIPS-CMVP-3-PHY") return [1, 4];
  if (id === "CC-EAL") return [1, 7];
  if (id === "FIDO") return [1, 6];
  if (id === "CCN-CPSTIC") return [1, 1];
  return null;
}

function certificationRangeLabel(id: string) {
  const range = certificationRange(id);
  if (!range) return "an integer value";
  return range[0] === range[1] ? `integer ${range[0]}` : `integer ${range[0]}-${range[1]}`;
}

function noMcGaPermissionsRow(options: Record<string, unknown>) {
  const value = option(options, "noMcGaPermissionsWithClientPin");
  if (value === true) {
    return row("Verification", "Client PIN token MC/GA permissions", "PIN-derived tokens lack makeCredential/getAssertion permissions; platforms should not fall back to ClientPIN for those permissions.", "warning", "not available through ClientPIN token", "options.noMcGaPermissionsWithClientPin");
  }
  return row("Verification", "Client PIN token MC/GA permissions", "PIN-derived tokens may be used for makeCredential/getAssertion permissions.", "informational", value === false ? "available" : "available by default", "options.noMcGaPermissionsWithClientPin");
}

function forcePinChangeRow(info: Record<string, unknown>) {
  if (info.forcePINChange === true) {
    return row("Policy", "Force PIN change", "PIN token subcommands return errors until the PIN is changed successfully.", "warning", "PIN change required", "forcePINChange");
  }
  if (hasOwn(info, "forcePINChange") && info.forcePINChange !== false) {
    return row("Policy", "Force PIN change", "PIN token subcommands return errors until the PIN is changed successfully when this field is true.", "warning", `invalid value: ${formatListItem(info.forcePINChange)}`, "forcePINChange");
  }
  return row("Policy", "Force PIN change", "PIN token subcommands are not blocked by a required PIN change.", "informational", hasOwn(info, "forcePINChange") ? "not required" : "not required by default", "forcePINChange");
}

function maxPinLengthRow(options: Record<string, unknown>, info: Record<string, unknown>) {
  const clientPinSupported = option(options, "clientPin") !== undefined;
  const value = info.maxPINLength;
  if (!hasOwn(info, "maxPINLength")) {
    if (clientPinSupported) {
      return row("Limits", "Maximum PIN length", "Maximum ClientPIN length defaults to 63 Unicode code points when ClientPIN is supported and this field is absent.", "informational", "default 63 code points", "maxPINLength");
    }
    return row("Limits", "Maximum PIN length", "Maximum ClientPIN length is only applicable when ClientPIN is supported.", "unknown", "not reported", "maxPINLength");
  }

  const amount = unsignedIntegerValue(value);
  if (amount === undefined) {
    return row("Limits", "Maximum PIN length", "Maximum ClientPIN length in Unicode code points; encoded PIN input must still fit within 63 bytes.", "warning", `invalid value: ${formatListItem(value)}`, "maxPINLength");
  }
  if (!clientPinSupported) {
    return row("Limits", "Maximum PIN length", "maxPINLength must be absent when ClientPIN is not supported.", "warning", `${amount} code points; ClientPIN not reported`, "maxPINLength");
  }
  if (amount < 8) {
    return row("Limits", "Maximum PIN length", "When specified, maxPINLength must be at least 8 Unicode code points.", "warning", `${amount} code points; below CTAP minimum 8`, "maxPINLength");
  }
  return row("Limits", "Maximum PIN length", "Maximum ClientPIN length in Unicode code points; encoded PIN input must still fit within 63 bytes.", "informational", `${amount} code points`, "maxPINLength");
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
  return row(group, name, description, "warning", `invalid value: ${formatListItem(sourceObject[source])}`, source);
}

function largeBlobsCommandRow(supported: boolean, capacity: number | undefined) {
  return row(
    "Storage",
    "Large Blobs command",
    "options.largeBlobs=true means the authenticatorLargeBlobs command is supported and the largeBlob extension path must not be used.",
    supported ? "supported" : "unsupported",
    supported ? capacityLabel(capacity) : "false or absent",
    "options.largeBlobs",
  );
}

function largeBlobKeyRow(hasLargeBlobKey: boolean, largeBlobsCommand: boolean, extensionsKnown: boolean) {
  if (hasLargeBlobKey && largeBlobsCommand) {
    return row("Storage", "Large Blob Key extension", "Per-credential key support for entries in the serialized large-blob array.", "supported", "extension plus command support", "extensions.largeBlobKey + options.largeBlobs");
  }
  if (hasLargeBlobKey) {
    return row("Storage", "Large Blob Key extension", "largeBlobKey feature detection requires both the extension ID and options.largeBlobs=true.", "warning", "extension reported; command support missing", "extensions.largeBlobKey + options.largeBlobs");
  }
  return row("Storage", "Large Blob Key extension", "Per-credential key support for entries in the serialized large-blob array.", extensionsKnown ? "unsupported" : "unknown", extensionsKnown ? "not listed" : "extensions not reported", "extensions.largeBlobKey");
}

function largeBlobCapacityRow(info: Record<string, unknown>, largeBlobsCommand: boolean) {
  const source = "maxSerializedLargeBlobArray";
  const description = "Maximum serialized large-blob array size; required when authenticatorLargeBlobs is supported and otherwise must be absent.";
  if (!hasOwn(info, source)) {
    return row("Storage", "Serialized large-blob array limit", description, largeBlobsCommand ? "warning" : "unknown", largeBlobsCommand ? "missing; required with largeBlobs" : "not reported", source);
  }
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Storage", "Serialized large-blob array limit", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  if (amount < 1024) return row("Storage", "Serialized large-blob array limit", description, "warning", `${amount} bytes; below CTAP minimum 1024`, source);
  return row("Storage", "Serialized large-blob array limit", description, largeBlobsCommand ? "informational" : "warning", largeBlobsCommand ? `${amount} bytes` : `${amount} bytes; largeBlobs not supported`, source);
}

function largeBlobConflictRow(hasLargeBlobExtension: boolean, hasLargeBlobKey: boolean, largeBlobsCommand: boolean) {
  if (hasLargeBlobExtension && (hasLargeBlobKey || largeBlobsCommand)) {
    return row("Storage", "Large blob mode conflict", "CTAP says the largeBlob extension is mutually exclusive with the largeBlobKey/largeBlobs command path.", "warning", "mutually exclusive support reported", "extensions.largeBlob + extensions.largeBlobKey/options.largeBlobs");
  }
  return null;
}

function extensionSupportRow(group: string, name: string, description: string, id: string, known: boolean, extensions: unknown[], source: string) {
  if (!known) return row(group, name, description, "unknown", "extensions not reported", source);
  return row(group, name, description, extensions.includes(id) ? "supported" : "unsupported", extensions.includes(id) ? id : "not listed", source);
}

function configCommandListRow(info: Record<string, unknown>) {
  const commands = arrayValue(info.authenticatorConfigCommands);
  const known = Array.isArray(info.authenticatorConfigCommands);
  const description = "Supported authenticatorConfig subcommand identifiers; an empty reported list is allowed.";
  if (!known) return row("Management", "Authenticator config commands", description, "unknown", "not reported", "authenticatorConfigCommands");
  if (hasDuplicateListItems(commands, protocolListItemKey)) return row("Management", "Authenticator config commands", description, "warning", inlineList(commands.map(formatConfigCommand)), "authenticatorConfigCommands");
  if (commands.some((command) => unsignedIntegerValue(command) === undefined)) return row("Management", "Authenticator config commands", description, "warning", inlineList(commands.map(formatConfigCommand)), "authenticatorConfigCommands");
  return row("Management", "Authenticator config commands", description, "informational", commands.length ? inlineList(commands.map(formatConfigCommand)) : "empty list", "authenticatorConfigCommands");
}

function vendorConfigCommandListRow(info: Record<string, unknown>) {
  const commands = arrayValue(info.vendorPrototypeConfigCommands);
  const known = Array.isArray(info.vendorPrototypeConfigCommands);
  const description = "Supported vendorPrototype authenticatorConfig command identifiers; an empty reported list is allowed.";
  if (!known) return row("Management", "Vendor prototype config commands", description, "unknown", "not reported", "vendorPrototypeConfigCommands");
  if (hasDuplicateListItems(commands, protocolListItemKey)) return row("Management", "Vendor prototype config commands", description, "warning", inlineList(commands.map(formatIntegerHex)), "vendorPrototypeConfigCommands");
  if (commands.some((command) => unsignedIntegerValue(command) === undefined)) return row("Management", "Vendor prototype config commands", description, "warning", inlineList(commands.map(formatIntegerHex)), "vendorPrototypeConfigCommands");
  return row("Management", "Vendor prototype config commands", description, "informational", commands.length ? inlineList(commands.map(formatIntegerHex)) : "empty list", "vendorPrototypeConfigCommands");
}

function resetTransportsRow(info: Record<string, unknown>) {
  const transports = arrayValue(info.transportsForReset);
  const known = Array.isArray(info.transportsForReset);
  const description = "AuthenticatorTransport values over which authenticatorReset is supported; if present, the list must be non-empty and unique.";
  if (!known) return row("Management", "Reset transports", description, "unknown", "not reported", "transportsForReset");
  return row("Management", "Reset transports", description, strictNonEmptyUniqueListStatus(true, transports), inlineList(transports, "empty list"), "transportsForReset");
}

function maxRpidsForSetMinPinLengthRow(info: Record<string, unknown>, options: Record<string, unknown>) {
  const source = "maxRPIDsForSetMinPINLength";
  const description = "Maximum extra RP IDs accepted by setMinPINLength for minPinLength and PIN complexity visibility; must be present iff setMinPINLength is supported.";
  if (!hasOwn(info, source)) {
    return row("Policy", "RP IDs for minimum PIN length", description, option(options, "setMinPINLength") === true ? "warning" : "unknown", option(options, "setMinPINLength") === true ? "missing; required with setMinPINLength" : "not reported", source);
  }
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Policy", "RP IDs for minimum PIN length", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  return row("Policy", "RP IDs for minimum PIN length", description, option(options, "setMinPINLength") === true ? "informational" : "warning", option(options, "setMinPINLength") === true ? String(amount) : `${amount}; setMinPINLength not supported`, source);
}

function maxMsgSizeRow(info: Record<string, unknown>) {
  const source = "maxMsgSize";
  const description = "Maximum CTAP message size the authenticator supports; absent defaults to 1024 bytes.";
  if (!hasOwn(info, source)) return row("Limits", "Max message size", description, "informational", "default 1024 bytes", source);
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Limits", "Max message size", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  if (amount < 1024) return row("Limits", "Max message size", description, "warning", `${amount} bytes; below CTAP minimum 1024`, source);
  return row("Limits", "Max message size", description, "informational", `${amount} bytes`, source);
}

function maxCredentialIdLengthRow(info: Record<string, unknown>) {
  const source = "maxCredentialIDLength";
  const description = "Maximum Credential ID length supported by the authenticator; must be greater than zero when present.";
  if (!hasOwn(info, source)) return row("Limits", "Max credential ID length", description, "unknown", "not reported", source);
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Limits", "Max credential ID length", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  if (amount === 0) return row("Limits", "Max credential ID length", description, "warning", "0 bytes; must be greater than zero", source);
  return row("Limits", "Max credential ID length", description, "informational", `${amount} bytes`, source);
}

function maxCredBlobLengthRow(info: Record<string, unknown>, extensionsKnown: boolean, extensions: unknown[]) {
  const source = "maxCredBlobLength";
  const credBlobSupported = extensions.includes("credBlob");
  const description = "Maximum credBlob payload size; must be present iff credBlob is supported and at least 32 bytes when present.";
  if (!hasOwn(info, source)) {
    return row("Limits", "Max credBlob length", description, credBlobSupported ? "warning" : "unknown", credBlobSupported ? "missing; required with credBlob" : "not reported", source);
  }
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Limits", "Max credBlob length", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  if (amount < 32) return row("Limits", "Max credBlob length", description, "warning", `${amount} bytes; below CTAP minimum 32`, source);
  if (extensionsKnown && !credBlobSupported) return row("Limits", "Max credBlob length", description, "warning", `${amount} bytes; credBlob not listed`, source);
  return row("Limits", "Max credBlob length", description, "informational", `${amount} bytes`, source);
}

function minPinLengthRow(options: Record<string, unknown>, info: Record<string, unknown>) {
  const source = "minPINLength";
  const clientPinSupported = option(options, "clientPin") !== undefined;
  const description = "Current minimum ClientPIN length in Unicode code points; required when ClientPIN is supported and otherwise must be absent.";
  if (!hasOwn(info, source)) {
    return row("Limits", "Minimum PIN length", description, clientPinSupported ? "warning" : "unknown", clientPinSupported ? "missing; required with ClientPIN" : "not reported", source);
  }
  const amount = unsignedIntegerValue(info[source]);
  if (amount === undefined) return row("Limits", "Minimum PIN length", description, "warning", `invalid value: ${formatListItem(info[source])}`, source);
  if (!clientPinSupported) return row("Limits", "Minimum PIN length", description, "warning", `${amount} code points; ClientPIN not reported`, source);
  if (amount < 4) return row("Limits", "Minimum PIN length", description, "warning", `${amount} code points; below CTAP minimum 4`, source);
  return row("Limits", "Minimum PIN length", description, "informational", `${amount} code points`, source);
}

function uintLimitRow(group: string, name: string, description: string, sourceObject: Record<string, unknown>, source: string, unit = "", min = 0) {
  if (!hasOwn(sourceObject, source)) return row(group, name, description, "unknown", "not reported", source);
  const amount = unsignedIntegerValue(sourceObject[source]);
  if (amount === undefined) return row(group, name, description, "warning", `invalid value: ${formatListItem(sourceObject[source])}`, source);
  if (amount < min) return row(group, name, description, "warning", `${formatNumberWithUnit(amount, unit)}; below CTAP minimum ${formatNumberWithUnit(min, unit)}`, source);
  return row(group, name, description, "informational", formatNumberWithUnit(amount, unit), source);
}

function attestationFormatsRow(known: boolean, attestationFormats: unknown[]) {
  const description = "Supported attestation statement formats; support for none is implied and the string 'none' must be omitted.";
  if (!known) return row("Attestation", "Attestation formats", description, "informational", "none implied; no formats reported", "attestationFormats");
  if (!attestationFormats.length) return row("Attestation", "Attestation formats", description, "warning", "empty list", "attestationFormats");
  if (attestationFormats.includes("none")) return row("Attestation", "Attestation formats", description, "warning", inlineList(attestationFormats), "attestationFormats");
  if (hasDuplicateListItems(attestationFormats)) return row("Attestation", "Attestation formats", description, "warning", inlineList(attestationFormats), "attestationFormats");
  return row("Attestation", "Attestation formats", description, "informational", inlineList(attestationFormats), "attestationFormats");
}

function conformanceWarnings(
  info: Record<string, unknown>,
  options: Record<string, unknown>,
  versionsKnown: boolean,
  versions: unknown[],
  extensionsKnown: boolean,
  extensions: unknown[],
  pinUvAuthProtocolsKnown: boolean,
  pinUvAuthProtocols: unknown[],
) {
  const warnings: OverviewConformanceWarning[] = [];
  const isCtap23 = versionsKnown && versions.includes(CTAP_2_3_VERSION);
  const authenticatorConfigCommands = arrayValue(info.authenticatorConfigCommands);
  const configCommandsKnown = Array.isArray(info.authenticatorConfigCommands);
  const hasConfigCommand = (id: number) => authenticatorConfigCommands.some((command) => unsignedIntegerValue(command) === id);
  const hasClientPinOption = option(options, "clientPin") !== undefined;
  const hasUvOption = option(options, "uv") !== undefined;
  const hasSomeUvOption = hasClientPinOption || hasUvOption;
  const add = (name: string, description: string, value: string, source: string) => warnings.push({ name, description, value, source });

  if (versions.includes("FIDO_2_2")) {
    add("Forbidden CTAP version identifier", "CTAP 2.3 states that FIDO_2_2 was not defined and must not be present in versions.", "FIDO_2_2 reported", "versions");
  }

  if (isCtap23 && (!extensionsKnown || !extensions.includes("hmac-secret"))) {
    add("CTAP 2.3 mandatory hmac-secret", "Authenticators that include FIDO_2_3 in versions must support the hmac-secret extension.", "hmac-secret not listed", "extensions.hmac-secret");
  }

  if (isCtap23 && option(options, "rk") === true) {
    if (!hasClientPinOption && !hasUvOption) {
      add("Discoverable credentials need UV state", "For FIDO_2_3, rk=true requires PIN establishment/maintenance or built-in UV; clientPin and/or uv must be reported as true/false.", "rk=true without clientPin/uv state", "options.rk + options.clientPin/options.uv");
    }
    if (option(options, "credMgmt") !== true) {
      add("Discoverable credential inventory", "For FIDO_2_3, rk=true requires credMgmt=true or equivalent inventory functionality via built-in UI.", "credMgmt not true; built-in UI must cover this", "options.rk + options.credMgmt");
    }
  }

  if (isCtap23 && (option(options, "clientPin") === true || option(options, "uv") === true) && option(options, "pinUvAuthToken") !== true) {
    add("Missing PIN/UV auth token option", "For FIDO_2_3, clientPin=true or uv=true requires pinUvAuthToken=true.", "pinUvAuthToken not true", "options.pinUvAuthToken");
  }

  if (isCtap23 && pinUvAuthProtocolsKnown && pinUvAuthProtocols.length && !pinUvAuthProtocols.includes(2)) {
    add("PIN/UV protocol 2 missing", "For FIDO_2_3, a non-empty pinUvAuthProtocols list must include protocol 2.", inlineList(pinUvAuthProtocols), "pinUvAuthProtocols");
  }

  if (isCtap23 && hasSomeUvOption && extensionsKnown && !extensions.includes("credProtect")) {
    add("Credential protection missing", "For FIDO_2_3, authenticators supporting some form of UV must support credProtect unless all credentials are implicitly created at credProtect level 3.", "credProtect not listed", "extensions.credProtect");
  }

  if (extensions.includes("credBlob") && !extensions.includes("credProtect")) {
    add("credBlob dependency missing", "Authenticators supporting credBlob must also support credProtect.", "credBlob without credProtect", "extensions.credBlob + extensions.credProtect");
  }

  if (extensions.includes("hmac-secret-mc") && !extensions.includes("hmac-secret")) {
    add("hmac-secret-mc dependency missing", "hmac-secret-mc requires hmac-secret support and is only used together with hmac-secret input.", "hmac-secret-mc without hmac-secret", "extensions.hmac-secret-mc + extensions.hmac-secret");
  }

  if (extensions.includes("largeBlobKey") && option(options, "largeBlobs") !== true) {
    add("largeBlobKey feature detection incomplete", "largeBlobKey support is detected only when extensions includes largeBlobKey and options.largeBlobs is true.", "largeBlobKey without largeBlobs", "extensions.largeBlobKey + options.largeBlobs");
  }

  if (extensions.includes("largeBlob") && (extensions.includes("largeBlobKey") || option(options, "largeBlobs") === true)) {
    add("Large blob mode conflict", "The largeBlob extension is mutually exclusive with the largeBlobKey/authenticatorLargeBlobs command path.", "conflicting large-blob modes", "extensions.largeBlob + extensions.largeBlobKey/options.largeBlobs");
  }

  if (extensions.includes("minPinLength") && option(options, "setMinPINLength") !== true) {
    add("minPinLength dependency missing", "If minPinLength is listed, the setMinPINLength authenticatorConfig subcommand must be supported.", "minPinLength without setMinPINLength", "extensions.minPinLength + options.setMinPINLength");
  }

  if (extensions.includes("pinComplexityPolicy") && option(options, "setMinPINLength") !== true) {
    add("PIN complexity extension dependency missing", "If the pinComplexityPolicy extension is listed, the setMinPINLength authenticatorConfig subcommand must be supported.", "pinComplexityPolicy without setMinPINLength", "extensions.pinComplexityPolicy + options.setMinPINLength");
  }

  if (hasOwn(info, "pinComplexityPolicy") && !hasClientPinOption) {
    add("PIN complexity requires ClientPIN", "The Set PIN Complexity Policy feature requires ClientPIN support.", "pinComplexityPolicy present without clientPin", "pinComplexityPolicy + options.clientPin");
  }

  if (option(options, "setMinPINLength") === true) {
    if (!extensions.includes("minPinLength")) {
      add("setMinPINLength extension missing", "The Set Minimum PIN Length feature requires the minPinLength extension.", "setMinPINLength without minPinLength", "options.setMinPINLength + extensions.minPinLength");
    }
    if (!hasClientPinOption && !hasUvOption) {
      add("setMinPINLength UV dependency unclear", "setMinPINLength may only appear with ClientPIN or authenticator PIN entry via built-in UV.", "no clientPin/uv option reported", "options.setMinPINLength + options.clientPin/options.uv");
    }
    if (configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.setMinPINLength)) {
      add("setMinPINLength command missing", "authenticatorConfigCommands must contain 0x03 when setMinPINLength is supported.", "0x03 not listed", "authenticatorConfigCommands");
    }
  }

  if (hasOwn(options, "uvBioEnroll") && !hasOwn(options, "bioEnroll")) {
    add("uvBioEnroll placement", "uvBioEnroll must only be present if bioEnroll is also present.", "uvBioEnroll without bioEnroll", "options.uvBioEnroll + options.bioEnroll");
  }

  if (hasOwn(options, "uvAcfg") && !hasOwn(options, "authnrCfg")) {
    add("uvAcfg placement", "uvAcfg must only be present if authnrCfg is also present.", "uvAcfg without authnrCfg", "options.uvAcfg + options.authnrCfg");
  }

  if (hasOwn(options, "noMcGaPermissionsWithClientPin") && !hasOwn(options, "clientPin")) {
    add("noMcGaPermissionsWithClientPin placement", "noMcGaPermissionsWithClientPin must only be present if clientPin is also present.", "option present without clientPin", "options.noMcGaPermissionsWithClientPin + options.clientPin");
  }

  if (option(options, "alwaysUv") === true && option(options, "makeCredUvNotRqd") === true) {
    add("alwaysUv conflict", "If alwaysUv=true, makeCredUvNotRqd must be false or absent.", "alwaysUv=true and makeCredUvNotRqd=true", "options.alwaysUv + options.makeCredUvNotRqd");
  }

  if (hasOwn(options, "ep")) {
    if (option(options, "authnrCfg") !== true) {
      add("Enterprise attestation config dependency", "Enterprise attestation support is re-enabled through authenticatorConfig; authnrCfg should be reported.", "ep present without authnrCfg=true", "options.ep + options.authnrCfg");
    }
    if (configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.enableEnterpriseAttestation)) {
      add("Enterprise attestation command missing", "If enterprise attestation is supported, authenticatorConfigCommands must contain 0x01.", "0x01 not listed", "authenticatorConfigCommands");
    }
  }

  if (hasOwn(info, "vendorPrototypeConfigCommands") && configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.vendorPrototype)) {
    add("Vendor prototype command missing", "If vendorPrototypeConfigCommands is present, authenticatorConfigCommands must contain 0xFF.", "0xFF not listed", "authenticatorConfigCommands + vendorPrototypeConfigCommands");
  }

  if (hasOwn(info, "longTouchForReset") && configCommandsKnown && !hasConfigCommand(CONFIG_COMMAND_ID.enableLongTouchForReset)) {
    add("Long touch config command missing", "If the long-touch-for-reset subcommand is supported, authenticatorConfigCommands must contain 0x04; verify this if the feature is configurable.", "0x04 not listed", "authenticatorConfigCommands + longTouchForReset");
  }

  return warnings;
}

function strictNonEmptyUniqueListStatus(known: boolean, value: unknown[], keyFn: (item: unknown) => string = defaultListItemKey): OverviewRowStatus {
  if (!known) return "unknown";
  if (!value.length) return "warning";
  if (hasDuplicateListItems(value, keyFn)) return "warning";
  return "informational";
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
  const length = byteLength(value);
  if (length !== undefined) return `reported (${length} bytes)`;
  const text = String(value);
  return `reported (${text.length} chars)`;
}

function capacityLabel(value: number | undefined) {
  return value !== undefined ? `${value} bytes` : "capacity not reported";
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

function integerValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function unsignedIntegerValue(value: unknown): number | undefined {
  const amount = integerValue(value);
  return amount !== undefined && amount >= 0 ? amount : undefined;
}

function algorithmIdentifier(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;
    return integerValue(item.alg) ?? integerValue(item.algorithm) ?? integerValue(item["3"]);
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

function algorithmListItemKey(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const item = value as Record<string, unknown>;
    const alg = algorithmIdentifier(value);
    const type = typeof item.type === "string" ? item.type : "public-key";
    return `${type}:${alg ?? JSON.stringify(item)}`;
  }
  return defaultListItemKey(value);
}

function protocolListItemKey(value: unknown) {
  const amount = unsignedIntegerValue(value);
  return amount !== undefined ? String(amount) : defaultListItemKey(value);
}

function defaultListItemKey(value: unknown) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value);
}

function hasDuplicateListItems(value: unknown[], keyFn: (item: unknown) => string = defaultListItemKey) {
  const seen = new Set<string>();
  for (const item of value) {
    const key = keyFn(item);
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function hasOwn(value: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function hasReportedGetInfo(info: Record<string, unknown>) {
  return Object.keys(info).length > 0;
}

function formatMap(value: Record<string, unknown>) {
  return Object.entries(value)
    .map(([key, entry]) => `${key}: ${formatListItem(entry)}`)
    .join(", ");
}

function formatListItem(value: unknown) {
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
  if (value === null || value === undefined) return "unknown";
  if (byteLength(value) !== undefined) return compactSecretValue(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatNumberWithUnit(value: number, unit: string) {
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function formatConfigCommand(value: unknown) {
  const id = unsignedIntegerValue(value);
  if (id === undefined) return formatListItem(value);
  const command = CONFIG_COMMANDS.find((entry) => entry.id === id);
  return command ? `${command.name} (${formatIntegerHex(id)})` : formatIntegerHex(id);
}

function formatIntegerHex(value: unknown) {
  const id = unsignedIntegerValue(value);
  if (id === undefined) return formatListItem(value);
  const width = id <= 0xff ? 2 : id <= 0xffff ? 4 : 0;
  return `0x${id.toString(16).toUpperCase().padStart(width, "0")}`;
}

function byteLength(value: unknown): number | undefined {
  const bytes = byteArray(value);
  if (bytes) return bytes.length;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (/^[0-9a-fA-F]{32}$/.test(text)) return 16;
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(text)) return 16;
  if (/^(?:[0-9a-fA-F]{2})+$/.test(text)) return text.length / 2;
  return undefined;
}

function byteArray(value: unknown): Uint8Array | undefined {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  if (Array.isArray(value) && value.every((item) => Number.isInteger(item) && item >= 0 && item <= 255)) return Uint8Array.from(value as number[]);
  return undefined;
}

function formatAaguid(value: unknown) {
  if (typeof value === "string") return value;
  const bytes = byteArray(value);
  if (bytes && bytes.length === 16) return uuidFromBytes(bytes);
  return textValue(value, "not reported");
}

function uuidFromBytes(bytes: Uint8Array) {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
