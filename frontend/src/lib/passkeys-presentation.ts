import type { CredentialGroup, CredentialRecord, InventoryReport } from "../../bindings/github.com/go-ctap/kit/model/credentials";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { m } from "../paraglide/messages.js";
import type { OperationEnvelope } from "./api.js";
import { credentialsReport, operationError } from "./ctapkit-results.js";
import type { LoadState } from "./load-state.js";
import { sanitizedJson } from "./redaction.js";

export type PasskeyTableRow = {
  id: string;
  rpID: string;
  rpName: string;
  rpIDHashHex: string;
  credentialIDHex: string;
  credentialType: string;
  credentialTransports: string;
  userIDHex: string;
  userName: string;
  displayName: string;
  largeBlobKeyState: string;
  credProtect: string;
  thirdPartyPayment: string;
  raw: {
    relyingParty: Pick<CredentialGroup, "rpID" | "rpName" | "rpIDHashHex">;
    credential: CredentialRecord;
  };
};

export type PasskeysPresentationInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  sessionBusy: boolean;
  envelope: OperationEnvelope | null;
  inventoryState: LoadState<OperationEnvelope>;
  loading: boolean;
  selectedRowId?: string;
};

export type PasskeysPresentation = ReturnType<typeof buildPasskeysPresentation>;

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === true) return m.state_available();
  if (value === false) return m.state_not_available();
  const text = String(value ?? "").trim();
  return text || m.not_reported();
}

function groupLabel(group: CredentialGroup) {
  const rpName = String(group.rpName ?? "").trim();
  const rpID = String(group.rpID).trim();
  if (rpName && rpID && rpName !== rpID) return `${rpName} (${rpID})`;
  return rpName || rpID || m.unknown_rp();
}

function flattenRows(report: InventoryReport | null): PasskeyTableRow[] {
  return (report?.groups ?? []).flatMap((group, groupIndex) => {
    return (group.credentials ?? []).map((credential, credentialIndex) => {
      const credentialIDHex = credential.credentialIDHex;
      return {
        id: `${groupIndex}:${credentialIndex}:${credentialIDHex}`,
        rpID: group.rpID,
        rpName: groupLabel(group),
        rpIDHashHex: displayValue(group.rpIDHashHex),
        credentialIDHex,
        credentialType: displayValue(credential.credentialType),
        credentialTransports: (credential.credentialTransports ?? []).join(", ") || m.not_reported(),
        userIDHex: displayValue(credential.userIDHex),
        userName: displayValue(credential.userName),
        displayName: displayValue(credential.displayName),
        largeBlobKeyState: displayValue(credential.largeBlobKeyState),
        credProtect: displayValue(credential.credProtect),
        thirdPartyPayment: displayValue(credential.thirdPartyPayment),
        raw: {
          relyingParty: {
            rpID: group.rpID,
            rpName: group.rpName,
            rpIDHashHex: group.rpIDHashHex,
          },
          credential,
        },
      };
    });
  });
}

export function buildPasskeysPresentation(input: PasskeysPresentationInput) {
  const report = credentialsReport(input.envelope);
  const rows = flattenRows(report);
  const selectedRow = rows.find((row) => row.id === input.selectedRowId) ?? null;
  const support = report?.support;
  const summary = report?.summary;

  return {
    selector: input.selectedSelector,
    loading: input.loading,
    failureMessage: operationError(input.envelope) || input.inventoryState.error?.message || null,
    reloadDisabled: input.loading || input.sessionBusy,
    hasReport: Boolean(report),
    report,
    reportJson: sanitizedJson(report ?? null),
    rows,
    selectedRow,
    selectedRowJson: sanitizedJson(selectedRow?.raw ?? null),
    emptyInventory: Boolean(report && rows.length === 0),
    selectedDeviceName: input.selectedDevice?.product || input.selectedDevice?.deviceId || m.authenticator(),
    summaryItems: [
      { label: m.relying_parties(), value: summary ? m.relying_parties_count({ count: summary.totalRPs }) : m.not_reported() },
      { label: m.credentials(), value: summary ? m.credentials_count({ count: summary.totalCredentials }) : m.not_reported() },
      { label: m.existing_resident_credentials(), value: summary ? String(summary.existingResidentCredentialsCount) : m.not_reported() },
      { label: m.remaining_resident_capacity(), value: summary ? String(summary.maxPossibleRemainingResidentCredentialsCount) : m.not_reported() },
    ],
    supportItems: [
      { label: m.credential_management_support(), value: support?.credentialManagement ?? false },
      { label: m.credential_management_preview(), value: support?.previewOnly ?? false },
      { label: m.read_only_permission(), value: support?.readOnlyPermission ?? false },
    ],
    loadingRows: [m.relying_parties(), m.credentials(), m.resident_credentials()],
  };
}
