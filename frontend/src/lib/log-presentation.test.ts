import { beforeEach, describe, expect, it } from "vitest";

import {
  LogCode,
  LogEntry,
  LogJournalRecord,
  LogLayer,
  LogLevel,
  LogOutcome,
  LogPayload,
  OperationKind,
} from "../../bindings/github.com/go-ctap/kit/model";

import { LogController } from "./features/logs/state.svelte.js";
import { setAppLocale } from "./i18n.js";
import { compactLogJSON, filterLogs, logSummary } from "./log-presentation.js";

function operationRecord() {
  const controller = new LogController();
  controller.append(new LogJournalRecord({
    sequence: 17,
    entry: new LogEntry({
      timestamp: "2026-07-15T10:00:00.000Z",
      layer: LogLayer.LogLayerOperation,
      level: LogLevel.LogLevelInfo,
      outcome: LogOutcome.LogOutcomeSucceeded,
      code: LogCode.LogCodeOperationRun,
      operationKind: OperationKind.OperationListCredentials,
      sessionId: "session-searchable",
      operationId: "operation-searchable",
      request: new LogPayload({ json: "{\"rpId\":\"example.test\"}", originalBytes: 27, storedBytes: 27, truncated: false }),
    }),
  }));
  return controller.records[0];
}

describe("log presentation", () => {
  beforeEach(() => setAppLocale("en"));

  it("omits empty object fields without changing meaningful booleans or array positions", () => {
    expect(compactLogJSON(JSON.stringify({
      nullValue: null,
      emptyValue: "",
      zeroValue: 0,
      enabled: false,
      nested: { zeroValue: 0, value: "kept" },
      values: [null, "", 0, false],
    }))).toBe(`{
  "enabled": false,
  "nested": {
    "value": "kept"
  },
  "values": [
    null,
    "",
    0,
    false
  ]
}`);
  });

  it("keeps the original source when a payload is not valid JSON", () => {
    expect(compactLogJSON("truncated payload")).toBe("truncated payload");
  });

  it("localizes semantic codes and operation kinds in English and Russian", () => {
    const record = operationRecord();
    expect(logSummary(record)).toBe("Operation: Credential inventory");

    setAppLocale("ru");
    expect(logSummary(record)).toBe("Операция: Инвентарь учетных данных");
  });

  it("searches summaries, correlation IDs, operation metadata, and literal JSON", () => {
    const record = operationRecord();
    const records = [record];
    const all = { level: "all", layer: "all", outcome: "all" } as const;

    expect(filterLogs(records, "session-searchable", all)).toEqual(records);
    expect(filterLogs(records, "credentials.list", all)).toEqual(records);
    expect(filterLogs(records, "example.test", all)).toEqual(records);
    expect(filterLogs(records, "does-not-exist", all)).toEqual([]);
    expect(filterLogs(records, "", { ...all, level: LogLevel.LogLevelError })).toEqual([]);
  });
});
