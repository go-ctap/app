import type {
  LogEntry,
  LogJournalBatch,
  LogJournalRecord,
  LogOutcome,
} from "../../../../bindings/github.com/telesma-app/kit/model";
import type { Failure } from "../../../../bindings/github.com/telesma-app/kit/model/failure";
import { SvelteDate } from "svelte/reactivity";

import { runtimeFailureFrom } from "$lib/failure.js";

export const LOG_ENTRY_LIMIT = 2_000;

export const LOG_BYTE_LIMIT = 16 * 1024 * 1024;

export type KitLogRecord = {
  source: "kit";
  sequence: number;
  entry: LogEntry;
  byteSize: number;
};

export type AppRuntimeLogRecord = {
  source: "app/runtime";
  id: string;
  timestamp: string;
  context: string;
  error: Failure;
  byteSize: number;
};

export type LogRecord = KitLogRecord | AppRuntimeLogRecord;

export type LogFilters = {
  outcome: LogOutcome | "all";
};

const encoder = new TextEncoder();

function storedSize(value: object) {
  return encoder.encode(JSON.stringify(value)).byteLength;
}

function runtimeID() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `runtime-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

function kitRecord(item: LogJournalRecord): KitLogRecord {
  const base = { source: "kit" as const, sequence: item.sequence, entry: item.entry };

  return { ...base, byteSize: storedSize(base) };
}

export class LogController {
  records = $state.raw<readonly LogRecord[]>([]);
  selectedId = $state<string | null>(null);
  followLive = $state(true);
  cursor = $state(0);
  historyTruncated = $state(false);
  query = $state("");
  filters = $state<LogFilters>({ outcome: "all" });

  readonly entryLimit: number;
  readonly byteLimit: number;

  constructor(options: { entryLimit?: number; byteLimit?: number } = {}) {
    this.entryLimit = options.entryLimit ?? LOG_ENTRY_LIMIT;
    this.byteLimit = options.byteLimit ?? LOG_BYTE_LIMIT;
  }

  append(item: LogJournalRecord) {
    const record = kitRecord(item);

    this.commit([...this.records, record], recordID(record));
  }

  applyBatch(batch: LogJournalBatch) {
    if (batch.cursor <= this.cursor) return;

    const appended = batch.entries.filter((item) => item.sequence > this.cursor).map(kitRecord);

    if (appended.length > 0) {
      this.commit([...this.records, ...appended], recordID(appended.at(-1)!));
    }

    this.cursor = batch.cursor;
    this.historyTruncated ||= batch.truncated ?? false;
  }

  recordRuntimeFailure(context: string, cause: unknown) {
    const base = {
      source: "app/runtime" as const,
      id: runtimeID(),
      timestamp: new SvelteDate().toISOString(),
      context,
      error: runtimeFailureFrom(cause),
    };
    const record: AppRuntimeLogRecord = { ...base, byteSize: storedSize(base) };

    this.commit([...this.records, record], record.id);

    return record;
  }

  select(id: string) {
    this.selectedId = id;

    const newest = this.records.at(-1);

    this.followLive = newest !== undefined && recordID(newest) === id;
  }

  setQuery(query: string) {
    this.query = query;
  }

  setFilters(filters: LogFilters) {
    this.filters = filters;
  }

  clear(cursor = 0) {
    this.records = [];
    this.selectedId = null;
    this.followLive = true;
    this.cursor = cursor;
    this.historyTruncated = false;
  }

  private commit(records: LogRecord[], newestId: string) {
    let byteCount = records.reduce((total, record) => total + record.byteSize, 0);

    while (records.length > this.entryLimit || byteCount > this.byteLimit) {
      const evicted = records.shift();

      if (!evicted) break;

      byteCount -= evicted.byteSize;
    }

    this.records = records;
    if (this.followLive)
      this.selectedId = records.some((record) => recordID(record) === newestId) ? newestId : null;

    if (this.selectedId && !records.some((record) => recordID(record) === this.selectedId)) {
      this.selectedId = records.length > 0 ? recordID(records.at(-1)!) : null;
    }
  }
}

export function recordID(record: LogRecord) {
  return record.source === "kit" ? `kit:${record.sequence}` : record.id;
}

export const logController = new LogController();

export function recordRuntimeFailure(context: string, cause: unknown) {
  return logController.recordRuntimeFailure(context, cause);
}

export async function runtimeCall<T>(context: string, call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    recordRuntimeFailure(context, error);

    throw error;
  }
}
