import { describe, expect, it } from "vitest";

import {
  LogCode,
  LogEntry,
  LogJournalBatch,
  LogJournalRecord,
  LogLayer,
  LogLevel,
  LogOutcome,
  LogPayload,
} from "../../../../bindings/github.com/go-ctap/kit/model";

import { LogController, logController, recordID, runtimeCall } from "./state.svelte.js";

function journalRecord(sequence: number, outcome = LogOutcome.LogOutcomeSucceeded, json = "{}") {
  return new LogJournalRecord({
    sequence,
    entry: new LogEntry({
      timestamp: "2026-07-15T10:00:00.000Z",
      layer: LogLayer.LogLayerOperation,
      level: LogLevel.LogLevelInfo,
      outcome,
      code: LogCode.LogCodeOperationRun,
      sessionId: "session-1",
      operationId: "operation-1",
      request: new LogPayload({ json, originalBytes: json.length, storedBytes: json.length, truncated: false }),
    }),
  });
}

describe("LogController", () => {
  it("appends immutable kit records by journal sequence", () => {
    const controller = new LogController();
    controller.append(journalRecord(1));
    controller.append(journalRecord(2, LogOutcome.LogOutcomeFailed));

    expect(controller.records).toHaveLength(2);
    expect(controller.records.map(recordID)).toEqual(["kit:1", "kit:2"]);
  });

  it("evicts the oldest entries by count and by stored bytes", () => {
    const countLimited = new LogController({ entryLimit: 2 });
    countLimited.append(journalRecord(1));
    countLimited.append(journalRecord(2));
    countLimited.append(journalRecord(3));
    expect(countLimited.records.map(recordID)).toEqual(["kit:2", "kit:3"]);

    const probe = new LogController();
    probe.append(journalRecord(1, LogOutcome.LogOutcomeSucceeded, "{\"value\":\"payload\"}"));
    const byteSize = probe.records[0].byteSize;
    const byteLimited = new LogController({ byteLimit: byteSize * 2 - 1 });
    byteLimited.append(journalRecord(1, LogOutcome.LogOutcomeSucceeded, "{\"value\":\"payload\"}"));
    byteLimited.append(journalRecord(2, LogOutcome.LogOutcomeSucceeded, "{\"value\":\"payload\"}"));
    expect(byteLimited.records.map(recordID)).toEqual(["kit:2"]);
  });

  it("disables follow-live when an older entry is selected and restores it at the tail", () => {
    const controller = new LogController();
    controller.append(journalRecord(1));
    controller.append(journalRecord(2));
    expect(controller.selectedId).toBe("kit:2");

    controller.select("kit:1");
    expect(controller.followLive).toBe(false);
    controller.append(journalRecord(3));
    expect(controller.selectedId).toBe("kit:1");

    controller.setFollowLive(true);
    expect(controller.selectedId).toBe("kit:3");
  });

  it("clears only on an explicit clear action", () => {
    const controller = new LogController();
    controller.append(journalRecord(1));
    controller.setQuery("operation");
    controller.clear();

    expect(controller.records).toEqual([]);
    expect(controller.selectedId).toBeNull();
    expect(controller.followLive).toBe(true);
  });

  it("advances the cursor, ignores overlap, and rejects batches from before clear", () => {
    const controller = new LogController();
    controller.applyBatch(new LogJournalBatch({
      entries: [journalRecord(1), journalRecord(2)],
      cursor: 2,
      truncated: true,
    }));
    controller.applyBatch(new LogJournalBatch({
      entries: [journalRecord(2), journalRecord(3)],
      cursor: 3,
    }));

    expect(controller.records.map(recordID)).toEqual(["kit:1", "kit:2", "kit:3"]);
    expect(controller.historyTruncated).toBe(true);
    controller.clear(3);
    controller.applyBatch(new LogJournalBatch({ entries: [journalRecord(2)], cursor: 2 }));

    expect(controller.records).toEqual([]);
    expect(controller.cursor).toBe(3);
    expect(controller.historyTruncated).toBe(false);
  });
});

describe("runtimeCall", () => {
  it("rethrows the original runtime error after recording a safe local failure", async () => {
    logController.clear();
    const cause = new Error("private bridge detail");
    await expect(runtimeCall("test.bridge", () => Promise.reject(cause))).rejects.toBe(cause);
    expect(logController.records).toHaveLength(1);
    expect(JSON.stringify(logController.records[0])).not.toContain("private bridge detail");
    logController.clear();
  });
});
