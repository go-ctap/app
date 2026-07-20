import { describe, expect, it } from "vitest";

import type { Version } from "../../bindings/github.com/go-ctap/ctap/protocol";
import {
  FactID,
  FactOrigin,
  FactState,
  FactUnit,
  FactValue,
  FactValueKind,
  Info as InspectInfo,
} from "../../bindings/github.com/go-ctap/kit/model/inspect";
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
import { testOverviewAssessment, testOverviewFact } from "./test-support/overview-facts";
import type { OverviewRow } from "./overview-types";

function info(input: Partial<InspectInfo> = {}): InspectInfo {
  return new InspectInfo({
    versions: ["FIDO_2_1" as Version],
    aaguid: "00000000-0000-0000-0000-000000000000",
    assessment: testOverviewAssessment(),
    conformance: new Report(),
    ...input,
  });
}

function booleanFact(id: FactID, source: string, state: FactState, origin: FactOrigin, boolean: boolean) {
  return testOverviewFact(id, source, state, origin, new FactValue({
    kind: FactValueKind.FactValueBoolean,
    boolean,
  }));
}

function integerFact(id: FactID, source: string, integer: number, unit?: FactUnit, origin = FactOrigin.FactOriginReported) {
  return testOverviewFact(id, source, FactState.FactStateObserved, origin, new FactValue({
    kind: FactValueKind.FactValueInteger,
    integer,
    unit,
  }));
}

function listFact(id: FactID, source: string, list: string[], state = FactState.FactStateObserved) {
  return testOverviewFact(id, source, state, FactOrigin.FactOriginReported, new FactValue({
    kind: FactValueKind.FactValueList,
    list,
  }));
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
        assessment: testOverviewAssessment([
          booleanFact(FactID.FactIDLargeBlobs, "options.largeBlobs", FactState.FactStateSupported, FactOrigin.FactOriginReported, true),
          booleanFact(FactID.FactIDSetMinPINLength, "options.setMinPINLength", FactState.FactStateSupported, FactOrigin.FactOriginReported, true),
          booleanFact(FactID.FactIDExtensionLargeBlobKey, "extensions.largeBlobKey", FactState.FactStateSupported, FactOrigin.FactOriginDerived, true),
          integerFact(FactID.FactIDMaxSerializedLargeBlobArray, "maxSerializedLargeBlobArray", 2048, FactUnit.FactUnitBytes),
        ]),
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
        assessment: testOverviewAssessment([
          booleanFact(FactID.FactIDClientPIN, "options.clientPin", FactState.FactStateNotConfigured, FactOrigin.FactOriginReported, false),
        ]),
      }),
    });
    const absentRows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(FactID.FactIDClientPIN, "options.clientPin", FactState.FactStateUnsupported, FactOrigin.FactOriginSpecDefault, false),
        ]),
      }),
    });

    expect(rowBySource(falseRows, "options.clientPin").status).toBe("not configured");
    expect(rowBySource(falseRows, "options.clientPin").value).toBe("PIN not set");
    expect(rowBySource(absentRows, "options.clientPin").status).toBe("unsupported");
    expect(rowBySource(absentRows, "options.clientPin").value).toBe("Default false");
  });

  it("keeps numeric limits informational in the presentation matrix", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          integerFact(FactID.FactIDEffectiveMaxMessageSize, "maxMsgSize", 512, FactUnit.FactUnitBytes),
          integerFact(FactID.FactIDEffectiveMinPINLength, "minPINLength", 3, FactUnit.FactUnitCodePoints),
          integerFact(FactID.FactIDEffectiveMaxPINLength, "maxPINLength", 7, FactUnit.FactUnitCodePoints),
        ]),
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
        assessment: testOverviewAssessment([
          integerFact(FactID.FactIDEffectiveMaxMessageSize, "maxMsgSize", 1024, FactUnit.FactUnitBytes, FactOrigin.FactOriginSpecDefault),
          integerFact(FactID.FactIDEffectiveMaxPINLength, "maxPINLength", 63, FactUnit.FactUnitCodePoints, FactOrigin.FactOriginSpecDefault),
        ]),
      }),
    });

    expect(rowBySource(defaultRows, "maxMsgSize").status).toBe("informational");
    expect(rowBySource(defaultRows, "maxPINLength").status).toBe("informational");
  });

  it("keeps extension and certification localization", () => {
    setAppLocale("en");

    const rows = buildOverviewRows({
      info: info({
        assessment: testOverviewAssessment([
          booleanFact(FactID.FactIDExtensionCredBlob, "extensions.credBlob", FactState.FactStateSupported, FactOrigin.FactOriginDerived, true),
          listFact(FactID.FactIDCertifications, "certifications", ["FIDO=2"]),
        ]),
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
