import { describe, expect, it } from "vitest";

import {
  LogCode,
  LogEntry,
  LogLayer,
  LogLevel,
  LogOutcome,
  OperationKind,
} from "../../bindings/github.com/go-ctap/kit/model";

import type { KitLogRecord } from "./features/logs/state.svelte.js";
import { buildLogListItems } from "./log-grouping.js";

function record(sequence: number, values: Partial<LogEntry>): KitLogRecord {
  const entry = new LogEntry({
    timestamp: `2026-07-15T10:00:0${sequence}.000Z`,
    layer: LogLayer.LogLayerCTAP,
    level: LogLevel.LogLevelInfo,
    outcome: LogOutcome.LogOutcomeSucceeded,
    code: LogCode.LogCodeCTAPCommand,
    operationId: "operation-1",
    ...values,
  });
  return { source: "kit", sequence, entry, byteSize: 1 };
}

describe("log grouping", () => {
  it("uses the operation result as the parent of correlated events", () => {
    const command = record(1, { command: "authenticatorGetInfo" });
    const operation = record(2, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationInspect,
    });

    const items = buildLogListItems([command, operation], [command, operation]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "operation",
      operationId: "operation-1",
      operation,
      representative: operation,
      records: [command],
      allRecords: [command, operation],
    });
  });

  it("keeps the operation parent as context when only a child matches", () => {
    const command = record(1, { command: "authenticatorClientPIN" });
    const operation = record(2, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });

    const items = buildLogListItems([command, operation], [command]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: "operation",
      operation,
      records: [command],
    });
  });

  it("leaves standalone and operation-only matches as ordinary records", () => {
    const standalone = record(1, { operationId: undefined, command: "authenticatorGetInfo" });
    const command = record(2, { command: "authenticatorClientPIN" });
    const operation = record(3, {
      layer: LogLayer.LogLayerOperation,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
    });

    const items = buildLogListItems([standalone, command, operation], [standalone, operation]);

    expect(items).toEqual([
      { kind: "record", record: standalone },
      { kind: "record", record: operation },
    ]);
  });
});
