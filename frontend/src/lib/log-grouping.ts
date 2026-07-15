import { LogCode } from "../../bindings/github.com/go-ctap/kit/model";

import type { KitLogRecord, LogRecord } from "./features/logs/state.svelte.js";
import { recordID } from "./features/logs/state.svelte.js";

export type OperationLogGroup = {
  kind: "operation";
  operationId: string;
  operation: KitLogRecord | null;
  representative: KitLogRecord;
  records: readonly KitLogRecord[];
  allRecords: readonly KitLogRecord[];
};

export type LogListItem =
  | { kind: "record"; record: LogRecord }
  | OperationLogGroup;

function operationID(record: LogRecord) {
  if (record.source !== "kit") return "";
  return record.entry.operationId?.trim() ?? "";
}

function isOperationRecord(record: KitLogRecord) {
  return record.entry.code === LogCode.LogCodeOperationRun;
}

export function buildLogListItems(
  records: readonly LogRecord[],
  matchingRecords: readonly LogRecord[],
): LogListItem[] {
  const matchingIDs = new Set(matchingRecords.map(recordID));
  const operations = new Map<string, KitLogRecord[]>();

  for (const record of records) {
    const id = operationID(record);
    if (!id || record.source !== "kit") continue;
    const grouped = operations.get(id);
    if (grouped) grouped.push(record);
    else operations.set(id, [record]);
  }

  const emittedOperations = new Set<string>();
  const items: LogListItem[] = [];

  for (const record of records) {
    const id = operationID(record);
    if (!id || record.source !== "kit") {
      if (matchingIDs.has(recordID(record))) items.push({ kind: "record", record });
      continue;
    }

    if (emittedOperations.has(id)) continue;
    emittedOperations.add(id);

    const allRecords = operations.get(id) ?? [record];
    const matched = allRecords.filter((item) => matchingIDs.has(recordID(item)));
    if (matched.length === 0) continue;

    const operation = allRecords.findLast(isOperationRecord) ?? null;
    if (allRecords.length === 1 || (matched.length === 1 && matched[0] === operation)) {
      items.push({ kind: "record", record: matched[0] });
      continue;
    }

    items.push({
      kind: "operation",
      operationId: id,
      operation,
      representative: operation ?? allRecords.at(-1)!,
      records: matched.filter((item) => item !== operation),
      allRecords,
    });
  }

  return items;
}
