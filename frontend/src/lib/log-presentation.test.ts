import { beforeEach, describe, expect, it } from "vitest";

import {
  LogEntry,
  LogJournalRecord,
  LogOutcome,
  LogPayload,
} from "../../bindings/github.com/go-ctap/kit/model";
import { Kind as OperationKind } from "../../bindings/github.com/go-ctap/kit/model/operation";

import { LogController } from "$lib/features/logs/state.svelte.js";
import { setAppLocale } from "$lib/i18n.js";
import { filterLogs, logSummary, operationKindLabel } from "$lib/log-presentation.js";

function ctapRecord() {
  const controller = new LogController();

  controller.append(
    new LogJournalRecord({
      sequence: 18,
      entry: new LogEntry({
        timestamp: "2026-07-15T10:00:01.000Z",
        outcome: LogOutcome.LogOutcomeFailed,
        operationKind: OperationKind.ListCredentials,
        command: "authenticatorClientPIN",
        commandCode: 6,
        subCommand: "getPinUvAuthTokenUsingPinWithPermissions",
        subCommandCode: 9,
        request: new LogPayload({
          cborDiagnostic: `{10: "engineers.example"}`,
          originalBytes: 24,
          storedBytes: 25,
          truncated: false,
        }),
        response: new LogPayload({
          diagnosticError: "diagnostic schema unavailable",
          originalBytes: 2,
          storedBytes: 0,
          truncated: false,
        }),
      }),
    }),
  );

  return controller.records[0];
}

describe("log presentation", () => {
  beforeEach(() => setAppLocale("en"));

  it("localizes CTAP summaries and operation kinds", () => {
    const record = ctapRecord();

    expect(logSummary(record)).toBe(
      "CTAP command: authenticatorClientPIN · getPinUvAuthTokenUsingPinWithPermissions",
    );
    expect(operationKindLabel(OperationKind.ListCredentials)).toBe("Passkey inventory");

    setAppLocale("ru");
    expect(logSummary(record)).toBe(
      "CTAP-команда: authenticatorClientPIN · getPinUvAuthTokenUsingPinWithPermissions",
    );
    expect(operationKindLabel(OperationKind.ListCredentials)).toBe("Список ключей доступа");
  });

  it("searches operation metadata, normalized CBOR, diagnostics, and wire codes", () => {
    const record = ctapRecord();
    const records = [record];
    const all = { outcome: "all" } as const;

    expect(filterLogs(records, "credentials.list", all)).toEqual(records);
    expect(filterLogs(records, "engineers.example", all)).toEqual(records);
    expect(filterLogs(records, "diagnostic schema unavailable", all)).toEqual(records);
    expect(filterLogs(records, "0x06", all)).toEqual(records);
    expect(filterLogs(records, "does-not-exist", all)).toEqual([]);
    expect(filterLogs(records, "", { outcome: LogOutcome.LogOutcomeSucceeded })).toEqual([]);
  });
});
