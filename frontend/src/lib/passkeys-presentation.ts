import { ErrorCategory, type ErrorCategory as ErrorCategoryValue } from "../../bindings/github.com/go-ctap/kit/model";
import type { CredentialGroup, CredentialRecord, InventoryReport } from "../../bindings/github.com/go-ctap/kit/model/credentials";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { m } from "../paraglide/messages.js";
import { credentialsReport } from "./ctapkit-results.js";
import type { PasskeysInventoryState, PasskeysMutationState, PasskeysStatusFilter } from "./features/passkeys/state.js";
import { passkeysInventoryIsStale } from "./features/passkeys/state.js";
import { deviceName } from "./format.js";
import type { SessionStatus } from "./session-model.js";

const RETRYABLE_MUTATION_CATEGORIES = new Set<ErrorCategoryValue>([
  ErrorCategory.ErrorTransportFailure,
  ErrorCategory.ErrorTimeout,
  ErrorCategory.ErrorBusy,
]);

export type PasskeyCredentialTarget = {
  relyingParty: CredentialGroup;
  credential: CredentialRecord;
};

export type PasskeyCredentialRow = {
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
  largeBlobKeyAvailable: boolean;
  credProtect: string;
  credProtectLevel: number | null;
  thirdPartyPayment: string;
  thirdPartyPaymentEnabled: boolean;
  raw: {
    relyingParty: Omit<CredentialGroup, "credentials">;
    credential: CredentialRecord;
  };
};

export type PasskeysCapacity = {
  stored: number;
  remainingUpperBound: number;
  estimatedTotal: number;
  percentage: number;
};

export type PasskeysPresentationInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  sessionBusy: boolean;
  sessionReady: boolean;
  inventoryState: PasskeysInventoryState;
  query?: string;
  statusFilter?: PasskeysStatusFilter;
  selectedCredentialID?: string;
};

export type PasskeysPresentation = ReturnType<typeof buildPasskeysPresentation>;

export function canRetryPasskeysMutation(mutation: PasskeysMutationState, session: SessionStatus) {
  if (mutation.phase !== "error" || session.state !== "ready" || !session.sessionId) return false;
  const error = mutation.runtimeError ?? mutation.responseEnvelope?.error;
  return Boolean(error?.category && RETRYABLE_MUTATION_CATEGORIES.has(error.category));
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === true) return m.state_available();
  if (value === false) return m.state_not_available();
  const text = String(value ?? "").trim();
  return text || m.not_reported();
}

function relyingPartyName(group: CredentialGroup) {
  const rpName = group.rpName?.trim() ?? "";
  const rpID = group.rpID.trim();
  return rpName || rpID || m.unknown_rp();
}

export function credProtectLabel(level: number | undefined) {
  switch (level) {
    case 1:
      return m.cred_protect_level_1();
    case 2:
      return m.cred_protect_level_2();
    case 3:
      return m.cred_protect_level_3();
    default:
      return m.cred_protect_not_reported();
  }
}

function rowFor(group: CredentialGroup, credential: CredentialRecord): PasskeyCredentialRow {
  return {
    id: credential.credentialIDHex,
    rpID: group.rpID,
    rpName: relyingPartyName(group),
    rpIDHashHex: displayValue(group.rpIDHashHex),
    credentialIDHex: credential.credentialIDHex,
    credentialType: displayValue(credential.credentialType),
    credentialTransports: (credential.credentialTransports ?? []).join(", ") || m.not_reported(),
    userIDHex: displayValue(credential.userIDHex),
    userName: displayValue(credential.userName),
    displayName: displayValue(credential.displayName),
    largeBlobKeyState: displayValue(credential.largeBlobKeyState),
    largeBlobKeyAvailable: credential.largeBlobKeyState === "available",
    credProtect: credProtectLabel(credential.credProtect),
    credProtectLevel: credential.credProtect || null,
    thirdPartyPayment: displayValue(credential.thirdPartyPayment),
    thirdPartyPaymentEnabled: credential.thirdPartyPayment === true,
    raw: {
      relyingParty: {
        rpID: group.rpID,
        rpName: group.rpName,
        rpIDHashHex: group.rpIDHashHex,
      },
      credential,
    },
  };
}

export function passkeyCredentialTargets(report: InventoryReport | null): PasskeyCredentialTarget[] {
  return (report?.groups ?? []).flatMap((group) => (group.credentials ?? []).map((credential) => ({ relyingParty: group, credential })));
}

