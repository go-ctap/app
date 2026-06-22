import type { DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import type { InteractionPrompt } from "../../bindings/github.com/go-ctap/kit/service";
import type { SessionStatus } from "./api.js";
import type { ActiveScreen, StatusBarState } from "./stores.js";
import { selectorFromDevice } from "./api.js";
import { deviceDetail, deviceName, labelDevice, sessionStateLabel } from "./format.js";
import { m } from "../paraglide/messages.js";

export type AuthenticatorTitlebarItem = {
  value: string;
  label: string;
  name: string;
  detail: string;
};

export type AuthenticatorTitlebarModel = {
  items: AuthenticatorTitlebarItem[];
  selectedValue: string;
  selectedLabel: string;
  busy: boolean;
  clearDisabled: boolean;
};

export type SidebarStatusModel = {
  stateLabel: string;
  title: string;
  detail: string;
};

export type SidebarModel = {
  activeScreen: ActiveScreen;
  status: SidebarStatusModel;
};

export type InteractionModalModel = {
  open: boolean;
  title: string;
  eyebrow: string;
  destructive: boolean;
  message: string;
  permission: string;
  preview: unknown;
  kind: string;
};

export function buildAuthenticatorTitlebarModel(input: {
  devices: DeviceReport[];
  selectedDevice: DeviceReport | null;
  selectedSelector: string;
  busy: boolean;
}): AuthenticatorTitlebarModel {
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

export function buildSidebarModel(input: {
  activeScreen: ActiveScreen;
  sessionStatus: SessionStatus;
  selectedDevice: DeviceReport | null;
  statusBar: StatusBarState;
}): SidebarModel {
  const active = input.statusBar.activeOperation;
  const outcome = input.statusBar.lastOutcome;
  return {
    activeScreen: input.activeScreen,
    status: {
      stateLabel: sessionStateLabel(input.sessionStatus.state),
      title: active?.label || outcome?.title || sessionStateLabel(input.sessionStatus.state),
      detail: active?.event?.message || outcome?.message || (input.selectedDevice ? deviceName(input.selectedDevice) : m.no_token_selected()),
    },
  };
}

export function buildInteractionModalModel(prompt: InteractionPrompt): InteractionModalModel {
  const request = prompt.request;
  const kind = request.kind;
  const destructive = request.destructive === true;
  return {
    open: true,
    title: destructive ? m.confirm_destructive_operation() : m.authenticator_needs_you(),
    eyebrow: String(kind),
    destructive,
    message: request.message ?? m.continue_on_authenticator(),
    permission: request.permission ?? "",
    preview: request.preview ?? null,
    kind: String(kind),
  };
}
