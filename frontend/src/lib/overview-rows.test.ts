import { describe, expect, it } from "vitest";

import { ExtensionIdentifier } from "../../bindings/github.com/go-ctap/ctap/extension";
import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import type { Info as InspectInfo } from "../../bindings/github.com/go-ctap/kit/model/inspect";
import { Report } from "../../bindings/github.com/go-ctap/kit/model/conformance";
import {
  Capability,
  DeviceMetadata,
  DeviceReport,
  Interface,
  InterfaceReport,
  Vendor,
} from "../../bindings/github.com/go-ctap/kit/model/report";

import { setAppLocale } from "./i18n";
import { buildOverviewRows } from "./overview-rows";
import { groupOverviewRows } from "./overview-shared";
import type { OverviewRow } from "./overview-types";

function info(input: Partial<InspectInfo> = {}): InspectInfo {
  return {
    versions: ["FIDO_2_1" as Version],
    aaguid: "00000000-0000-0000-0000-000000000000",
    conformance: new Report(),
    ...input,
  };
}

function rowBySource(rows: OverviewRow[], source: string) {
  const item = rows.find((row) => row.source === source);
  expect(item).toBeDefined();
  return item as OverviewRow;
}

describe("buildOverviewRows", () => {
  it("reads generated option fields through typed option keys", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        options: {
          largeBlobs: true,
          setMinPINLength: true,
        },
        extensions: [ExtensionIdentifier.ExtensionIdentifierLargeBlobKey],
        maxSerializedLargeBlobArray: 2048,
      }),
    });

    expect(rowBySource(rows, "options.setMinPINLength").status).toBe("supported");
    expect(rowBySource(rows, "extensions.largeBlobKey").status).toBe("supported");
    expect(rowBySource(rows, "options.largeBlobs").value).toContain("2048");
  });

  it("preserves absent versus false option semantics", () => {
    setAppLocale("en");

    const falseRows = buildOverviewRows({
      info: info({
        options: {
          clientPin: false,
        },
      }),
    });
    const absentRows = buildOverviewRows({
      info: info({
        options: {},
      }),
    });

    expect(rowBySource(falseRows, "options.clientPin").status).toBe("not configured");
    expect(rowBySource(falseRows, "options.clientPin").value).toBe("PIN not set");
    expect(rowBySource(absentRows, "options.clientPin").status).toBe("unsupported");
    expect(rowBySource(absentRows, "options.clientPin").value).toBe("Absent");
  });

  it("keeps numeric limits informational in the presentation matrix", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        options: {
          clientPin: true,
        },
        maxMsgSize: 512,
        minPINLength: 3,
        maxPINLength: 7,
      }),
    });

    expect(rowBySource(rows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(rows, "maxMsgSize").value).toContain("512");
    expect(rowBySource(rows, "minPINLength").status).toBe("informational");
    expect(rowBySource(rows, "minPINLength").value).toContain("3");
    expect(rowBySource(rows, "maxPINLength").status).toBe("informational");
    expect(rowBySource(rows, "maxPINLength").value).toContain("7");

    const defaultRows = buildOverviewRows({
      info: info({
        options: {
          clientPin: true,
        },
      }),
    });

    expect(rowBySource(defaultRows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(defaultRows, "maxPINLength").status).toBe("informational");
  });

  it("keeps extension and certification localization", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        extensions: [ExtensionIdentifier.ExtensionIdentifierCredentialBlob],
        certifications: {
          FIDO: 2,
        },
      }),
    });

    expect(rowBySource(rows, "extensions.credBlob").status).toBe("supported");
    expect(rowBySource(rows, "certifications").value).toContain("FIDO L1+");
  });

  it("presents normalized vendor identity and interface applications", () => {
    setAppLocale("en");
    const device = new DeviceReport({
      fingerprint: "token-1",
      product: "Yubico Security Key",
      vendor: Vendor.VendorYubico,
      metadata: new DeviceMetadata({
        model: "YubiKey 5C NFC",
        serial: "12345678",
        firmware: "5.7.1",
        interfaces: [new InterfaceReport({
          interface: Interface.InterfaceUSB,
          supported: [Capability.CapabilityU2F, Capability.CapabilityCTAP2],
          enabled: [Capability.CapabilityCTAP2],
        })],
      }),
    });

    const rows = buildOverviewRows({ info: info(), device });

    expect(rowBySource(rows, "device.vendor").value).toBe("yubico");
    expect(rowBySource(rows, "device.metadata.model").value).toBe("YubiKey 5C NFC");
    expect(rowBySource(rows, "device.metadata.serial").value).toBe("12345678");
    expect(rowBySource(rows, "device.metadata.firmware").value).toBe("5.7.1");
    expect(rowBySource(rows, "device.metadata.interfaces.usb.supported").value).toBe("U2F, CTAP2");
    expect(rowBySource(rows, "device.metadata.interfaces.usb.enabled").value).toBe("CTAP2");
    expect(groupOverviewRows(rows)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Vendor interfaces",
        rows: expect.arrayContaining([
          expect.objectContaining({ source: "device.metadata.interfaces.usb.supported" }),
        ]),
      }),
    ]));
  });

  it("does not present unknown Token2 enabled state as an empty enabled list", () => {
    setAppLocale("en");
    const device = new DeviceReport({
      fingerprint: "token-2",
      vendor: Vendor.VendorToken2,
      metadata: new DeviceMetadata({
        model: "Token2 T2F2",
        serial: "T2-123456",
        firmware: "R3.2",
        interfaces: [new InterfaceReport({
          interface: Interface.InterfaceUSB,
          supported: [
            Capability.CapabilityOTP,
            Capability.CapabilityCCID,
            Capability.CapabilityCTAP2,
          ],
        }), new InterfaceReport({
          interface: Interface.InterfaceNFC,
        })],
      }),
    });

    const rows = buildOverviewRows({ info: info(), device });

    expect(rowBySource(rows, "device.metadata.interfaces.usb.supported").value).toBe("OTP, CCID, CTAP2");
    expect(rowBySource(rows, "device.metadata.firmware").value).toBe("R3.2");
    expect(rows.find((row) => row.source === "device.metadata.interfaces.usb.enabled")).toBeUndefined();
    expect(rowBySource(rows, "device.metadata.interfaces.nfc.interface").value).toBe("Available");
    expect(rows.find((row) => row.source === "device.metadata.interfaces.nfc.supported")).toBeUndefined();
    expect(rows.find((row) => row.source === "device.metadata.interfaces.nfc.enabled")).toBeUndefined();
  });
});
