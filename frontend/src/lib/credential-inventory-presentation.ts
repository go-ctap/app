export type CredentialIdentityRow = {
  id: string;
  credentialIDHex: string;
  rpID: string;
  rpName: string;
  userIDHex: string;
  userName: string;
  displayName: string;
};

export function displayInventoryValue(
  value: string | number | boolean | null | undefined,
  fallback: string,
) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function inventoryQueryMatches(
  values: Array<string | null | undefined>,
  normalizedQuery: string,
) {
  if (!normalizedQuery) return true;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export function inventoryRowsState<TRow>(
  allRows: TRow[],
  rows: TRow[],
  hasReport: boolean,
) {
  return {
    emptyInventory: hasReport && allRows.length === 0,
    emptyFilteredResult: hasReport && allRows.length > 0 && rows.length === 0,
  };
}
