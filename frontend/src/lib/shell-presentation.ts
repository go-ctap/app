import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";

import { m } from "../paraglide/messages.js";
import { deviceDetail, deviceName, labelDevice, operationStageLabel, sessionStateLabel } from "./format.js";
import { selectorFromDevice, type SessionStatus } from "./session-model.js";
import type { ActiveScreen, StatusBarState } from "./stores.js";

export type AuthenticatorTitlebarItem = {
  value: string;
  label: string;
  name: string;
  detail: string;
};

export type AuthenticatorTitlebarPresentation = {
  items: AuthenticatorTitlebarItem[];
  selectedValue: string;
  selectedLabel: string;
  busy: boolean;
  clearDisabled: boolean;
};

export type SidebarPresentation = {
  activeScreen: ActiveScreen;
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
  retry: ShellStatusAction | null;
};

export type InteractionModalPresentation = {
  open: boolean;
  interactionId: string;
  title: string;
  eyebrow: string;
  destructive: boolean;
  message: string;
  permission: string;
  preview: unknown;
  kind: string;
};

export function buildAuthenticatorTitlebarPresentation(input: {
  devices: DeviceReport[];
  selectedDevice: DeviceReport | null;
  selectedSelector: string;
  busy: boolean;
}): AuthenticatorTitlebarPresentation {
  return {
    items: input.devices.map((device) => {
      const value = selectorFromDevice(device);
      const transport = String(device.transport);
      const detail = [transport, deviceDetail(device) || value].filter(Boolean).join(" - ");
      return {
        value,
        label: labelDevice(device),
        name: deviceName(device),
        detail,
      };
    }),
    selectedValue: input.selectedSelector,
    selectedLabel: input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected(),
    busy: input.busy,
    clearDisabled: !input.selectedSelector || input.busy,
  };
}

export function buildSidebarPresentation(input: { activeScreen: ActiveScreen }): SidebarPresentation {
  return { activeScreen: input.activeScreen };
}

function activeProgress(statusBar: StatusBarState): ShellStatusProgress | null {
  const event = statusBar.activeOperation?.event;
  const completed = event?.completed;
  const total = event?.total;
  if (completed === null || completed === undefined || total === null || total === undefined || total < 0) return null;
  return {
    value: total === 0 ? 0 : Math.min(Math.max(completed, 0), total),
    max: Math.max(total, 1),
    label: m.progress_completed_of_total({ completed, total }),
    ariaLabel: m.operation_progress(),
  };
}

function liveReadySession(session: SessionStatus) {
  return session.state === "ready" && Boolean(session.sessionId && session.selectedDevice);
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
        : active.cancelError?.message || operationStageLabel(active.event?.stage),
      busy: true,
      progress: activeProgress(input.statusBar),
      cancel: active.operationId && !active.cancelRequested ? {
        label: m.cancel(),
        ariaLabel: m.cancel_operation(),
        disabled: Boolean(active.cancelPending),
      } : null,
      retry: null,
    };
  }

  if (["opening", "running", "error"].includes(input.sessionStatus.state)) {
    const error = input.sessionStatus.state === "error";
    return {
      source: "session",
      tone: error ? "error" : "info",
      title: sessionStateLabel(input.sessionStatus.state),
      detail: input.sessionStatus.error?.message
        || (input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected()),
      busy: !error,
      progress: null,
      cancel: null,
      retry: null,
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
      retry: outcome.retry && liveReadySession(input.sessionStatus) ? {
        label: m.retry(),
        ariaLabel: m.retry(),
        disabled: false,
      } : null,
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
    retry: null,
  };
}

export function buildInteractionModalPresentation(prompt: InteractionPrompt): InteractionModalPresentation {
  const request = prompt.request;
  const kind = request.kind;
  const destructive = request.destructive === true;
  return {
    open: true,
    interactionId: prompt.interactionId,
    title: destructive ? m.confirm_destructive_operation() : m.authenticator_needs_you(),
    eyebrow: String(kind),
    destructive,
    message: request.message ?? m.continue_on_authenticator(),
    permission: request.permission ?? "",
    preview: request.preview ?? null,
    kind: String(kind),
  };
}
