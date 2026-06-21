import { formatIntegerHex, unsignedIntegerValue } from "./overview-utils.js";

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
