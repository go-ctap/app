import { beforeEach, describe, expect, it } from "vitest";

import { OperationStage } from "../../bindings/github.com/go-ctap/kit/model";
import { Code } from "../../bindings/github.com/go-ctap/kit/model/failure";
import { Vendor, type DeviceReport } from "../../bindings/github.com/go-ctap/kit/model/report";
import { Mode } from "../../bindings/github.com/go-ctap/kit/transport";

import { setAppLocale } from "./i18n.js";
import { failureForCode } from "./test-failure.js";
import { buildShellStatusPresentation, buildSidebarPresentation } from "./shell-presentation.js";
import type { SessionStatus } from "./session-model.js";
import type { StatusBarState } from "./stores.js";

const token: DeviceReport = {
  deviceId: "token-1",
  ordinalAlias: "1",
  stableId: true,
  transport: Mode.ModeHID,
  path: "token-1",
  vendorId: 1,
  productId: 2,
  vendor: Vendor.VendorUnknown,
  product: "Test key",
};

function session(state: SessionStatus["state"]): SessionStatus {
  return {
    state,
    sessionId: "session-1",
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
      sessionStatus: session("error"),
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
      detail: "Enumerating credentials",
      busy: true,
      progress: { value: 2, max: 5, label: "2 of 5" },
      cancel: { disabled: false, ariaLabel: "Cancel operation" },
    });
  });

  it("keeps known zero progress determinate and shows its count", () => {
    const presentation = buildShellStatusPresentation({
      selectedDevice: token,
      sessionStatus: session("running"),
      statusBar: statusBar({
        activeOperation: { stage: OperationStage.OperationStageEnumeratingRPs, completed: 0, total: 0 },
      }),
    });

    expect(presentation.progress).toMatchObject({ value: 0, max: 1, label: "0 of 0" });
  });

  it("uses indeterminate operation state until both progress values are known", () => {
    const presentation = buildShellStatusPresentation({
      selectedDevice: token,
      sessionStatus: session("running"),
      statusBar: statusBar({
        activeOperation: { stage: OperationStage.OperationStageEnumeratingRPs },
      }),
    });

    expect(presentation.source).toBe("operation");
    expect(presentation.detail).toBe("Enumerating relying parties");
    expect(presentation.progress).toBeNull();
    expect(presentation.cancel).toBeNull();
  });

  it("prioritizes opening and error sessions over the last outcome", () => {
    const outcome = statusBar({ lastOutcome: { tone: "success", title: "Old success" } });
    const opening = buildShellStatusPresentation({ selectedDevice: token, sessionStatus: session("opening"), statusBar: outcome });
    const errored = buildShellStatusPresentation({
      selectedDevice: token,
      sessionStatus: { ...session("error"), error: failureForCode(Code.CodeSessionInvalid) },
      statusBar: outcome,
    });

    expect(opening).toMatchObject({ source: "session", title: "Opening", busy: true });
    expect(errored).toMatchObject({
      source: "session",
      title: "Error",
      detail: "The authenticator session is invalid.",
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
        label: "1. Test key",
        name: "Test key",
        detail: "S/N token-1",
      },
    ]);
  });

  it("labels the WebAuthn Lab screen", () => {
    const presentation = buildSidebarPresentation({
      activeScreen: "lab",
      devices: [],
      selectedSelector: "",
      busy: false,
    });

    expect(presentation.activeScreenLabel).toBe("WebAuthn Lab");
  });

  it("prefers enriched model and serial in discovered token rows", () => {
    const enriched: DeviceReport = {
      ...token,
      vendor: Vendor.VendorYubico,
      metadata: {
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
      },
    };

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [enriched],
      selectedSelector: "token-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "token-1",
      label: "1. YubiKey 5C NFC · 12345678",
      name: "YubiKey 5C NFC",
      detail: "S/N 12345678",
    });
  });

  it("omits the Token2 revision from the device name", () => {
    const token2: DeviceReport = {
      ...token,
      vendor: Vendor.VendorToken2,
      metadata: {
        model: "Token2 Bio3 Dual A+C PIN+ R3.2",
        serial: "72103654095303",
        firmware: "R3.2",
      },
    };

    const presentation = buildSidebarPresentation({
      activeScreen: "overview",
      devices: [token2],
      selectedSelector: "token-1",
      busy: false,
    });

    expect(presentation.tokens[0]).toEqual({
      value: "token-1",
      label: "1. Token2 Bio3 Dual A+C PIN+ · 72103654095303",
      name: "Token2 Bio3 Dual A+C PIN+",
      detail: "S/N 72103654095303",
    });
  });
});
