import {
  LogCode,
  LogLayer,
  LogLevel,
  LogOutcome,
  OperationKind,
} from "../../bindings/github.com/go-ctap/kit/model";

import { m } from "../paraglide/messages.js";
import { failureMessage } from "./failure.js";
import { operationStageLabel } from "./format.js";
import type { KitLogRecord, LogFilters, LogRecord } from "./features/logs/state.svelte.js";

export function compactLogJSON(source: string) {
  try {
    return JSON.stringify(
      JSON.parse(source),
      function omitEmptyField(key, value) {
        if (!key || Array.isArray(this)) return value;
        return value === null || value === "" || value === 0 ? undefined : value;
      },
      2,
    ) ?? source;
  } catch {
    return source;
  }
}

export function logSummary(record: LogRecord) {
  if (record.source === "app/runtime") return m.logs_summary_runtime({ context: record.context });

  const entry = record.entry;
  switch (entry.code) {
    case LogCode.LogCodeDiscoveryRun:
      return m.logs_summary_discovery_run();
    case LogCode.LogCodeDiscoveryChanged:
      return m.logs_summary_discovery_changed();
    case LogCode.LogCodeMDSLookup:
      return m.logs_summary_mds_lookup();
    case LogCode.LogCodeSessionOpen:
      return m.logs_summary_session_open();
    case LogCode.LogCodeSessionClose:
      return m.logs_summary_session_close();
    case LogCode.LogCodeOperationRun:
      return m.logs_summary_operation_run({ operation: operationKindLabel(entry.operationKind) });
    case LogCode.LogCodeOperationProgress:
      return m.logs_summary_operation_progress({ stage: operationStageLabel(entry.params?.stage) });
    case LogCode.LogCodeInteractionRequest:
      return m.logs_summary_interaction_request();
    case LogCode.LogCodeInteractionResolve:
      return m.logs_summary_interaction_resolve();
    case LogCode.LogCodeCTAPCommand:
      return m.logs_summary_ctap_command({ command: commandLabel(record) });
    case LogCode.$zero:
      return entry.code;
  }
}

export function operationKindLabel(kind: OperationKind | undefined) {
  switch (kind) {
    case OperationKind.OperationInspect:
      return m.overview();
    case OperationKind.OperationListCredentials:
      return m.credential_inventory();
    case OperationKind.OperationDeleteCredential:
      return m.credential_delete();
    case OperationKind.OperationUpdateCredentialUser:
      return m.credential_update();
    case OperationKind.OperationReadLargeBlob:
      return m.large_blob_read();
    case OperationKind.OperationListLargeBlobs:
      return m.large_blob_list();
    case OperationKind.OperationWriteLargeBlob:
      return m.large_blob_write();
    case OperationKind.OperationDeleteLargeBlob:
      return m.large_blob_delete();
    case OperationKind.OperationGarbageCollectLargeBlobs:
      return m.large_blob_cleanup();
    case OperationKind.OperationConfigStatus:
      return m.security_status_operation();
    case OperationKind.OperationBioSensorInfo:
      return m.security_bio_sensor_operation();
    case OperationKind.OperationBioList:
      return m.security_bio_list_operation();
    case OperationKind.OperationBioEnroll:
      return m.security_bio_enroll_operation();
    case OperationKind.OperationBioRename:
      return m.security_bio_rename_operation();
    case OperationKind.OperationBioRemove:
      return m.security_bio_remove_operation();
    case OperationKind.OperationResetFactory:
      return m.security_reset_operation();
    case OperationKind.OperationSetPIN:
      return m.security_pin_set_operation();
    case OperationKind.OperationChangePIN:
      return m.security_pin_change_operation();
    case OperationKind.OperationSetAlwaysUV:
      return m.security_always_uv_operation();
    case OperationKind.OperationSetMinPINLength:
      return m.security_pin_policy_operation();
    case OperationKind.OperationMakeCredential:
      return m.lab_make_credential();
    case OperationKind.OperationGetAssertion:
      return m.lab_get_assertion();
    case OperationKind.$zero:
    case undefined:
      return "—";
  }
}

export function logLevel(record: LogRecord) {
  return record.source === "kit" ? record.entry.level : LogLevel.LogLevelError;
}

export function logLayer(record: LogRecord) {
  return record.source === "kit" ? record.entry.layer : LogLayer.LogLayerService;
}

export function logOutcome(record: LogRecord) {
  return record.source === "kit" ? record.entry.outcome : LogOutcome.LogOutcomeFailed;
}

export function logLevelLabel(level: LogLevel) {
  const labels: Record<LogLevel, string> = {
    [LogLevel.$zero]: "—",
    [LogLevel.LogLevelDebug]: m.logs_level_debug(),
    [LogLevel.LogLevelInfo]: m.logs_level_info(),
    [LogLevel.LogLevelWarning]: m.logs_level_warning(),
    [LogLevel.LogLevelError]: m.logs_level_error(),
  };
  return labels[level];
}

export function logLayerLabel(layer: LogLayer) {
  const labels: Record<LogLayer, string> = {
    [LogLayer.$zero]: "—",
    [LogLayer.LogLayerService]: m.logs_layer_service(),
    [LogLayer.LogLayerSession]: m.logs_layer_session(),
    [LogLayer.LogLayerOperation]: m.logs_layer_operation(),
    [LogLayer.LogLayerInteraction]: m.logs_layer_interaction(),
    [LogLayer.LogLayerCTAP]: m.logs_layer_ctap(),
  };
  return labels[layer];
}

export function logOutcomeLabel(outcome: LogOutcome) {
  const labels: Record<LogOutcome, string> = {
    [LogOutcome.$zero]: "—",
    [LogOutcome.LogOutcomeEvent]: m.logs_outcome_event(),
    [LogOutcome.LogOutcomeSucceeded]: m.logs_outcome_succeeded(),
    [LogOutcome.LogOutcomeFailed]: m.logs_outcome_failed(),
    [LogOutcome.LogOutcomeCanceled]: m.logs_outcome_canceled(),
  };
  return labels[outcome];
}

export function logTimestamp(record: LogRecord) {
  return record.source === "kit" ? record.entry.timestamp : record.timestamp;
}

export function logTime(record: LogRecord) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  }).format(new Date(logTimestamp(record)));
}

export function commandLabel(record: KitLogRecord) {
  const command = record.entry.command || "CTAP";
  return record.entry.subCommand ? `${command} · ${record.entry.subCommand}` : command;
}

export function filterLogs(records: readonly LogRecord[], query: string, filters: LogFilters) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (filters.level !== "all" && logLevel(record) !== filters.level) return false;
    if (filters.layer !== "all" && logLayer(record) !== filters.layer) return false;
    if (filters.outcome !== "all" && logOutcome(record) !== filters.outcome) return false;
    if (!normalizedQuery) return true;
    return searchableText(record).toLocaleLowerCase().includes(normalizedQuery);
  });
}

function searchableText(record: LogRecord) {
  if (record.source === "app/runtime") {
    return [logSummary(record), record.id, record.context, JSON.stringify(record.error)].join("\n");
  }

  const entry = record.entry;
  return [
    logSummary(record),
    record.sequence,
    entry.sessionId,
    entry.operationId,
    entry.operationKind,
    entry.command,
    entry.subCommandFamily,
    entry.subCommand,
    JSON.stringify(entry.params),
    entry.request?.json,
    entry.response?.json,
    entry.error ? failureMessage(entry.error) : "",
    entry.error ? JSON.stringify(entry.error) : "",
  ].filter(Boolean).join("\n");
}