export function findPasskeyCredential(report: InventoryReport | null, credentialIDHex: string): PasskeyCredentialTarget | null {
  return passkeyCredentialTargets(report).find((target) => target.credential.credentialIDHex === credentialIDHex) ?? null;
}

function searchMatches(group: CredentialGroup, credential: CredentialRecord, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return [
    group.rpName,
    group.rpID,
    group.rpIDHashHex,
    credential.credentialIDHex,
    credential.userIDHex,
    credential.userName,
    credential.displayName,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function statusMatches(credential: CredentialRecord, filter: PasskeysStatusFilter) {
  switch (filter) {
    case "large-blob-available":
      return credential.largeBlobKeyState === "available";
    case "large-blob-missing":
      return credential.largeBlobKeyState === "missing";
    case "third-party-payment":
      return credential.thirdPartyPayment === true;
    case "cred-protect-1":
      return credential.credProtect === 1;
    case "cred-protect-2":
      return credential.credProtect === 2;
    case "cred-protect-3":
      return credential.credProtect === 3;
    case "cred-protect-not-reported":
      return !credential.credProtect;
    case "all":
      return true;
  }
}

export function buildPasskeyRows(
  report: InventoryReport | null,
  query = "",
  statusFilter: PasskeysStatusFilter = "all",
): PasskeyCredentialRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  return (report?.groups ?? []).flatMap((group) =>
    (group.credentials ?? [])
      .filter((credential) => searchMatches(group, credential, normalizedQuery) && statusMatches(credential, statusFilter))
      .map((credential) => rowFor(group, credential)),
  );
}

export function passkeysCapacity(report: InventoryReport | null): PasskeysCapacity | null {
  if (!report) return null;
  const stored = report.summary.existingResidentCredentialsCount;
  const remainingUpperBound = report.summary.maxPossibleRemainingResidentCredentialsCount;
  const estimatedTotal = stored + remainingUpperBound;
  return {
    stored,
    remainingUpperBound,
    estimatedTotal,
    percentage: estimatedTotal > 0 ? Math.min(100, Math.max(0, (stored / estimatedTotal) * 100)) : 0,
  };
}

export function buildPasskeysPresentation(input: PasskeysPresentationInput) {
  const query = input.query ?? "";
  const statusFilter = input.statusFilter ?? "all";
  const envelope = input.inventoryState.lastSuccessfulEnvelope;
  const report = credentialsReport(envelope);
  const allRows = buildPasskeyRows(report);
  const rows = buildPasskeyRows(report, query, statusFilter);
  const selectedCredentialID = input.selectedCredentialID ?? "";
  const support = report?.support;
  const loading = input.inventoryState.phase === "loading" || input.inventoryState.phase === "refreshing";
  const stale = passkeysInventoryIsStale(input.inventoryState);
  const mutationsBlocked = stale || loading || input.sessionBusy || !input.sessionReady;

  return {
    selector: input.selectedSelector,
    loading,
    stale,
    lastSuccessfulAt: input.inventoryState.lastSuccessfulAt,
    failureMessage: input.inventoryState.runtimeError?.message
      ?? input.inventoryState.responseEnvelope?.error?.message
      ?? (input.inventoryState.phase === "error" && input.inventoryState.responseEnvelope ? m.operation_missing_result() : null),
    canceled: input.inventoryState.runtimeError?.category === ErrorCategory.ErrorCanceled
      || input.inventoryState.responseEnvelope?.error?.category === ErrorCategory.ErrorCanceled,
    unsupported: report
      ? !report.support.credentialManagement
      : input.inventoryState.phase === "unsupported",
    reloadDisabled: loading || input.sessionBusy,
    updateDisabled: mutationsBlocked || !support?.credentialManagement || Boolean(support?.previewOnly),
    deleteDisabled: mutationsBlocked || !support?.credentialManagement,
    hasReport: Boolean(report),
    report,
    query,
    statusFilter,
    rows,
    selectedCredentialID,
    emptyInventory: Boolean(report && allRows.length === 0),
    emptyFilteredResult: Boolean(report && allRows.length > 0 && rows.length === 0),
    capacity: passkeysCapacity(report),
    selectedDeviceName: input.selectedDevice ? deviceName(input.selectedDevice) : m.authenticator(),
  };
}
