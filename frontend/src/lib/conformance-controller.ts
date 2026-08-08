import { get } from "svelte/store";

import { Status, type SuiteResult } from "../../bindings/github.com/telesma-app/kit/conformance";
import {
  RunMode,
  type Metadata,
} from "../../bindings/github.com/telesma-app/kit/conformance/ctap23";

import { m } from "../paraglide/messages.js";
import { advancedMode } from "$lib/application-config.js";
import { api } from "$lib/api.js";
import { rediscoverAfterFactoryReset } from "$lib/authenticator-controller.js";
import { conformanceSuiteResult, inspectResult } from "$lib/ctapkit-results.js";
import {
  authenticatorInspection,
  authenticatorStatus,
  selectedSelector,
} from "$lib/features/authenticator/state.js";
import { conformanceMode, conformanceRun } from "$lib/features/conformance/state.js";
import { overviewMDS } from "$lib/features/overview/state.js";
import { activeScreen } from "$lib/features/workbench/state.js";
import { failureMessage } from "$lib/failure.js";
import { completeOperation, runOperation } from "$lib/operation-lifecycle.js";
import { loadOverview, loadOverviewMDS } from "$lib/overview-controller.js";
import { setStatusOutcome } from "$lib/workbench-state.js";

function canUseConformance() {
  const authenticator = get(authenticatorStatus);

  return (
    get(advancedMode) &&
    get(activeScreen) === "conformance" &&
    Boolean(get(selectedSelector).trim() && authenticator.selectionId) &&
    authenticator.state === "ready"
  );
}

export async function maybeLoadConformance() {
  if (!canUseConformance()) return false;

  if (get(authenticatorInspection).state !== "ready") {
    await loadOverview();
  }

  const info = inspectResult(get(authenticatorInspection).data)?.info;
  if (!info?.aaguid) return false;

  if (get(overviewMDS).state === "idle") {
    await loadOverviewMDS(info.aaguid, false);
  }

  return get(overviewMDS).state === "ready";
}

export async function reloadConformanceMetadata() {
  const info = inspectResult(get(authenticatorInspection).data)?.info;

  if (!info?.aaguid) {
    await loadOverview();

    const loaded = inspectResult(get(authenticatorInspection).data)?.info;
    if (!loaded?.aaguid) return false;

    return loadOverviewMDS(loaded.aaguid, true);
  }

  return loadOverviewMDS(info.aaguid, true);
}

export function selectConformanceMode(mode: RunMode) {
  conformanceMode.set(mode);
}

function resetAttempted(result: SuiteResult) {
  return result.tests.some((test) => test.steps.some((step) => step.id === "authenticator.reset"));
}

function reportSuiteOutcome(result: SuiteResult) {
  const counts = result.tests.reduce(
    (current, test) => {
      current[test.status] = (current[test.status] ?? 0) + 1;

      return current;
    },
    {} as Partial<Record<Status, number>>,
  );
  const message = m.conformance_result_summary({
    passed: counts[Status.StatusPassed] ?? 0,
    failed: counts[Status.StatusFailed] ?? 0,
    skipped: counts[Status.StatusSkipped] ?? 0,
    errors: counts[Status.StatusError] ?? 0,
  });

  switch (result.status) {
    case Status.StatusPassed:
      setStatusOutcome({ tone: "success", title: m.conformance_run_passed(), message });
      break;
    case Status.StatusFailed:
      setStatusOutcome({ tone: "warning", title: m.conformance_run_failed(), message });
      break;
    case Status.StatusSkipped:
      setStatusOutcome({ tone: "info", title: m.conformance_run_skipped(), message });
      break;
    case Status.StatusError:
      setStatusOutcome({ tone: "error", title: m.conformance_run_error(), message });
      break;
  }
}

export async function runCTAP23Conformance(mode: RunMode, metadata: Metadata) {
  if (!canUseConformance()) return false;

  const label = m.conformance_run_operation();
  conformanceRun.set({ envelope: null, runtimeError: null });

  const attempt = await runOperation({
    label,
    cardPresenceRecovery: false,
    call: () =>
      api.runCTAP23Conformance({
        ...(mode === RunMode.RunModeFull ? { mode } : {}),
        metadata,
      }),
    onRuntimeFailure: (runtimeError) => conformanceRun.set({ envelope: null, runtimeError }),
  });

  if (!attempt.ok) return false;

  const envelope = attempt.envelope;
  conformanceRun.set({ envelope, runtimeError: null });
  completeOperation(label, envelope);

  const result = conformanceSuiteResult(envelope);
  if (!result) return false;

  reportSuiteOutcome(result);

  if (mode === RunMode.RunModeFull && resetAttempted(result)) {
    const rediscoveryError = await rediscoverAfterFactoryReset();

    conformanceRun.set({ envelope, runtimeError: null });
    if (rediscoveryError) {
      setStatusOutcome({
        tone: "warning",
        title: m.conformance_rediscovery_failed(),
        message: failureMessage(rediscoveryError),
      });
    } else {
      reportSuiteOutcome(result);
    }
  }

  return !envelope.error;
}
