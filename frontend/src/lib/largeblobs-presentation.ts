import {
  BlobState,
  LargeBlobKeyState,
  type ListCredential,
  type ListReport,
} from "../../bindings/github.com/go-ctap/kit/model/largeblobs";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";

import { m } from "../paraglide/messages.js";
import {
  largeBlobListReport,
} from "./ctapkit-results.js";
import type {
  LargeBlobsInventoryState,
  LargeBlobsStatusFilter,
} from "./features/largeblobs/state.js";
import { largeBlobsInventoryIsStale } from "./features/largeblobs/state.js";
import { deviceName } from "./format.js";

export type LargeBlobCredentialRow = {
  id: string;
  credentialIDHex: string;
  rpID: string;
  rpName: string;
  userIDHex: string;
  userName: string;
  displayName: string;
  largeBlobKeyState: LargeBlobKeyState;
  largeBlobKeyAvailable: boolean;
  blobState: BlobState;
  blobPresent: boolean;
  blobByteCount: number;
  raw: ListCredential;
};

export type LargeBlobsPresentationInput = {
  selectedSelector: string;
  selectedDevice: DeviceReport | null;
  authenticatorBusy: boolean;
  authenticatorReady: boolean;
  inventoryState: LargeBlobsInventoryState;
  query: string;
  statusFilter: LargeBlobsStatusFilter;
  selectedCredentialID: string;
};

export type LargeBlobsPresentation = ReturnType<typeof buildLargeBlobsPresentation>;

function displayValue(value: string | null | undefined) {
  const text = value?.trim() ?? "";
  return text || m.not_reported();
}

function rowFor(credential: ListCredential): LargeBlobCredentialRow {
  const blobPresent = credential.blobPresent || credential.blobState === BlobState.BlobStatePresent;
  return {
    id: credential.credentialIDHex,
    credentialIDHex: credential.credentialIDHex,
    rpID: credential.rp.id,
    rpName: displayValue(credential.rp.name || credential.rp.id),
    userIDHex: displayValue(credential.user.userIDHex),
    userName: displayValue(credential.user.name),
    displayName: displayValue(credential.user.displayName),
    largeBlobKeyState: credential.largeBlobKeyState,
    largeBlobKeyAvailable: credential.largeBlobKeyState === LargeBlobKeyState.LargeBlobKeyAvailable,
    blobState: credential.blobState,
    blobPresent,
    blobByteCount: credential.blobByteCount,
    raw: credential,
  };
}

function searchMatches(credential: ListCredential, normalizedQuery: string) {
  if (!normalizedQuery) return true;
  return [
    credential.credentialIDHex,
    credential.rp.id,
    credential.rp.name,
    credential.rp.idHashHex,
    credential.user.userIDHex,
    credential.user.name,
    credential.user.displayName,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function statusMatches(credential: ListCredential, filter: LargeBlobsStatusFilter) {
  switch (filter) {
    case "present":
      return credential.blobPresent || credential.blobState === BlobState.BlobStatePresent;
    case "missing":
      return credential.largeBlobKeyState === LargeBlobKeyState.LargeBlobKeyAvailable
        && !credential.blobPresent
        && credential.blobState === BlobState.BlobStateMissing;
    case "key-unavailable":
      return credential.largeBlobKeyState !== LargeBlobKeyState.LargeBlobKeyAvailable;
    case "all":
      return true;
  }
}

export function buildLargeBlobRows(
  report: ListReport | null,
  query = "",
  statusFilter: LargeBlobsStatusFilter = "all",
): LargeBlobCredentialRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  return (report?.credentials ?? [])
    .filter((credential) => searchMatches(credential, normalizedQuery) && statusMatches(credential, statusFilter))
    .map(rowFor);
}

export function findLargeBlobCredential(report: ListReport | null, credentialIDHex: string): ListCredential | null {
  return (report?.credentials ?? []).find((credential) => credential.credentialIDHex === credentialIDHex) ?? null;
}

export function buildLargeBlobsPresentation(input: LargeBlobsPresentationInput) {
  const query = input.query;
  const statusFilter = input.statusFilter;
  const report = largeBlobListReport(input.inventoryState.lastSuccessfulEnvelope);
  const allRows = buildLargeBlobRows(report);
  const rows = buildLargeBlobRows(report, query, statusFilter);
  const selectedCredentialID = input.selectedCredentialID;
  const selectedRow = allRows.find((row) => row.id === selectedCredentialID) ?? null;
  const loading = input.inventoryState.phase === "loading" || input.inventoryState.phase === "refreshing";
  const stale = largeBlobsInventoryIsStale(input.inventoryState);
  const actionsBlocked = loading || input.authenticatorBusy || !input.authenticatorReady;
  const supported = Boolean(report?.support.largeBlobs);
  const selectedKeyAvailable = Boolean(selectedRow?.largeBlobKeyAvailable);
  const selectedBlobPresent = Boolean(selectedRow?.blobPresent);
  const device = input.selectedDevice ?? report?.device ?? null;

  return {
    selector: input.selectedSelector,
    loading,
    stale,
    lastSuccessfulAt: input.inventoryState.lastSuccessfulAt,
    unsupported: report ? !report.support.largeBlobs : input.inventoryState.phase === "unsupported",
    reloadDisabled: loading || input.authenticatorBusy,
    actionsBlocked,
    writeDisabled: actionsBlocked || !supported || !selectedKeyAvailable,
    deleteDisabled: actionsBlocked || !supported || !selectedKeyAvailable || !selectedBlobPresent,
    selectedBlobPresent,
    cleanupDisabled: actionsBlocked || !supported,
    hasReport: Boolean(report),
    support: report?.support ?? null,
    maxSerializedLargeBlobArray: report?.support.maxSerializedLargeBlobArray ?? null,
    credentialCount: report?.credentials?.length ?? 0,
    blobCount: report?.array.blobCount ?? 0,
    matchedBlobCount: report?.array.matchedBlobCount ?? 0,
    unmatchedBlobCount: report?.array.unmatchedBlobCount ?? 0,
    query,
    statusFilter,
    rows,
    selectedCredentialID,
    emptyInventory: Boolean(report && allRows.length === 0),
    emptyFilteredResult: Boolean(report && allRows.length > 0 && rows.length === 0),
    selectedDeviceName: device ? deviceName(device) : m.authenticator(),
    supportItems: [
      { label: m.matrix_name_large_blobs_command(), value: report?.support.largeBlobs ?? false },
      { label: m.matrix_name_large_blob_key_extension(), value: report?.support.largeBlobKeyExtension ?? false },
    ],
  };
}
