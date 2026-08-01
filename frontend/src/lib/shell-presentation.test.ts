import { beforeEach, describe, expect, it } from "vitest";
import { CreditCard, Nfc, Usb } from "@lucide/svelte";

import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import {
  DeviceIdentityReport,
  DeviceReport,
  DeviceVendor,
} from "../../bindings/github.com/go-ctap/kit/model/report";
import { Mode, SmartCardInterface } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "$lib/i18n.js";
import { failureForCode } from "$lib/test-support/failure.js";
import { buildShellStatusPresentation, buildSidebarPresentation } from "$lib/shell-presentation.js";
import type { AuthenticatorStatus } from "$lib/authenticator-model.js";
import type { StatusBarState } from "$lib/features/workbench";

const token = new DeviceReport({
  attachment: {
    id: "token-1",
    transport: Mode.ModeHID,
    usb: { product: "Test key", vendorId: 1, productId: 2 },
  },
});

function authenticator(state: AuthenticatorStatus["state"]): AuthenticatorStatus {
  return {
    state,
    selectionId: "authenticator-1",
  };
}

function statusBar(patch: Partial<StatusBarState> = {}): StatusBarState {
  return { activeOperation: null, lastOutcome: null, ...patch };
}

describe("shell status presentation", () => {
  beforeEach(() => setAppLocale("en"));

  it("prioritizes active operation progress and exposes cancel after an operation id arrives", () => {
    const presentation = buildShellStatusPresentation({
      selectedDevice: token,
      authenticatorStatus: authenticator("error"),
      statusBar: statusBar({
        activeOperation: {
          operationId: "operation-1",
          label: "Credential inventory",
          stage: OperationStage.OperationStageEnumeratingCredentials,
          completed: 2,
          total: 5,
        },
        lastOutcome: { tone: "error", title: "Older failure" },
      }),
    });

    expect(presentation).toMatchObject({
      source: "operation",
      title: "Credential inventory",
      detail: "Enumerating passkeys",
      busy: true,
      progress: { value: 2, max: 5, label: "2 of 5" },
      cancel: { disabled: false, ariaLabel: "Cancel operation" },
    });
  });

  it("keeps known zero progress determinate and shows its count", () => {
    const presentation = buildShellStatusPresentation({
      selectedDevice: token,
      authenticatorStatus: authenticator("ready"),
      statusBar: statusBar({
        activeOperation: {
          stage: OperationStage.OperationStageEnumeratingRPs,
          completed: 0,
          total: 0,
        },
      }),
    });

    expect(presentation.progress).toMatchObject({ value: 0, max: 1, label: "0 of 0" });
  });

  it("uses indeterminate operation state until both progress values are known", () => {
    const presentation = buildShellStatusPresentation({
      selectedDevice: token,
      authenticatorStatus: authenticator("ready"),
      statusBar: statusBar({
        activeOperation: { stage: OperationStage.OperationStageEnumeratingRPs },
      }),
    });

    expect(presentation.source).toBe("operation");
    expect(presentation.detail).toBe("Enumerating relying parties");
    expect(presentation.progress).toBeNull();
    expect(presentation.cancel).toBeNull();
  });

  it("prioritizes opening and authenticator errors over the last outcome", () => {
    const outcome = statusBar({ lastOutcome: { tone: "success", title: "Old success" } });
    const opening = buildShellStatusPresentation({
      selectedDevice: token,
      authenticatorStatus: authenticator("opening"),
      statusBar: outcome,
    });
    const errored = buildShellStatusPresentation({
      selectedDevice: token,
      authenticatorStatus: {
        ...authenticator("error"),
        error: failureForCode(Code.CodeAuthenticatorClosed),
      },
      statusBar: outcome,
    });

    expect(opening).toMatchObject({ source: "authenticator", title: "Opening", busy: true });
    expect(errored).toMatchObject({
      source: "authenticator",
      title: "Error",
      detail: "The authenticator is closed.",
      busy: false,
      tone: "error",
    });
  });
});

describe("sidebar presentation", () => {
  beforeEach(() => setAppLocale("en"));

  it("builds the active screen title and discovered token rows", () => {
    const presentation = buildSidebarPresentation({
      activeScreen: "security",
      devices: [token],
      selectedSelector: "token-1",
      busy: false,
    });

    expect(presentation.activeScreenLabel).toBe("Security");
    expect(presentation.tokens).toEqual([
      {
        value: "token-1",
        label: "Test key",
        name: "Test key",
        detail: "",
        icon: Usb,
      },
    ]);
  });

  it("prefers the Yubico identity resolved after opening", () => {
    const enriched = new DeviceReport({
      ...token,
      attachment: {
        ...token.attachment,
        usb: {
          product: "Yubico Security Key",
          vendorId: 0x1050,
          productId: 0x0407,
        },
      },
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorYubico,
        name: "YubiKey 5C NFC",
        serialNumber: "12345678",
      }),
    });

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [enriched],
      selectedSelector: "token-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "token-1",
      label: "YubiKey 5C NFC · 12345678",
      name: "YubiKey 5C NFC",
      detail: "S/N 12345678",
      icon: Usb,
    });
  });

  it("prefers the canonical Token2 identity over attachment labels", () => {
    const token2 = new DeviceReport({
      ...token,
      attachment: {
        ...token.attachment,
        usb: {
          product: "TOKEN2 FIDO2 Security Key",
          vendorId: 0x349e,
          productId: 1,
        },
      },
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorToken2,
        name: "Token2 Bio3 Dual A+C PIN+",
        serialNumber: "72103654095303",
      }),
    });

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [token2],
      selectedSelector: "token-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "token-1",
      label: "Token2 Bio3 Dual A+C PIN+ · 72103654095303",
      name: "Token2 Bio3 Dual A+C PIN+",
      detail: "S/N 72103654095303",
      icon: Usb,
    });
  });

  it("keeps a smart-card reader separate from the card identity", () => {
    const smartCard = new DeviceReport({
      ...token,
      attachment: {
        id: "smart-card-1",
        transport: Mode.ModeSmartCard,
        smartCard: {
          reader: "ACS ACR1252 Dual Reader",
          interface: SmartCardInterface.SmartCardInterfaceContact,
        },
      },
    });

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [smartCard],
      selectedSelector: "smart-card-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "smart-card-1",
      label: "FIDO smart card",
      name: "FIDO smart card",
      detail: "ACS ACR1252 Dual Reader · PC/SC",
      icon: CreditCard,
    });
  });

  it("shows a resolved contactless smart-card identity above its reader", () => {
    const smartCard = new DeviceReport({
      ...token,
      attachment: {
        id: "smart-card-1",
        transport: Mode.ModeSmartCard,
        smartCard: {
          reader: "Token2 Smart Reader",
          interface: SmartCardInterface.SmartCardInterfaceContactless,
        },
      },
      identity: new DeviceIdentityReport({
        vendor: DeviceVendor.DeviceVendorToken2,
        name: "Token2 FIDO Card",
        serialNumber: "86202012345678",
      }),
    });

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [smartCard],
      selectedSelector: "smart-card-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "smart-card-1",
      label: "Token2 FIDO Card · 86202012345678",
      name: "Token2 FIDO Card",
      detail: "S/N 86202012345678",
      icon: Nfc,
    });
  });
});
