import type { InteractionKind } from "../../bindings/github.com/go-ctap/kit/model";
import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { bioSampleStatusLabel, deviceDetail, deviceName, labelDevice, operationStageLabel, permissionLabel, sessionStateLabel } from "./format.js";
import { failureMessage } from "./failure.js";
import { selectorFromDevice, type SessionStatus } from "./session-model.js";
import type { ActiveScreen, StatusBarState } from "./stores.js";

export type SidebarTokenItem = {
  value: string;
  label: string;
  name: string;
  detail: string;
};

export type SidebarPresentation = {
  activeScreen: ActiveScreen;
  activeScreenLabel: string;
  tokens: SidebarTokenItem[];
  selectedValue: string;
  busy: boolean;
};

export type ShellStatusTone = "neutral" | "info" | "success" | "warning" | "error";

export type ShellStatusProgress = {
  value: number;
  max: number;
  label: string;
  ariaLabel: string;
};

export type ShellStatusAction = {
  label: string;
  ariaLabel: string;
  disabled: boolean;
};

export type ShellStatusPresentation = {
  source: "operation" | "session" | "outcome" | "idle";
  tone: ShellStatusTone;
  title: string;
  detail: string;
  busy: boolean;
  progress: ShellStatusProgress | null;
  cancel: ShellStatusAction | null;
};

export type InteractionModalPresentation = {
  interactionId: string;
  title: string;
  destructive: boolean;
  message: string;
  permission: string;
  preview: unknown;
  kind: InteractionKind;
};

const deviceIdentityCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

function compareDeviceIdentity(left: DeviceReport, right: DeviceReport) {
  // Prefer descriptor identity; enrichment and ordinal aliases can change between events.
  const orderFields: Array<[string | number, string | number]> = [
    [left.manufacturer ?? "", right.manufacturer ?? ""],
    [left.product ?? "", right.product ?? ""],
    [left.serial ?? "", right.serial ?? ""],
    [left.vendorId, right.vendorId],
    [left.productId, right.productId],
    [left.transport, right.transport],
    [left.fingerprint, right.fingerprint],
    [left.path, right.path],
  ];

  for (const [leftValue, rightValue] of orderFields) {
    const order = deviceIdentityCollator.compare(String(leftValue), String(rightValue));
    if (order !== 0) return order;
  }
  return 0;
}

export function buildSidebarPresentation(input: {
  activeScreen: ActiveScreen;
  devices: DeviceReport[];
  selectedSelector: string;
  busy: boolean;
}): SidebarPresentation {
  return {
    activeScreen: input.activeScreen,
    activeScreenLabel: screenLabel(input.activeScreen),
    tokens: input.devices.toSorted(compareDeviceIdentity).map((device) => {
      const value = selectorFromDevice(device);
      const detail = `S/N ${deviceDetail(device) || value}`;
      return {
        value,
        label: labelDevice(device),
        name: deviceName(device),
        detail,
      };
    }),
    selectedValue: input.selectedSelector,
    busy: input.busy,
  };
}

function screenLabel(screen: ActiveScreen) {
  const labels: Record<ActiveScreen, string> = {
    overview: m.overview(),
    passkeys: m.passkeys(),
    lab: m.webauthn_lab(),
    "large-blobs": m.nav_large_blobs(),
    security: m.security(),
    logs: m.logs(),
    settings: m.settings(),
  };
  return labels[screen];
}

function activeProgress(statusBar: StatusBarState): ShellStatusProgress | null {
  const completed = statusBar.activeOperation?.completed;
  const total = statusBar.activeOperation?.total;
  if (completed === null || completed === undefined || total === null || total === undefined || total < 0) return null;
  return {
    value: total === 0 ? 0 : Math.min(Math.max(completed, 0), total),
    max: Math.max(total, 1),
    label: m.progress_completed_of_total({ completed, total }),
    ariaLabel: m.operation_progress(),
  };
}

export function buildShellStatusPresentation(input: {
  sessionStatus: SessionStatus;
  selectedDevice: DeviceReport | null;
  statusBar: StatusBarState;
}): ShellStatusPresentation {
  const active = input.statusBar.activeOperation;
  const outcome = input.statusBar.lastOutcome;
  if (active) {
    const cancellationPending = active.cancelPending || active.cancelRequested;
    return {
      source: "operation",
      tone: active.cancelError ? "error" : "info",
      title: active.cancelRequested ? m.cancel_requested() : active.label || m.operation_running(),
      detail: cancellationPending
        ? m.cancel_requested_message()
        : failureMessage(active.cancelError)
          || [operationStageLabel(active.stage), bioSampleStatusLabel(active.sampleStatus)].filter(Boolean).join(" · "),
      busy: true,
      progress: activeProgress(input.statusBar),
      cancel: active.operationId && !active.cancelRequested ? {
        label: m.cancel(),
        ariaLabel: m.cancel_operation(),
        disabled: Boolean(active.cancelPending),
      } : null,
    };
  }

  if (["opening", "running", "error"].includes(input.sessionStatus.state)) {
    const error = input.sessionStatus.state === "error";
    return {
      source: "session",
      tone: error ? "error" : "info",
      title: sessionStateLabel(input.sessionStatus.state),
      detail: failureMessage(input.sessionStatus.error)
        || (input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected()),
      busy: !error,
      progress: null,
      cancel: null,
    };
  }

  if (outcome) {
    return {
      source: "outcome",
      tone: outcome.tone,
      title: outcome.title,
      detail: outcome.message || (input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected()),
      busy: false,
      progress: null,
      cancel: null,
    };
  }

  return {
    source: "idle",
    tone: "neutral",
    title: sessionStateLabel(input.sessionStatus.state),
    detail: input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected(),
    busy: false,
    progress: null,
    cancel: null,
  };
}

export function buildInteractionModalPresentation(prompt: InteractionPrompt): InteractionModalPresentation {
  const request = prompt.request;
  const destructive = request.destructive === true;
  return {
    interactionId: prompt.interactionId,
    title: destructive ? m.confirm_destructive_operation() : m.authenticator_needs_you(),
    destructive,
    message: request.message ?? m.continue_on_authenticator(),
    permission: permissionLabel(request.permission),
    preview: request.preview ?? null,
    kind: request.kind,
  };
}
